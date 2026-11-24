"""
Phase 3: train and compare three classical churn models.

  1. Logistic Regression  (simple, linear, easy to explain)
  2. Random Forest        (many decision trees voting together)
  3. XGBoost              (trees built one after another, each fixing the
                           previous trees' mistakes: "gradient boosting")

Each model is a scikit-learn Pipeline:  [encode + scale]  ->  [model]
so the preprocessing is learned from the TRAINING data only (no leakage)
and the saved file contains everything needed to predict on raw input.

Class imbalance (26.5% churners) is handled with class weights: mistakes
on churners count about 3x more during training, so the models don't just
predict "no churn" for everyone.

Calibration: class weights make the raw probabilities too HIGH (the model
predicted 39% churn on average when the real rate is 26.5%). Ranking is still
good, but the app shows these numbers as "chance of staying", so the chosen
model is wrapped in CalibratedClassifierCV (sigmoid / Platt scaling, 5-fold).
That keeps the ranking (ROC-AUC unchanged) and makes the probabilities honest.

Outputs:
  ml/models/best_churn_model.joblib     best pipeline, CALIBRATED (used for all predictions)
  ml/models/churn_model_uncalibrated.joblib  same model before calibration (used for SHAP)
  ml/results/figures/calibration_curve.png   predicted vs actual churn, before/after
  ml/results/classical_metrics.json     metrics for all models (used by the API)
  ml/results/shap_importance.json       top churn drivers (used by the dashboard)
  ml/results/figures/*.png              ROC curves, confusion matrix, SHAP plots

Run from the project root:
    python ml/train_classical.py
"""
import json
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")  # save charts to files, no pop-up windows
import matplotlib.pyplot as plt
import numpy as np
import shap
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (ConfusionMatrixDisplay, brier_score_loss, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score, roc_curve)
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from preprocess import (FEATURE_COLS, PROJECT_ROOT, RANDOM_STATE, TARGET,
                        build_preprocessor, load_clean, split_data)

MODEL_DIR = PROJECT_ROOT / "ml" / "models"
RESULTS_DIR = PROJECT_ROOT / "ml" / "results"
FIG_DIR = RESULTS_DIR / "figures"
THRESHOLD = 0.5  # probability above this -> predict "churn"
CALIBRATION = "sigmoid"  # Platt scaling: keeps the ranking, fixes the probability scale


def make_models(pos_weight: float) -> dict:
    """
    The three models with simple, reasonable settings (no heavy tuning,
    to keep the project explainable). pos_weight = (#stayers / #churners).
    """
    return {
        "Logistic Regression": LogisticRegression(
            max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE),
        "Random Forest": RandomForestClassifier(
            n_estimators=300,        # 300 trees
            max_depth=8,             # limit depth -> less overfitting, smaller file
            min_samples_leaf=5,
            class_weight="balanced",
            n_jobs=-1, random_state=RANDOM_STATE),
        "XGBoost": XGBClassifier(
            n_estimators=300,
            max_depth=4,             # shallow trees
            learning_rate=0.05,      # small steps -> more stable
            subsample=0.8,           # each tree sees 80% of rows
            colsample_bytree=0.8,    # ...and 80% of columns
            scale_pos_weight=pos_weight,  # XGBoost's version of class weights
            eval_metric="logloss",
            n_jobs=-1, random_state=RANDOM_STATE),
    }


def evaluate(y_true, prob) -> dict:
    """Imbalance-friendly metrics. Accuracy is deliberately not the headline."""
    pred = (prob >= THRESHOLD).astype(int)
    return {
        "roc_auc": roc_auc_score(y_true, prob),       # ranking quality, threshold-free
        "precision": precision_score(y_true, pred),   # of flagged customers, % that churn
        "recall": recall_score(y_true, pred),         # of real churners, % we caught
        "f1": f1_score(y_true, pred),                 # balance of precision & recall
    }


def pretty_name(feature: str) -> str:
    """'cat__Contract_Month-to-month' -> 'Contract = Month-to-month'."""
    name = feature.split("__", 1)[1]
    for col in FEATURE_COLS:
        if name.startswith(col + "_"):
            return f"{col} = {name[len(col) + 1:]}"
    return name


