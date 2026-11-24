"""
Phase 4: uplift modelling with a T-learner.

!!! Uses the SIMULATED retention-offer data from simulate_treatment.py !!!

Churn model vs uplift model: what's the difference?
  - Churn model  asks: "WHO is likely to leave?"
  - Uplift model asks: "WHO will stay BECAUSE we contacted them?"
  A customer who will leave no matter what (a lost cause) has high churn risk
  but zero uplift, so contacting them wastes money.

T-learner ("Two models"):
  1. Model T: trained only on customers who GOT the offer      -> P(stay | offer)
  2. Model C: trained only on customers who did NOT get it     -> P(stay | no offer)
  3. Uplift score = P(stay | offer) - P(stay | no offer)
     positive = offer helps, ~0 = no effect, negative = offer backfires.

Evaluation (on the same 20% test customers as Phase 3):
  - Qini / uplift curves (standard uplift metrics, from scikit-uplift)
  - Top-20% question: if we can only contact 20% of customers, does ranking
    by churn RISK or by UPLIFT save more customers?

Outputs:
  ml/models/uplift_model.joblib        {"treated": pipeline, "control": pipeline}
  ml/results/uplift_metrics.json       results for the API / frontend
  ml/results/figures/qini_curves.png, uplift_gain.png, uplift_by_decile.png

Run from the project root (after train_classical.py):
    python ml/train_uplift.py
"""
import json

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklift.metrics import qini_auc_score, qini_curve, uplift_at_k
from xgboost import XGBClassifier

from preprocess import FEATURE_COLS, PROJECT_ROOT, RANDOM_STATE, build_preprocessor, load_clean, split_data
from simulate_treatment import simulate_treatment

MODEL_DIR = PROJECT_ROOT / "ml" / "models"
RESULTS_DIR = PROJECT_ROOT / "ml" / "results"
FIG_DIR = RESULTS_DIR / "figures"
TOP_K = 0.20  # we can contact only the top 20% of customers


class TLearner:
    """Minimal T-learner: one model per group, uplift = difference."""

    def __init__(self, base_model):
        self.model_treated = Pipeline([("preprocess", build_preprocessor()), ("model", clone(base_model))])
        self.model_control = Pipeline([("preprocess", build_preprocessor()), ("model", clone(base_model))])

    def fit(self, X, y, treatment):
        self.model_treated.fit(X[treatment == 1], y[treatment == 1])
        self.model_control.fit(X[treatment == 0], y[treatment == 0])
        return self

    def predict_uplift(self, X):
        p_stay_offer = self.model_treated.predict_proba(X)[:, 1]
        p_stay_no_offer = self.model_control.predict_proba(X)[:, 1]
        return p_stay_offer - p_stay_no_offer


def base_models() -> dict:
    """Two candidate base learners for the T-learner."""
    return {
        "T-learner (Logistic Regression)": LogisticRegression(max_iter=1000),
        "T-learner (XGBoost)": XGBClassifier(
            n_estimators=200, max_depth=3, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, min_child_weight=5,
            eval_metric="logloss", n_jobs=-1, random_state=RANDOM_STATE),
    }


def cv_qini(base_model, X, y, t, n_splits=5) -> float:
    """5-fold CV Qini on TRAIN data only, so we pick a base learner without touching the test set."""
    strata = t * 2 + y  # keep treatment/outcome mix the same in every fold
    scores = []
    for tr, va in StratifiedKFold(n_splits, shuffle=True, random_state=RANDOM_STATE).split(X, strata):
        m = TLearner(base_model).fit(X.iloc[tr], y.iloc[tr], t.iloc[tr])
        scores.append(qini_auc_score(y.iloc[va], m.predict_uplift(X.iloc[va]), t.iloc[va]))
    return float(np.mean(scores))


def true_gain_curve(score, true_effect, n_points=21):
    """Cumulative TRUE expected customers saved when contacting the top x% by `score`."""
    order = np.argsort(-score)
    cum = np.concatenate([[0], np.cumsum(true_effect[order])])
    fracs = np.linspace(0, 1, n_points)
    return fracs, cum[(fracs * len(score)).round().astype(int)]


