"""
Loads the trained models + results once at startup and does the predictions.

Kept separate from main.py so the API routes stay short and this logic can
be tested on its own.
"""
import json
import os
from pathlib import Path

import joblib
import pandas as pd
import yaml

# Repo root = two folders above this file (backend/app/ -> churn-uplift/)
REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = Path(os.getenv("MODEL_DIR", REPO_ROOT / "ml" / "models"))
RESULTS_DIR = Path(os.getenv("RESULTS_DIR", REPO_ROOT / "ml" / "results"))
# myDel = FICTIONAL demo company: 7,043 real anonymous Telco records + generated fake names
CUSTOMER_DATA = Path(os.getenv("CUSTOMER_DATA", REPO_ROOT / "backend" / "data" / "mydel_customers.csv"))
HIGH_RISK = 0.6  # churn probability at or above this = "High" risk
PARAMS_PATH = Path(os.getenv("PARAMS_PATH", REPO_ROOT / "params.yaml"))

# Must match ml/preprocess.py FEATURE_COLS (same order as training)
FEATURE_COLS = [
    "tenure", "MonthlyCharges", "TotalCharges", "SeniorCitizen",
    "gender", "Partner", "Dependents", "PhoneService", "MultipleLines",
    "InternetService", "OnlineSecurity", "OnlineBackup", "DeviceProtection",
    "TechSupport", "StreamingTV", "StreamingMovies", "Contract",
    "PaperlessBilling", "PaymentMethod",
]


def _read_json(name: str) -> dict:
    with open(RESULTS_DIR / name) as f:
        return json.load(f)


