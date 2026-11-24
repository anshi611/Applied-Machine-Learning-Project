# 3. Churn models: who is likely to leave?

[← Preprocessing](02_preprocessing.md) · Next: [Calibration →](04_calibration.md)

Code: [`ml/train_classical.py`](../ml/train_classical.py) · Results: [`ml/results/classical_metrics.json`](../ml/results/classical_metrics.json)

## The three models
| Model | How it works (plain English) | Why include it |
|---|---|---|
| **Logistic Regression** | Adds up weighted features and squashes the result into a 0–1 probability | Simple, linear, very explainable: the baseline |
| **Random Forest** | 300 decision trees, each trained on a random sample; they vote | Captures interactions (e.g. fiber *and* month-to-month); robust |
| **XGBoost** | Trees built one after another, each fixing the previous trees' mistakes ("gradient boosting") | Usually the strongest on tabular data |

Settings were kept simple and explainable (no heavy tuning): RF uses 300 trees, max depth 8, at least 5 customers per leaf; XGBoost uses 300 shallow trees (depth 4) with learning rate 0.05 and 80% row/column sampling.

## Handling the imbalance
Only 26.5% churn, so we use **class weights**: a mistake on a churner counts about **3× more** during training.
- LR and RF: `class_weight="balanced"`
- XGBoost: `scale_pos_weight` = stayers ÷ churners ≈ 2.77

Without this, models drift towards predicting "stays" for everyone. The side effect (probabilities too high) is fixed in [chapter 4](04_calibration.md).

## Metrics: why not accuracy?
| Metric | Question it answers | Why we use it |
|---|---|---|
| **ROC-AUC** | Pick one leaver and one stayer at random: how often does the model rank the leaver as riskier? 0.5 = coin flip, 1.0 = perfect | Measures **ranking**, which is exactly what targeting needs, and doesn't depend on a cut-off |
| **Precision** | Of customers we flag, what % really leave? | Wasted offers |
| **Recall** | Of customers who really leave, what % did we catch? | Missed churners |
| **F1** | Balance of precision and recall | One summary number |
| 5-fold CV ROC-AUC | Is the score stable across different training samples? | Guards against a lucky split |

## Results (test set, 1,409 customers)
| Model | ROC-AUC | Precision | Recall | F1 | 5-fold CV ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression | 0.842 | 0.505 | 0.786 | 0.615 | 0.846 ± 0.012 |
| **Random Forest** ✅ | **0.846** | **0.537** | **0.794** | **0.641** | 0.848 ± 0.011 |
| XGBoost | 0.842 | 0.522 | 0.775 | 0.624 | 0.845 ± 0.011 |

*Precision/recall/F1 use a 0.5 cut-off on the class-weighted (uncalibrated) models, to compare all three like-for-like.*

### How to read this honestly
- **The three models are tied.** The gaps (≤ 0.004 AUC) are smaller than the cross-validation spread (± 0.011). Random Forest is chosen because it's highest on test ROC-AUC and F1, not because it's clearly better.
- **Recall 79%**: we catch about 4 in 5 churners.
- **Precision 54%**: about half of flagged customers really leave. That's acceptable when an offer ($50) is cheap compared with losing a customer (~$780/year).

### Confusion matrix (Random Forest, cut-off 0.5)
|  | Predicted stay | Predicted churn |
|---|---|---|
| **Actually stayed** (1,035) | 779 ✔ | 256 (false alarms) |
| **Actually churned** (374) | 77 (missed) | 297 ✔ |

Charts: [roc_curves.png](../ml/results/figures/roc_curves.png), [confusion_matrix.png](../ml/results/figures/confusion_matrix.png)

## Model selection rule
Pick the **highest test ROC-AUC**, because the business use is *ranking* customers by risk. Then **calibrate** it (next chapter), and save it as `ml/models/best_churn_model.joblib`.
