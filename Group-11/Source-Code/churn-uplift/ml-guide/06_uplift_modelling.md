# 6. Uplift modelling: who will the discount actually help?

[← SHAP](05_explainability_shap.md) · Next: [Business and ROI →](07_business_and_roi.md)

Code: [`ml/simulate_treatment.py`](../ml/simulate_treatment.py), [`ml/train_uplift.py`](../ml/train_uplift.py) · Results: [`uplift_metrics.json`](../ml/results/uplift_metrics.json)

> ⚠️ **Everything in this chapter uses SIMULATED treatment data.** The Telco dataset never recorded who received a discount.

## Why churn risk isn't enough
A churn model finds who is **at risk**. But the discount only makes sense for people it **changes**:

| Type | Leaves without offer? | Offer helps? | Send discount? |
|---|---|---|---|
| 😊 Persuadable | Yes | **Yes** | ✅ |
| 😐 Sure thing | No | Not needed | ❌ wasted |
| 😠 Lost cause | Yes | No | ❌ wasted |
| 😴 Sleeping dog | No | **Makes it worse** | ❌ harmful |

**Uplift** = P(stay | offer) − P(stay | no offer): how much the offer *changes* the outcome for this customer.

## Step 1: Simulate an experiment
Because no real offer data exists, `simulate_treatment.py` **invents a fair A/B test** with written assumptions:
1. Each customer gets the offer with 50% probability (seed 2024): 3,527 treated, 3,516 control.
2. **Control** customers keep their **real** churn outcome.
3. **Treated** customers: a real churner may be *saved*, and a sleeping dog may be *pushed to leave*, at assumed rates:

| Segment (rule, first match wins) | Customers | Real churn | Assumed effect of offer |
|---|---|---|---|
| Sleeping dog: two-year contract and tenure > 48 | 1,263 | 3% | **3% of stayers leave because of it** |
| Lost cause: fiber + electronic check + bill > $90 | 712 | 49% | saves 5% of churners |
| Persuadable: month-to-month and tenure ≤ 12 | 1,842 | 49% | **saves 40%** of churners |
| Other month-to-month | 1,495 | 30% | saves 20% |
| Other contract | 1,731 | 7% | saves 5% |

Overall: churn **26.0% without the offer → 20.5% with it** (5.5 points). Chart: [sim_design.png](../ml/results/figures/sim_design.png)

## Step 2: The T-learner
"T" = **two** models:
```
model_treated  = trained only on customers who GOT the offer      → P(stay | offer)
model_control  = trained only on customers who did NOT            → P(stay | no offer)
uplift(x)      = model_treated(x) − model_control(x)
```
Both models use the same preprocessing pipeline as chapter 2.

**Choosing the base learner:** 5-fold cross-validated **Qini** on training data only:
- Logistic Regression: **0.049** ✅ chosen
- XGBoost: 0.041

## Step 3: Evaluate (test set, 1,409 customers)
**Qini curve / Qini AUC:** contact customers in order of score and track *extra* customers kept compared with random. Higher = better targeting. Because the data is simulated, we also know the **true** effect for every customer, so we can count "true customers saved".

**If we can only contact the top 20% (282 customers):**

| Ranking | Qini AUC | True customers saved | Lost causes contacted |
|---|---|---|---|
| **Churn risk (Random Forest, calibrated)** | **0.040** | **58.2** | 56 |
| T-learner (Logistic Regression) ✅ chosen | 0.028 | 50.9 | **17** |
| T-learner (XGBoost) | 0.030 | 56.0 | 21 |
| Random | 0.002 | 19.8 | 27 |
| *Best possible (oracle)* | | *94.9* | |

Charts: [qini_curves.png](../ml/results/figures/qini_curves.png), [uplift_gain.png](../ml/results/figures/uplift_gain.png), [uplift_by_decile.png](../ml/results/figures/uplift_by_decile.png)

## The honest result
**Churn-risk ranking wins.** Why?
- In our simulation the offer **only works on people who would have churned**. So a customer's true benefit ≈ churn risk × save rate. **Churn risk already contains most of the signal**, so ranking by risk is nearly the same as ranking by true uplift.
- The T-learner must estimate a **difference of two noisy models**, each trained on only about 2,800 customers. Differences are much harder to estimate than one probability.

**What uplift does well:** it contacts far fewer **lost causes** (17 vs 56), which is exactly what it's designed for.

**When uplift would win:** when the people who respond are *different* from the people at risk (e.g. many high-risk customers who ignore offers), or with much more experimental data.

## Using uplift in the app
Each customer gets an `uplift_score`. The app uses it in two ways:
- **Expected offer profit** = uplift × customer value − $50 (chapter 7)
- **"Do not contact"** only when uplift is **clearly negative** (below −0.02). Values within ±0.02 of zero are noise from subtracting two models, not real sleeping dogs.