class ModelService:
    def __init__(self) -> None:
        self.churn_model = joblib.load(MODEL_DIR / "best_churn_model.joblib")
        uplift = joblib.load(MODEL_DIR / "uplift_model.joblib")
        self.uplift_treated, self.uplift_control = uplift["treated"], uplift["control"]
        self.uplift_name = uplift.get("name", "T-learner")

        with open(PARAMS_PATH) as f:
            params = yaml.safe_load(f)
        self.offer_cost = params["business"]["offer_cost"]
        self.clv_months = params["business"]["clv_months"]
        self.low_risk = params["decision"]["low_risk_threshold"]
        self.backfire_margin = params["decision"].get("backfire_margin", 0.0)

        self.classical = _read_json("classical_metrics.json")
        self.uplift_metrics = _read_json("uplift_metrics.json")
        self.roi = _read_json("roi_results.json")
        self.mydel_roi = _read_json("mydel_roi.json")
        self.shap = _read_json("shap_importance.json")

        # myDel's customers, already scored (out-of-fold) by ml/score_customers.py
        self.customers = pd.read_csv(CUSTOMER_DATA, keep_default_na=False)
        self.customers["chance_of_staying"] = 1 - self.customers["churn_prob"]
        self.customers["risk_level"] = self.customers["churn_prob"].map(self.risk_level)
        self._add_decisions(self.customers)

    def risk_level(self, p: float) -> str:
        return "High" if p >= HIGH_RISK else ("Medium" if p >= self.low_risk else "Low")

    # ---------- core scoring ----------
    def score(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add churn_prob + uplift_score columns for a DataFrame of customers."""
        X = df[FEATURE_COLS]
        out = df.copy()
        out["churn_prob"] = self.churn_model.predict_proba(X)[:, 1]
        out["uplift_score"] = (self.uplift_treated.predict_proba(X)[:, 1]
                               - self.uplift_control.predict_proba(X)[:, 1])
        self._add_decisions(out)
        return out

    def _add_decisions(self, df: pd.DataFrame) -> None:
        df["customer_value"] = df["MonthlyCharges"] * self.clv_months
        df["expected_offer_profit"] = df["uplift_score"] * df["customer_value"] - self.offer_cost
        decided = [self.decide(p, u, e) for p, u, e in
                   zip(df["churn_prob"], df["uplift_score"], df["expected_offer_profit"])]
        df["recommended_action"] = [d[0] for d in decided]
        df["reason"] = [d[1] for d in decided]

    def decide(self, churn_prob: float, uplift: float, exp_profit: float) -> tuple[str, str]:
        """
        Simple, explainable decision rules (checked in order):
          1. clearly negative uplift (below -backfire_margin) -> don't contact
             (tiny negative values are noise between two models, not a real backfire)
          2. low churn risk    -> no action (they will probably stay anyway)
          3. offer pays off    -> send offer
          4. otherwise         -> high risk but offer won't pay off -> other action
        """
        if uplift < -self.backfire_margin:
            return ("Do not contact",
                    "Offer is predicted to backfire for this customer (a 'sleeping dog').")
        if churn_prob < self.low_risk:
            return ("No action needed",
                    f"Low churn risk ({churn_prob:.0%}); they are likely to stay without an offer.")
        if exp_profit > 0:
            return ("Send retention offer",
                    f"Expected gain ${exp_profit + self.offer_cost:,.0f} is more than the ${self.offer_cost} offer cost.")
        return ("Try non-discount retention",
                "High risk, but a discount is unlikely to pay off. Consider a service call or fixing the root problem.")

    def predict_one(self, features: dict) -> dict:
        row = dict(features)
        if row.get("TotalCharges") is None:  # friendly default for the web form
            row["TotalCharges"] = row["MonthlyCharges"] * row["tenure"]
        r = self.score(pd.DataFrame([row])).iloc[0]
        p = float(r["churn_prob"])
        return {
            "churn_probability": round(p, 4),
            "uplift_score": round(float(r["uplift_score"]), 4),
            "customer_value": round(float(r["customer_value"]), 2),
            "expected_offer_profit": round(float(r["expected_offer_profit"]), 2),
            "risk_level": self.risk_level(p),
            "recommended_action": r["recommended_action"],
            "reason": r["reason"],
        }

    # ---------- data for the dashboard ----------
    def summary(self) -> dict:
        c = self.customers

        def retention_by(col, labels=None):
            """Share of customers who STAYED last month, per group (real data)."""
            groups = labels if labels is not None else c[col]
            g = c.groupby(groups, observed=True)["Churn"].agg(["mean", "size"])
            return [{"group": str(k), "retention": round(1 - float(r["mean"]), 4), "customers": int(r["size"])}
                    for k, r in g.iterrows()]

        tenure_groups = pd.cut(c["tenure"], [-1, 6, 12, 24, 48, 100],
                               labels=["0-6 months", "7-12 months", "1-2 years", "2-4 years", "4+ years"])
        high = c[c["risk_level"] == "High"]
        top_risk = c.sort_values("churn_prob", ascending=False).head(10)
        return {
            "company": "myDel",
            "n_customers": int(len(c)),
            "retention_rate": round(1 - float(c["Churn"].mean()), 4),  # real: stayed last month
            "churn_rate": round(float(c["Churn"].mean()), 4),
            "avg_chance_of_staying": round(float(c["chance_of_staying"].mean()), 4),  # predicted
            "monthly_revenue": round(float(c["MonthlyCharges"].sum()), 0),
            "monthly_revenue_at_risk": round(float(high["MonthlyCharges"].sum()), 0),
            "risk_counts": {k: int((c["risk_level"] == k).sum()) for k in ["High", "Medium", "Low"]},
            "retention_by_contract": retention_by("Contract"),
            "retention_by_tenure": retention_by(None, tenure_groups),
            "retention_by_internet": retention_by("InternetService"),
            "retention_by_payment": retention_by("PaymentMethod"),
            "action_counts": c["recommended_action"].value_counts().to_dict(),
            "top_at_risk": top_risk[["customerID", "name", "Contract", "tenure", "MonthlyCharges",
                                     "chance_of_staying"]].round(4).to_dict(orient="records"),
            "best_model": self.classical["best_model"],
            "best_model_auc": self.classical["models"][self.classical["best_model"]]["roc_auc"],
            "top_drivers": self.shap["top_features"][:10],
        }

    # ---------- customer list + single customer ----------
    LIST_COLS = ["customerID", "name", "region", "customer_since", "Contract", "tenure", "InternetService",
                 "MonthlyCharges", "chance_of_staying", "churn_prob", "uplift_score", "risk_level",
                 "expected_offer_profit", "recommended_action"]

    def list_customers(self, q="", risk=None, contract=None, action=None,
                       sort_by="churn_prob", descending=True, limit=25, offset=0) -> dict:
        c = self.customers
        if q:  # search by name or customer ID
            ql = q.lower()
            c = c[c["name"].str.lower().str.contains(ql, regex=False)
                  | c["customerID"].str.lower().str.contains(ql, regex=False)]
        if risk:
            c = c[c["risk_level"] == risk]
        if contract:
            c = c[c["Contract"] == contract]
        if action:
            c = c[c["recommended_action"] == action]
        c = c.sort_values(sort_by, ascending=not descending)
        return {
            "total": int(len(c)),
            "offer_cost": self.offer_cost,
            "items": c.iloc[offset: offset + limit][self.LIST_COLS].round(4).to_dict(orient="records"),
        }

    def get_customer(self, customer_id: str):
        match = self.customers[self.customers["customerID"] == customer_id]
        if match.empty:
            return None
        r = match.iloc[0]
        split = lambda s: [x for x in str(s).split(" | ") if x]
        return {
            **{k: (r[k].item() if hasattr(r[k], "item") else r[k]) for k in
               ["customerID", "name", "region", "customer_since", *FEATURE_COLS]},
            "chance_of_staying": round(float(r["chance_of_staying"]), 4),
            "churn_prob": round(float(r["churn_prob"]), 4),
            "risk_level": r["risk_level"],
            "uplift_score": round(float(r["uplift_score"]), 4),
            "customer_value": round(float(r["customer_value"]), 2),
            "expected_offer_profit": round(float(r["expected_offer_profit"]), 2),
            "recommended_action": r["recommended_action"],
            "reason": r["reason"],
            "reasons_leave": split(r["reasons_leave"]),
            "reasons_stay": split(r["reasons_stay"]),
        }