def shap_analysis(pipeline, X_test, model_name: str) -> list:
    """
    SHAP explains each prediction as a sum of feature contributions.
    Mean |SHAP value| per feature = how much that feature moves predictions
    on average, i.e. global feature importance.
    """
    pre = pipeline.named_steps["preprocess"]
    model = pipeline.named_steps["model"]
    X_t = pre.transform(X_test)
    names = [pretty_name(f) for f in pre.get_feature_names_out()]

    # Tree models -> fast exact TreeExplainer; linear model -> LinearExplainer.
    if isinstance(model, LogisticRegression):
        explainer = shap.LinearExplainer(model, X_t)
    else:
        explainer = shap.TreeExplainer(model)
    sv = explainer(X_t)
    sv.feature_names = names
    if sv.values.ndim == 3:  # Random Forest gives one set per class -> keep "churn"
        sv = sv[:, :, 1]

    # Beeswarm: every dot is a customer; right = pushes towards churn.
    plt.figure()
    shap.plots.beeswarm(sv, max_display=15, show=False)
    plt.title(f"SHAP summary ({model_name})")
    plt.tight_layout(); plt.savefig(FIG_DIR / "shap_beeswarm.png", dpi=120); plt.close("all")

    plt.figure()
    shap.plots.bar(sv, max_display=15, show=False)
    plt.title(f"SHAP feature importance ({model_name})")
    plt.tight_layout(); plt.savefig(FIG_DIR / "shap_bar.png", dpi=120); plt.close("all")

    # Direction: does a HIGH value of this feature raise or lower churn risk?
    mean_abs = np.abs(sv.values).mean(axis=0)
    importance = []
    for i in np.argsort(mean_abs)[::-1][:15]:
        x, v = sv.data[:, i], sv.values[:, i]
        corr = np.corrcoef(x, v)[0, 1] if np.std(x) > 0 else 0.0
        importance.append({
            "feature": names[i],
            "mean_abs_shap": round(float(mean_abs[i]), 4),
            "direction": "increases churn" if corr > 0 else "decreases churn",
        })
    return importance


