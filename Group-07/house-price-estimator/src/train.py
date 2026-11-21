"""Train the house-price model, calibrate intervals, save artefacts.

Run from the project root:  python -m src.train
"""
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split

from src.data import load_clean_data
from src.intervals import conformal_quantile, coverage

ALPHA = 0.10  # 90% prediction intervals
SEED = 42
ROOT = Path(__file__).resolve().parent.parent


def rmse(y_true, y_pred):
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def main():
    X, y = load_clean_data()  # target is in units of $100,000

    # 60% train / 20% calibration / 20% test
    X_tmp, X_test, y_tmp, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    X_train, X_cal, y_train, y_cal = train_test_split(X_tmp, y_tmp, test_size=0.25, random_state=SEED)

    candidates = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(n_estimators=200, n_jobs=-1, random_state=SEED),
        "GradientBoosting": HistGradientBoostingRegressor(random_state=SEED),
    }

    metrics = {"point_models": {}}
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        pred = model.predict(X_test)
        metrics["point_models"][name] = {
            "rmse": rmse(y_test, pred),
            "mae": float(mean_absolute_error(y_test, pred)),
        }
        print(f"{name:18s} RMSE={metrics['point_models'][name]['rmse']:.4f}  "
              f"MAE={metrics['point_models'][name]['mae']:.4f}")

    # Final model: gradient boosting + conformal intervals
    final = candidates["GradientBoosting"]
    q = conformal_quantile(y_cal, final.predict(X_cal), alpha=ALPHA)

    test_pred = final.predict(X_test)
    lower, upper = np.clip(test_pred - q, 0, None), test_pred + q
    metrics["intervals"] = {
        "target_coverage": 1 - ALPHA,
        "empirical_coverage_on_test": coverage(y_test, lower, upper),
        "half_width_q": q,
        "mean_interval_width": float(np.mean(upper - lower)),
    }
    print(f"Interval half-width q={q:.4f}  "
          f"test coverage={metrics['intervals']['empirical_coverage_on_test']:.3f} "
          f"(target {1 - ALPHA:.2f})")

    (ROOT / "models").mkdir(exist_ok=True)
    joblib.dump(
        {"model": final, "q": q, "features": list(X.columns), "confidence": 1 - ALPHA},
        ROOT / "models" / "model.joblib",
    )
    (ROOT / "report").mkdir(exist_ok=True)
    (ROOT / "report" / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print("Saved models/model.joblib and report/metrics.json")


if __name__ == "__main__":
    main()
