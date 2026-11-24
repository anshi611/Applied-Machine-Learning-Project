# 8. How the ML reaches the app

[← Business and ROI](07_business_and_roi.md) · Next: [Reproduce →](09_reproduce.md)

## Files the ML produces
| File | Made by | Used by | Contains |
|---|---|---|---|
| `ml/models/best_churn_model.joblib` | train_classical.py | backend `/predict`, business_roi.py, train_uplift.py | **Calibrated** Random Forest pipeline (preprocessing + model) |
| `ml/models/churn_model_uncalibrated.joblib` | train_classical.py | score_customers.py | Same model before calibration, for SHAP |
| `ml/models/uplift_model.joblib` | train_uplift.py | backend `/predict`, business_roi.py | `{"treated": pipeline, "control": pipeline}` |
| `ml/results/classical_metrics.json` | train_classical.py | `/metrics` → Data Scientist and Models pages | Metrics, ROC points, confusion matrix, calibration |
| `ml/results/shap_importance.json` | train_classical.py | `/summary` → top drivers | Top 15 features |
| `ml/results/uplift_metrics.json` | train_uplift.py | `/metrics` | Qini, saved-customer curves, segments |
| `ml/results/roi_results.json` | business_roi.py | `/metrics` | Test-set profit table |
| `ml/results/mydel_roi.json` | score_customers.py | `/metrics` → overview + Profit Planner | Profit table for all customers |
| `backend/data/mydel_customers.csv` | score_customers.py | every customer page | 7,043 scored customers + reasons + fake names |

## Out-of-fold scoring (why the customer scores are honest)
`score_customers.py` splits all customers into **5 folds**. Each fold is scored by models trained on the **other 4**. So no customer is ever scored by a model that saw them in training. Otherwise, scores on training customers would look unrealistically confident.

## Two ways a prediction is made
| Situation | Where the number comes from |
|---|---|
| An existing customer's page (`/customers/{id}`) | Pre-computed out-of-fold score in `mydel_customers.csv` |
| "Check customer" form and what-if simulator (`POST /predict`) | **Live**: the saved model files score the inputs in about 0.1 s |

## A live prediction, step by step
```
Browser form ─► POST /predict  {tenure: 3, Contract: "Month-to-month", InternetService: "Fiber optic",
                                PaymentMethod: "Electronic check", MonthlyCharges: 80}
                    │
                    ▼  Pydantic validates types and allowed values (bad input → 422 error)
              model_service.predict_one()
                    │
                    ├─► best_churn_model.predict_proba(X)          → churn probability (calibrated)
                    ├─► uplift.treated − uplift.control            → uplift score
                    ├─► MonthlyCharges × 12                         → customer value
                    └─► decide(churn, uplift, expected profit)      → action + reason
                    │
                    ▼
{ churn_probability: 0.7135, uplift_score: 0.2045, customer_value: 960.0,
  expected_offer_profit: 146.36, risk_level: "High",
  recommended_action: "Send retention offer",
  reason: "Expected gain $196 is more than the $50 offer cost." }      ← real output
```

The backend loads the models **once at startup**, not on every request.

## Important: keep library versions matching
`.joblib` files are pickled scikit-learn objects. The backend must use the **same scikit-learn / XGBoost versions** that trained them (pinned in `backend/requirements.txt`), or loading can fail.
