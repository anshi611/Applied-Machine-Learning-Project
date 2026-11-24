"""
Build the customer file for "myDel", a FICTIONAL phone company used in the demo app.

myDel's customers = all 7,043 real (anonymous) records from the IBM Telco dataset,
with generated FAKE names / regions so the demo feels like a real customer system.

For every customer we add:
  churn_prob     chance of leaving    (Random Forest, calibrated)
  uplift_score   how much a discount raises their chance of staying (T-learner, SIMULATED offer data)
  reasons_leave / reasons_stay   top 3 reasons in plain English (from SHAP)

Honest scoring: OUT-OF-FOLD predictions. The customers are split into 5 groups, and
each group is scored by models trained on the OTHER 4 groups. So no customer is
scored by a model that saw them during training.

Also writes ml/results/mydel_roi.json: campaign profit for myDel's whole customer base.

Run from the project root (after train_classical.py and train_uplift.py):
    python ml/score_customers.py
"""
import json
from datetime import date

import numpy as np
import pandas as pd
import shap
import joblib
import yaml
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline

from preprocess import FEATURE_COLS, ID_COL, PROJECT_ROOT, RANDOM_STATE, build_preprocessor, load_clean
from simulate_treatment import simulate_treatment
from train_uplift import TLearner

OUT_PATH = PROJECT_ROOT / "backend" / "data" / "mydel_customers.csv"
ROI_PATH = PROJECT_ROOT / "ml" / "results" / "mydel_roi.json"
TODAY = date(2026, 11, 1)  # fixed "today" so the file is reproducible

# ---------- fake names (fictional demo data) ----------
FIRST_F = ["Aisha", "Emma", "Priya", "Sofia", "Mia", "Olivia", "Zara", "Lena", "Hana", "Chloe", "Nora", "Isla",
           "Maya", "Ava", "Leila", "Grace", "Anika", "Ruby", "Elena", "Sara", "Ivy", "Meera", "Lucy", "Amara",
           "Clara", "Nina", "Yara", "Ella", "Tara", "Rosa"]
FIRST_M = ["Arjun", "Liam", "Omar", "Noah", "Ethan", "Ravi", "Lucas", "Mateo", "Kai", "Leo", "Sami", "Daniel",
           "Aditya", "James", "Felix", "Hugo", "Ibrahim", "Oscar", "Rohan", "Theo", "Adam", "Marco", "Kabir",
           "Jonas", "Elias", "Dev", "Max", "Ali", "Nikhil", "Ben"]
LAST = ["Sharma", "Smith", "Khan", "Garcia", "Chen", "Patel", "Müller", "Rossi", "Kim", "Silva", "Novak", "Haddad",
        "Brown", "Singh", "Lopez", "Ivanova", "Okafor", "Tanaka", "Wilson", "Dubois", "Mehta", "Costa", "Larsen",
        "Ahmed", "Fischer", "Reddy", "Nguyen", "Martin", "Kowalski", "Rahman", "Taylor", "Bose", "Moreau",
        "Santos", "Jensen", "Iyer", "Clarke", "Yilmaz", "Kapoor", "Evans"]
REGIONS = ["North", "South", "East", "West", "Central"]

# ---------- plain-English description of a customer's value for each column ----------
YES_NO = {
    "Partner": ("Has a partner", "No partner"),
    "Dependents": ("Has children / dependents", "No dependents"),
    "PhoneService": ("Has a phone line", "No phone line"),
    "MultipleLines": ("Multiple phone lines", "Single phone line"),
    "OnlineSecurity": ("Has online security", "No online security"),
    "OnlineBackup": ("Has online backup", "No online backup"),
    "DeviceProtection": ("Has device protection", "No device protection"),
    "TechSupport": ("Has tech support", "No tech support"),
    "StreamingTV": ("Streams TV", "No TV streaming"),
    "StreamingMovies": ("Streams movies", "No movie streaming"),
    "PaperlessBilling": ("Paperless billing", "Gets paper bills"),
}
CATEGORY = {
    "Contract": {"Month-to-month": "Month-to-month contract (can leave any time)",
                 "One year": "On a 1-year contract", "Two year": "On a 2-year contract"},
    "InternetService": {"Fiber optic": "Fiber internet (pricier plan)", "DSL": "DSL internet", "No": "No internet service"},
    "PaymentMethod": {"Electronic check": "Pays by electronic check", "Mailed check": "Pays by mailed check",
                      "Bank transfer (automatic)": "Automatic bank payments",
                      "Credit card (automatic)": "Automatic card payments"},
}


def describe(col: str, row: pd.Series) -> str:
    v = row[col]
    if col == "tenure":
        months = f"{v} month" + ("" if v == 1 else "s")
        return f"New customer (only {months} with myDel)" if v < 12 else f"Loyal for {months}"
    if col == "MonthlyCharges":
        return f"{'High' if v >= 70 else 'Low' if v < 35 else 'Medium'} monthly bill (${v:.0f})"
    if col == "TotalCharges":
        return f"Has spent only ${v:,.0f} with myDel so far" if v < 1000 else f"Has spent ${v:,.0f} with myDel"
    if col == "SeniorCitizen":
        return "Senior citizen" if v == 1 else "Not a senior citizen"
    if col == "gender":
        return str(v)
    if col in YES_NO:
        return YES_NO[col][0] if v == "Yes" else YES_NO[col][1]
    return CATEGORY.get(col, {}).get(v, f"{col}: {v}")