def main() -> None:
    for d in (MODEL_DIR, FIG_DIR):
        d.mkdir(parents=True, exist_ok=True)

    # ---- 1. Data ----
    df = load_clean()
    train, test = split_data(df)
    X_train, y_train = train[FEATURE_COLS], train[TARGET]
    X_test, y_test = test[FEATURE_COLS], test[TARGET]
    pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    print(f"Train: {len(train)} rows | Test: {len(test)} rows | "
          f"churn rate train={y_train.mean():.1%} test={y_test.mean():.1%}\n")

    # ---- 2. Train + evaluate each model ----
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    results, pipelines, probs = {}, {}, {}
    for name, model in make_models(pos_weight).items():
        pipe = Pipeline([("preprocess", build_preprocessor()), ("model", model)])

        # 5-fold cross-validation on TRAIN only: stability check
        cv_auc = cross_val_score(pipe, X_train, y_train, cv=cv, scoring="roc_auc")

        pipe.fit(X_train, y_train)
        prob = pipe.predict_proba(X_test)[:, 1]
        metrics = evaluate(y_test, prob)
        metrics["cv_roc_auc_mean"] = cv_auc.mean()
        metrics["cv_roc_auc_std"] = cv_auc.std()

        results[name] = {k: round(float(v), 4) for k, v in metrics.items()}
        pipelines[name], probs[name] = pipe, prob
        print(f"{name:20s} " + "  ".join(f"{k}={v:.3f}" for k, v in results[name].items()))

    # ---- 3. Pick the best model by test ROC-AUC ----
    best_name = max(results, key=lambda n: results[n]["roc_auc"])
    best_pipe = pipelines[best_name]
    print(f"\nBest model (highest test ROC-AUC): {best_name}")

    # ---- 3b. Calibrate the chosen model's probabilities ----
    # 5-fold on TRAIN: each fold fits the model on 4/5 and learns the probability
    # correction on the held-out 1/5. The test set stays untouched.
    calibrated = CalibratedClassifierCV(clone(best_pipe), method=CALIBRATION, cv=5)
    calibrated.fit(X_train, y_train)
    raw_prob, cal_prob = probs[best_name], calibrated.predict_proba(X_test)[:, 1]
    summary = lambda p: {"mean_predicted": round(float(p.mean()), 4),
                         "brier": round(float(brier_score_loss(y_test, p)), 4),
                         "roc_auc": round(float(roc_auc_score(y_test, p)), 4)}
    calibration = {"method": CALIBRATION, "actual_churn_rate": round(float(y_test.mean()), 4),
                   "before": summary(raw_prob), "after": summary(cal_prob), "curve": {}}

    plt.figure(figsize=(6, 5))
    plt.plot([0, 1], [0, 1], "k--", label="Perfectly calibrated")
    for label, p in [("Before (class-weighted)", raw_prob), ("After calibration", cal_prob)]:
        frac, mean_pred = calibration_curve(y_test, p, n_bins=10, strategy="quantile")
        plt.plot(mean_pred, frac, "o-", label=label)
        calibration["curve"][label] = [{"predicted": round(float(a), 4), "actual": round(float(b), 4)}
                                       for a, b in zip(mean_pred, frac)]
    plt.xlabel("Predicted churn probability"); plt.ylabel("Actual churn rate")
    plt.title(f"Calibration: {best_name} (test set)"); plt.legend(loc="upper left")
    plt.tight_layout(); plt.savefig(FIG_DIR / "calibration_curve.png", dpi=120); plt.close()
    b, a = calibration["before"], calibration["after"]
    print(f"Calibration ({CALIBRATION}): mean predicted churn {b['mean_predicted']:.1%} -> "
          f"{a['mean_predicted']:.1%} (actual {calibration['actual_churn_rate']:.1%}), "
          f"Brier {b['brier']:.4f} -> {a['brier']:.4f}, ROC-AUC {b['roc_auc']:.4f} -> {a['roc_auc']:.4f}")

    joblib.dump(calibrated, MODEL_DIR / "best_churn_model.joblib")         # used for predictions
    joblib.dump(best_pipe, MODEL_DIR / "churn_model_uncalibrated.joblib")  # used for SHAP explanations

    # ---- 4. Charts: ROC curves + confusion matrix ----
    roc_points = {}
    plt.figure(figsize=(6, 5))
    for name, prob in probs.items():
        fpr, tpr, _ = roc_curve(y_test, prob)
        plt.plot(fpr, tpr, label=f"{name} (AUC={results[name]['roc_auc']:.3f})")
        # Keep ~50 points per curve for the frontend chart
        idx = np.linspace(0, len(fpr) - 1, 50).astype(int)
        roc_points[name] = [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in idx]
    plt.plot([0, 1], [0, 1], "k--", label="Random guess (AUC=0.5)")
    plt.xlabel("False positive rate"); plt.ylabel("True positive rate (recall)")
    plt.title("ROC curves (test set)"); plt.legend(loc="lower right")
    plt.tight_layout(); plt.savefig(FIG_DIR / "roc_curves.png", dpi=120); plt.close()

    cm = confusion_matrix(y_test, (probs[best_name] >= THRESHOLD).astype(int))
    ConfusionMatrixDisplay(cm, display_labels=["Stayed", "Churned"]).plot(cmap="Blues")
    plt.title(f"Confusion matrix: {best_name}")
    plt.tight_layout(); plt.savefig(FIG_DIR / "confusion_matrix.png", dpi=120); plt.close()

    # ---- 5. SHAP on the best model ----
    importance = shap_analysis(best_pipe, X_test, best_name)
    print("\nTop 10 churn drivers (SHAP):")
    for r in importance[:10]:
        print(f"  {r['feature']:40s} {r['mean_abs_shap']:.3f}  ({r['direction']})")

    # ---- 6. Save results as JSON for the backend / frontend ----
    with open(RESULTS_DIR / "classical_metrics.json", "w") as f:
        json.dump({
            "best_model": best_name,
            "threshold": THRESHOLD,
            "test_size": len(test),
            "test_churn_rate": round(float(y_test.mean()), 4),
            "models": results,
            "confusion_matrix_best": cm.tolist(),
            "roc_curves": roc_points,
            "calibration": calibration,
        }, f, indent=2)
    with open(RESULTS_DIR / "shap_importance.json", "w") as f:
        json.dump({"model": best_name, "top_features": importance}, f, indent=2)
    print(f"\nSaved model + results to {MODEL_DIR} and {RESULTS_DIR}")


if __name__ == "__main__":
    main()
