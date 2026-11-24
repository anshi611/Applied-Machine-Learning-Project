# 5. Explaining predictions with SHAP

[← Calibration](04_calibration.md) · Next: [Uplift →](06_uplift_modelling.md)

Code: `shap_analysis()` in [`train_classical.py`](../ml/train_classical.py), and the reasons step in [`score_customers.py`](../ml/score_customers.py)

## What SHAP does
For one customer, SHAP splits the prediction into **contributions from each feature**:

```
prediction  =  average prediction  +  contribution(contract)  +  contribution(tenure)  +  …
```

A positive contribution pushes towards **churn**; a negative one pushes towards **staying**. For tree models, `TreeExplainer` computes these exactly and fast.

## Global importance (whole test set)
Average size of each feature's contribution (mean |SHAP|), Random Forest:

| Rank | Feature | Effect |
|---|---|---|
| 1 | Contract = Month-to-month | ↑ increases churn |
| 2 | InternetService = Fiber optic | ↑ increases churn |
| 3 | tenure | ↓ longer tenure reduces churn |
| 4 | Contract = Two year | ↓ reduces churn |
| 5 | TotalCharges | ↓ reduces churn (long-standing customers) |
| 6 | PaymentMethod = Electronic check | ↑ increases churn |
| 7 | MonthlyCharges | ↑ increases churn |
| 8 | InternetService = No | ↓ reduces churn |
| 9 | OnlineSecurity = Yes | ↓ reduces churn |
| 10 | PaperlessBilling = Yes | ↑ increases churn |

Charts: [shap_bar.png](../ml/results/figures/shap_bar.png) (importance), [shap_beeswarm.png](../ml/results/figures/shap_beeswarm.png) (each dot is a customer; red = high feature value, position = push towards churn).

**Sanity check:** these are the same drivers the EDA found (chapter 1). The model learned real patterns, not noise.

## Per-customer reasons (what the app shows)
`score_customers.py` turns SHAP into plain English for every customer:
1. Compute SHAP for all 7,043 customers.
2. **Add up the one-hot pieces** so each original column gets one number (e.g. all `Contract_*` columns → "Contract").
3. Top 3 positive contributions → **reasons to leave**; top 3 negative → **reasons to stay** (ignoring tiny ones < 0.005, and ignoring gender).
4. Describe each in words, e.g. *"Month-to-month contract (can leave any time)"*, *"New customer (only 4 months with myDel)"*.

These appear on each customer's page as "risk factors" and "loyalty anchors".

## Caution for the viva
SHAP explains **what the model uses**, not what **causes** churn. "Fiber customers churn more" could be because fiber is pricier, or because of service quality. SHAP can't tell which. To know whether *changing* something reduces churn you need an experiment, which is the idea behind uplift modelling (next chapter).
