"""Split conformal prediction intervals."""
import numpy as np


def conformal_quantile(y_true, y_pred, alpha=0.10):
    """Half-width q such that [pred - q, pred + q] covers ~(1 - alpha) of new points."""
    residuals = np.abs(np.asarray(y_true) - np.asarray(y_pred))
    n = len(residuals)
    level = min(1.0, np.ceil((n + 1) * (1 - alpha)) / n)
    return float(np.quantile(residuals, level, method="higher"))


def coverage(y_true, lower, upper):
    """Fraction of true values that fall inside [lower, upper]."""
    y_true = np.asarray(y_true)
    return float(np.mean((y_true >= lower) & (y_true <= upper)))