def column_of(feature: str) -> str:
    """'cat__Contract_Two year' -> 'Contract' (map one-hot feature back to its column)."""
    name = feature.split("__", 1)[1]
    for col in FEATURE_COLS:
        if name == col or name.startswith(col + "_"):
            return col
    return name


def main() -> None:
    rng = np.random.default_rng(RANDOM_STATE)
    sim = simulate_treatment(load_clean()).reset_index(drop=True)
    X, y = sim[FEATURE_COLS], sim["Churn"]

    # ---- 1. Out-of-fold scores (each customer scored by models that never saw them) ----
    rf = Pipeline([("preprocess", build_preprocessor()),
                   ("model", RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=5,
                                                    class_weight="balanced", n_jobs=-1, random_state=RANDOM_STATE))])
    rf = CalibratedClassifierCV(rf, method="sigmoid", cv=5)  # same calibration as train_classical.py
    churn_prob = np.zeros(len(sim))
    uplift = np.zeros(len(sim))
    folds = StratifiedKFold(5, shuffle=True, random_state=RANDOM_STATE)
    for i, (tr, te) in enumerate(folds.split(X, sim["treatment"] * 2 + y)):
        churn_prob[te] = rf.fit(X.iloc[tr], y.iloc[tr]).predict_proba(X.iloc[te])[:, 1]
        t = TLearner(LogisticRegression(max_iter=1000)).fit(
            X.iloc[tr], 1 - sim["churn_sim"].iloc[tr], sim["treatment"].iloc[tr])
        uplift[te] = t.predict_uplift(X.iloc[te])
        print(f"  fold {i + 1}/5 scored")
    sim["churn_prob"], sim["uplift_score"] = churn_prob, uplift

    # ---- 2. Plain-English reasons per customer (SHAP on the saved churn model) ----
    # SHAP needs the plain tree model; calibration rescales scores but doesn't change which features matter
    model = joblib.load(PROJECT_ROOT / "ml" / "models" / "churn_model_uncalibrated.joblib")
    pre, clf = model.named_steps["preprocess"], model.named_steps["model"]
    print("  computing SHAP reasons (about a minute)...")
    sv = shap.TreeExplainer(clf)(pre.transform(X)).values
    if sv.ndim == 3:
        sv = sv[:, :, 1]
    # add up one-hot pieces so each ORIGINAL column has one contribution
    cols = [column_of(f) for f in pre.get_feature_names_out()]
    contrib = pd.DataFrame(sv, columns=cols).T.groupby(level=0).sum().T
    leave, stay = [], []
    for i in range(len(sim)):
        c = contrib.iloc[i].drop("gender").sort_values()  # gender isn't a useful "reason"
        row = sim.iloc[i]
        # biggest positive contributions = reasons to LEAVE; biggest negative = reasons to STAY
        leave.append(" | ".join([describe(k, row) for k, v in c[::-1].items() if v > 0.005][:3]))
        stay.append(" | ".join([describe(k, row) for k, v in c.items() if v < -0.005][:3]))
    sim["reasons_leave"], sim["reasons_stay"] = leave, stay

    # ---- 3. Fictional profile fields ----
    first = [rng.choice(FIRST_F if g == "Female" else FIRST_M) for g in sim["gender"]]
    sim["name"] = [f"{f} {rng.choice(LAST)}" for f in first]
    sim["region"] = rng.choice(REGIONS, len(sim))
    sim["customer_since"] = [
        (pd.Timestamp(TODAY) - pd.DateOffset(months=int(t))).strftime("%b %Y") for t in sim["tenure"]]

    keep = [ID_COL, "name", "region", "customer_since"] + FEATURE_COLS + \
           ["Churn", "churn_prob", "uplift_score", "reasons_leave", "reasons_stay"]
    out = sim[keep].copy()
    out[["churn_prob", "uplift_score"]] = out[["churn_prob", "uplift_score"]].round(4)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUT_PATH, index=False)

    # ---- 4. Campaign profit for ALL myDel customers (same method as business_roi.py) ----
    with open(PROJECT_ROOT / "params.yaml") as f:
        biz = yaml.safe_load(f)["business"]
    value = sim["MonthlyCharges"] * biz["clv_months"] * sim["true_effect"]  # $ saved if contacted (simulated truth)
    rankings = {"Churn risk": churn_prob, "Uplift (T-learner)": uplift, "Random": rng.random(len(sim))}
    table = []
    for method, score in rankings.items():
        order = np.argsort(-score)
        for pct in biz["target_percents"]:
            n = int(round(pct / 100 * len(sim)))
            cost = n * biz["offer_cost"]
            gain = float(value.to_numpy()[order[:n]].sum())
            table.append({"method": method, "percent": pct, "contacted": n,
                          "customers_saved": round(float(sim["true_effect"].to_numpy()[order[:n]].sum()), 1),
                          "cost": cost, "value_saved": round(gain), "profit": round(gain - cost),
                          "roi": round((gain - cost) / cost, 3)})
    with open(ROI_PATH, "w") as f:
        json.dump({"simulated": True, "customers": len(sim),
                   "assumptions": {"offer_cost": biz["offer_cost"], "clv_months": biz["clv_months"]},
                   "table": table}, f, indent=2)

    print(f"\nSaved {len(out):,} myDel customers -> {OUT_PATH}")
    print(f"Saved campaign profit table -> {ROI_PATH}")
    print(pd.DataFrame(table).pivot(index="percent", columns="method", values="profit").to_string())


if __name__ == "__main__":
    main()
