"""Predictor used by the API. Loads the trained model from models/model.joblib.

Falls back to a dummy predictor if the model file is missing, so the API
and tests still run before the model has been trained.
"""
from pathlib import Path

import joblib
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "model.joblib"
CONFIDENCE_LEVEL = 0.90

_bundle = None


def _load():
    global _bundle
    if _bundle is None and MODEL_PATH.exists():
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


def predict_with_interval(features: dict) -> tuple[float, float, float]:
    """Return (prediction, lower, upper) in units of $100,000."""
    bundle = _load()
    if bundle is None:
        # DUMMY fallback (model not trained yet)
        pred = max(0.2, 0.4 * features["MedInc"] + 0.01 * features["HouseAge"])
        return pred, pred * 0.8, pred * 1.2

    row = pd.DataFrame([features])[bundle["features"]]
    pred = float(bundle["model"].predict(row)[0])
    q = bundle["q"]
    return pred, max(0.0, pred - q), pred + q
