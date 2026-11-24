"""
Phase 5: business recommendation, i.e. turning model scores into money.

For each targeting method (churn risk, uplift, random) and each campaign
size (top 10%, 20%, ... 100% of test customers):

    cost          = number contacted x offer_cost
    value saved   = sum over contacted customers of
                    true_effect x customer value      (customer value = MonthlyCharges x clv_months)
    profit        = value saved - cost
    ROI           = profit / cost

true_effect comes from the SIMULATED offer (see simulate_treatment.py), so
these are illustrative numbers, not real campaign results.

Also writes the demo customer file used by the backend:
    backend/data/demo_customers.csv  = the 1,409 TEST customers with their
    churn probability and uplift score (out-of-sample, small, public data).

Run from the project root (after train_classical.py and train_uplift.py):
    python ml/business_roi.py
"""
import json

import joblib
import numpy as np
import pandas as pd
import yaml

from preprocess import FEATURE_COLS, ID_COL, PROJECT_ROOT, RANDOM_STATE, load_clean, split_data
from simulate_treatment import simulate_treatment

MODEL_DIR = PROJECT_ROOT / "ml" / "models"
RESULTS_DIR = PROJECT_ROOT / "ml" / "results"
DEMO_PATH = PROJECT_ROOT / "backend" / "data" / "demo_customers.csv"


def load_params() -> dict:
    with open(PROJECT_ROOT / "params.yaml") as f:
        return yaml.safe_load(f)


def main() -> None:
    biz = load_params()["business"]
    cost_per_offer, months = biz["offer_cost"], biz["clv_months"]

    # ---- 1. Score the test customers with both models ----
    sim = simulate_treatment(load_clean())
    _, test = split_data(sim)
    test = test.reset_index(drop=True)
    X = test[FEATURE_COLS]

    churn_model = joblib.load(MODEL_DIR / "best_churn_model.joblib")
    uplift = joblib.load(MODEL_DIR / "uplift_model.joblib")
    test["churn_prob"] = churn_model.predict_proba(X)[:, 1]
    test["uplift_score"] = (uplift["treated"].predict_proba(X)[:, 1]
                            - uplift["control"].predict_proba(X)[:, 1])
    test["customer_value"] = test["MonthlyCharges"] * months
    rng = np.random.default_rng(RANDOM_STATE)
    rankings = {
        "Churn risk": test["churn_prob"].to_numpy(),
        "Uplift (T-learner)": test["uplift_score"].to_numpy(),
        "Random": rng.random(len(test)),
    }

    # ---- 2. Profit / ROI for every method and campaign size ----
    true_value = (test["true_effect"] * test["customer_value"]).to_numpy()  # $ saved if contacted
    rows = []
    for method, score in rankings.items():
        order = np.argsort(-score)
        for pct in biz["target_percents"]:
            n = int(round(pct / 100 * len(test)))
            chosen = order[:n]
            cost = n * cost_per_offer
            value = float(true_value[chosen].sum())
            rows.append({
                "method": method, "percent": pct, "contacted": n,
                "customers_saved": round(float(test["true_effect"].to_numpy()[chosen].sum()), 1),
                "cost": round(cost, 0), "value_saved": round(value, 0),
                "profit": round(value - cost, 0),
                "roi": round((value - cost) / cost, 3) if cost else 0.0,
            })
    roi = pd.DataFrame(rows)
    print(f"Assumptions: offer cost ${cost_per_offer}, customer value = MonthlyCharges x {months} months")
    print(f"Test customers: {len(test)} (SIMULATED offer effect)\n")
    print(roi.pivot(index="percent", columns="method", values="profit").to_string(), "\n")

    # ---- 3. Recommendation text (generated from the numbers) ----
    head = roi[roi.percent == biz["headline_percent"]].set_index("method")
    best_head = head["profit"].idxmax()
    best_row = roi.loc[roi["profit"].idxmax()]
    rec = [
        f"With a budget for the top {biz['headline_percent']}% ({int(head.loc[best_head, 'contacted'])} customers), "
        f"'{best_head}' ranking gives the highest profit: ${head.loc[best_head, 'profit']:,.0f} "
        f"(ROI {head.loc[best_head, 'roi']:.0%}) vs ${head.loc['Uplift (T-learner)', 'profit']:,.0f} for uplift "
        f"and ${head.loc['Random', 'profit']:,.0f} for random targeting.",
        f"Most profitable overall: '{best_row.method}' contacting the top {best_row.percent}% "
        f"(profit ${best_row.profit:,.0f}). Contacting more than that REDUCES profit: extra offers go to "
        f"customers who would stay anyway or who react badly.",
        "Uplift ranking avoids 'lost causes' (high-risk customers the offer cannot save), but in this "
        "simulation churn risk already captures most of who responds, so it wins on profit.",
        "Recommendation: target the highest churn-risk customers first, skip customers the uplift model "
        "flags as negative (likely to react badly), and run a real A/B test before trusting uplift scores, "
        "because the uplift effects here are simulated.",
    ]
    print("\n".join("- " + r for r in rec))

    # ---- 4. Save results ----
    with open(RESULTS_DIR / "roi_results.json", "w") as f:
        json.dump({
            "simulated": True,
            "assumptions": {"offer_cost": cost_per_offer, "clv_months": months,
                            "avg_customer_value": round(float(test["customer_value"].mean()), 0)},
            "test_customers": len(test),
            "headline_percent": biz["headline_percent"],
            "table": rows,
            "recommendation": rec,
        }, f, indent=2)

    DEMO_PATH.parent.mkdir(parents=True, exist_ok=True)
    keep = [ID_COL] + FEATURE_COLS + ["Churn", "churn_prob", "uplift_score", "customer_value"]
    test[keep].round(4).to_csv(DEMO_PATH, index=False)
    print(f"\nSaved {RESULTS_DIR / 'roi_results.json'} and {DEMO_PATH}")


if __name__ == "__main__":
    main()