def main() -> None:
    FIG_DIR.mkdir(parents=True, exist_ok=True)

    # ---- 1. Simulated data, same train/test customers as Phase 3 ----
    sim = simulate_treatment(load_clean())
    train, test = split_data(sim)
    # Outcome for uplift: 1 = customer STAYED (so positive uplift = good)
    y_train, y_test = 1 - train["churn_sim"], 1 - test["churn_sim"]
    t_train, t_test = train["treatment"], test["treatment"]
    X_train, X_test = train[FEATURE_COLS], test[FEATURE_COLS]

    # ---- 2. Choose the base learner by cross-validated Qini (train only) ----
    print("5-fold CV Qini on train (higher = better):")
    cv_scores = {}
    for name, base in base_models().items():
        cv_scores[name] = cv_qini(base, X_train, y_train, t_train)
        print(f"  {name:35s} {cv_scores[name]:.4f}")
    chosen = max(cv_scores, key=cv_scores.get)
    print(f"Chosen: {chosen}\n")

    # ---- 3. Fit all T-learners on full train, score the test set ----
    scores = {}
    for name, base in base_models().items():
        m = TLearner(base).fit(X_train, y_train, t_train)
        scores[name] = m.predict_uplift(X_test)
        if name == chosen:
            joblib.dump({"treated": m.model_treated, "control": m.model_control, "name": name},
                        MODEL_DIR / "uplift_model.joblib")

    # Churn-risk ranking = the Phase 3 best classifier (trained on real churn)
    churn_model = joblib.load(MODEL_DIR / "best_churn_model.joblib")
    scores["Churn risk (Random Forest)"] = churn_model.predict_proba(X_test)[:, 1]
    rng = np.random.default_rng(RANDOM_STATE)
    scores["Random"] = rng.random(len(test))

    # ---- 4. Evaluate every ranking ----
    true_effect = test["true_effect"].to_numpy()
    k = int(round(TOP_K * len(test)))
    best_possible = np.sort(true_effect)[::-1][:k].sum()
    results = {}
    for name, s in scores.items():
        top = np.argsort(-s)[:k]
        results[name] = {
            "qini_auc": round(float(qini_auc_score(y_test, s, t_test)), 4),
            # observed: stay-rate(treated) - stay-rate(control) inside the top 20%
            "observed_uplift_at_20": round(float(uplift_at_k(y_test, s, t_test, strategy="overall", k=TOP_K)), 4),
            # ground truth (simulation only): expected customers saved by contacting the top 20%
            "true_saved_top20": round(float(true_effect[top].sum()), 1),
            "segments_top20": test.iloc[top]["segment"].value_counts().to_dict(),
        }
    print(f"Test set: {len(test)} customers | top 20% = {k} | best possible saved = {best_possible:.1f}\n")
    print(pd.DataFrame(results).T.drop(columns="segments_top20").to_string(), "\n")
    for name, r in results.items():
        print(f"  {name:35s} top-20% segments: {r['segments_top20']}")

    # ---- 5. Charts ----
    main_names = [chosen, "Churn risk (Random Forest)", "Random"]
    colors = {chosen: "#55A868", "Churn risk (Random Forest)": "#DD8452", "Random": "#8C8C8C"}

    # 5a. Qini curves (observed data: what a real company could measure)
    plt.figure(figsize=(7, 5))
    qini_points = {}
    for name in main_names:
        x, yq = qini_curve(y_test, scores[name], t_test)
        plt.plot(x / len(test) * 100, yq, label=f"{name} (Qini AUC={results[name]['qini_auc']:.3f})",
                 color=colors[name])
        idx = np.linspace(0, len(x) - 1, 21).astype(int)
        qini_points[name] = [{"pct": round(float(x[i] / len(test) * 100), 1), "qini": round(float(yq[i]), 2)} for i in idx]
    plt.axvline(TOP_K * 100, ls=":", color="black", label="Top 20% budget")
    plt.xlabel("% of customers contacted (ranked by score)")
    plt.ylabel("Incremental customers retained (Qini)")
    plt.title("Qini curves on test set (SIMULATED offer data)")
    plt.legend(fontsize=8); plt.tight_layout(); plt.savefig(FIG_DIR / "qini_curves.png", dpi=120); plt.close()

    # 5b. True gain curves (ground truth: only possible in a simulation)
    plt.figure(figsize=(7, 5))
    gain_points = {}
    for name in main_names:
        fr, g = true_gain_curve(scores[name], true_effect)
        plt.plot(fr * 100, g, marker="o", ms=3, label=name, color=colors[name])
        gain_points[name] = [{"pct": round(float(a * 100)), "saved": round(float(b), 1)} for a, b in zip(fr, g)]
    plt.axvline(TOP_K * 100, ls=":", color="black", label="Top 20% budget")
    plt.xlabel("% of customers contacted"); plt.ylabel("Expected customers saved (true, simulated)")
    plt.title("Customers saved vs % contacted (ground truth)")
    plt.legend(fontsize=8); plt.tight_layout(); plt.savefig(FIG_DIR / "uplift_gain.png", dpi=120); plt.close()

    # 5c. Observed uplift by decile of the chosen uplift model
    dec = pd.DataFrame({"score": scores[chosen], "y": y_test.values, "t": t_test.values})
    dec["decile"] = pd.qcut(-dec["score"].rank(method="first"), 10, labels=range(1, 11))
    by_dec = dec.groupby("decile", observed=True).apply(
        lambda g: g.loc[g.t == 1, "y"].mean() - g.loc[g.t == 0, "y"].mean(), include_groups=False) * 100
    plt.figure(figsize=(7, 4))
    plt.bar(by_dec.index.astype(str), by_dec.values,
            color=["#55A868" if v > 0 else "#C44E52" for v in by_dec.values])
    plt.axhline(0, color="black", lw=0.8)
    plt.xlabel("Decile of predicted uplift (1 = highest)")
    plt.ylabel("Observed uplift (pts)\nstay% offer − stay% no offer")
    plt.title(f"Observed uplift by decile: {chosen}")
    plt.tight_layout(); plt.savefig(FIG_DIR / "uplift_by_decile.png", dpi=120); plt.close()

    # ---- 6. Save results JSON ----
    with open(RESULTS_DIR / "uplift_metrics.json", "w") as f:
        json.dump({
            "simulated": True,
            "note": "Treatment and its effect are SIMULATED (see ml/simulate_treatment.py).",
            "chosen_uplift_model": chosen,
            "cv_qini_train": {n: round(v, 4) for n, v in cv_scores.items()},
            "test_size": len(test), "top_k": TOP_K, "k_customers": k,
            "best_possible_saved_top20": round(float(best_possible), 1),
            "methods": results,
            "qini_curves": qini_points,
            "gain_curves": gain_points,
            "uplift_by_decile": {str(i): round(float(v), 2) for i, v in by_dec.items()},
        }, f, indent=2)
    print(f"\nSaved uplift model + results to {MODEL_DIR} and {RESULTS_DIR}")


if __name__ == "__main__":
    main()
