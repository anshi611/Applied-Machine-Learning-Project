# 4. Calibration: making the probabilities honest

[← Churn models](03_churn_models.md) · Next: [SHAP →](05_explainability_shap.md)

Code: `train_classical.py` step 3b, and `score_customers.py` · Chart: [calibration_curve.png](../ml/results/figures/calibration_curve.png)

## The problem we found
A model is **calibrated** if, among customers it gives a 30% churn chance, about 30% actually leave.

Our Random Forest was **not**. Class weights (chapter 3) make churners count 3× more, which pushes every probability **up**:

| Model said | Customers who actually left (before the fix) |
|---|---|
| ~7% | 3.5% |
| ~30% | 13% |
| ~50% | 30% |
| ~71% | 50% |
| **Average: 39.4%** | **Actual: 26.5%** |

**Ranking was fine** (ROC-AUC 0.846 only cares about order). But the app shows these numbers to people as "chance of staying", and the risk levels (High ≥ 60%, Low < 30%) and the "no action needed" rule all treat them as real probabilities. So they had to be fixed.

## The fix: Platt scaling (sigmoid calibration)
```python
CalibratedClassifierCV(random_forest_pipeline, method="sigmoid", cv=5)
```
1. Split the **training** data into 5 folds.
2. In each fold, train the Random Forest on 4/5 and look at its scores on the held-out 1/5.
3. Fit a small logistic curve that maps "raw score → real churn rate" on that held-out part.
4. Final prediction = average of the 5 calibrated models.

The test set is never used, so there's no leakage.

**Why sigmoid and not isotonic?** We tried both. They tied on accuracy (Brier 0.136), but sigmoid is a smooth, monotonic curve: it keeps the ranking intact and is simpler to explain.

## Results (test set)
| | Mean predicted churn | Brier score (lower = better) | ROC-AUC |
|---|---|---|---|
| Before | 39.4% | 0.158 | 0.846 |
| **After** | **26.7%** (actual 26.5%) | **0.136** | **0.846** |

On all 7,043 customers (out-of-fold scores):

| Model says | Actually left |
|---|---|
| 7% | 7% |
| 30% | 31% |
| 51% | 48% |
| 69% | 70% |

**Brier score** = average of (predicted probability − actual outcome)². It rewards being right *and* confident in the right amount.

## What changed in the app
| | Before | After |
|---|---|---|
| Average "chance of staying" (actual retention 73.5%) | 60.6% | **73.4%** |
| High-risk customers (≥ 60% churn) | 2,115 | **1,090** |
| Monthly revenue from high-risk customers | $164k | **$88k** |
| "No action needed" (churn < 30%) | 754 | **3,460** |

The campaign conclusions did **not** change: ranking is the same, so churn-risk targeting still wins, and profit still peaks at about 40%.

## SHAP and calibration
SHAP explanations (chapter 5) use the **uncalibrated** Random Forest (`churn_model_uncalibrated.joblib`). Sigmoid calibration is a monotonic rescaling, so the features that push risk up or down are the same.
