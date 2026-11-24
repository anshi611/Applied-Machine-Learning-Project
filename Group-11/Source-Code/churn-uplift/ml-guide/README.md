# ML Guide: the machine-learning side of myDel, explained

This folder explains **everything the ML part of the project does, why, and what it found**. It's written so you can understand it without reading code first. Every chapter links to the real script and chart.

> The code lives in [`../ml/`](../ml). This folder only *explains* it. Nothing here needs to run.

## Read in this order

| # | Chapter | What you'll understand |
|---|---|---|
| 1 | [The problem and the data](01_problem_and_data.md) | What we predict, the dataset, what the EDA showed |
| 2 | [Cleaning and preprocessing](02_preprocessing.md) | How raw data becomes model input, and how we avoid leakage |
| 3 | [Churn models](03_churn_models.md) | Logistic Regression vs Random Forest vs XGBoost, metrics, results |
| 4 | [Calibration](04_calibration.md) | Why the raw probabilities were wrong and how we fixed them |
| 5 | [Explaining predictions (SHAP)](05_explainability_shap.md) | Why the model thinks a customer will leave |
| 6 | [Uplift modelling](06_uplift_modelling.md) | Who will *respond* to a discount, the simulation, the T-learner |
| 7 | [Business decisions and ROI](07_business_and_roi.md) | Turning scores into actions and profit |
| 8 | [How the ML reaches the app](08_ml_in_the_app.md) | Model files, scoring, the API |
| 9 | [Reproduce everything](09_reproduce.md) | Commands, run order, what each file produces |
| 10 | [Limitations and viva questions](10_limitations_and_viva.md) | Honest weaknesses and likely examiner questions |

## The whole pipeline on one page

```
 IBM Telco CSV (7,043 customers, 21 columns)
        │
        ▼
 [1] download_data.py ──► data/raw/telco_churn.csv
        │
        ▼
 [2] preprocess.py ─────► data/processed/telco_clean.csv      (clean: types, blanks, Yes/No → 1/0)
        │
        ├──────────────────────────────────────────────┐
        ▼                                              ▼
 [3] train_classical.py                        [4] simulate_treatment.py
     LR / RF / XGBoost, pick best by ROC-AUC         invents a 50/50 "discount" experiment
     calibrate the winner (Platt scaling)            (SIMULATED: no real offer data exists)
     SHAP explanations                                      │
        │                                                   ▼
        │                                      [5] train_uplift.py
        │                                          T-learner: P(stay | offer) − P(stay | no offer)
        │                                                   │
        └──────────────────────┬────────────────────────────┘
                               ▼
                [6] business_roi.py        profit of each targeting strategy (test set)
                               │
                               ▼
                [7] score_customers.py     scores all 7,043 customers (out-of-fold)
                               │           + plain-English reasons + campaign profit table
                               ▼
              backend/data/mydel_customers.csv  +  ml/models/*.joblib  +  ml/results/*.json
                               │
                               ▼
                     FastAPI backend  ──►  React website
```

## The five facts to remember

1. **Churn model:** Random Forest, **ROC-AUC 0.846**. It ranks a leaver above a stayer 85% of the time. All three models were statistically tied.
2. **Calibrated probabilities:** after calibration the model predicts **26.7% churn on average vs 26.5% actual**, so "chance of staying" on screen can be trusted.
3. **Top drivers:** month-to-month contract, fiber internet, short tenure, electronic-check payment, high bills.
4. **Uplift (simulated):** the T-learner avoids "lost causes" well, but **churn-risk ranking earned more profit** in our simulation.
5. **Business:** profit peaks at **contacting about 40%** of customers. Contacting more loses money.

## Charts in one place

| Chart | File |
|---|---|
| ROC curves (3 models) | [roc_curves.png](../ml/results/figures/roc_curves.png) |
| Confusion matrix | [confusion_matrix.png](../ml/results/figures/confusion_matrix.png) |
| Calibration before/after | [calibration_curve.png](../ml/results/figures/calibration_curve.png) |
| SHAP importance | [shap_bar.png](../ml/results/figures/shap_bar.png), [shap_beeswarm.png](../ml/results/figures/shap_beeswarm.png) |
| Simulated experiment design | [sim_design.png](../ml/results/figures/sim_design.png) |
| Qini curves | [qini_curves.png](../ml/results/figures/qini_curves.png) |
| Customers saved vs % contacted | [uplift_gain.png](../ml/results/figures/uplift_gain.png) |
| Uplift by decile | [uplift_by_decile.png](../ml/results/figures/uplift_by_decile.png) |
| EDA charts | [notebooks/figures/](../notebooks/figures) |
