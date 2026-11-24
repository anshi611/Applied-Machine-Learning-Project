# 7. Business decisions and ROI

[← Uplift](06_uplift_modelling.md) · Next: [ML in the app →](08_ml_in_the_app.md)

Code: [`ml/business_roi.py`](../ml/business_roi.py), `decide()` in [`backend/app/model_service.py`](../backend/app/model_service.py) · Settings: [`params.yaml`](../params.yaml)

## Assumptions (all in `params.yaml`)
| Setting | Value | Meaning |
|---|---|---|
| `offer_cost` | $50 | Paid for every customer contacted |
| `clv_months` | 12 | Value of keeping a customer = monthly bill × 12 (≈ $780 on average) |
| `low_risk_threshold` | 0.30 | Churn below 30% → "no action needed" |
| `backfire_margin` | 0.02 | Uplift below −0.02 → "do not contact" |
| High risk (in code) | 0.60 | Churn ≥ 60% → "High risk" |

Change a value and re-run the scripts. Nothing is hard-coded elsewhere.

## Per-customer decision rule
Checked in order; the first match wins:

```
1. uplift < −0.02                  → Do not contact        (offer predicted to backfire)
2. churn probability < 30%         → No action needed      (will probably stay anyway)
3. uplift × value − $50 > 0        → Send retention offer  (discount pays for itself)
4. otherwise                       → Try non-discount retention (at risk, discount won't pay)
```

Result across all 7,043 customers (calibrated model):

| Action | Customers |
|---|---|
| No action needed | 3,460 |
| Send retention offer | 2,269 |
| Do not contact | 1,002 |
| Try non-discount retention | 312 |

## Campaign profit
For each ranking (churn risk, uplift, random) and each campaign size (top 10%, 20%, … 100%):

```
cost   = customers contacted × $50
value  = Σ (true simulated effect × customer value)   over the contacted customers
profit = value − cost          ROI = profit ÷ cost
```

**Test set (1,409 customers):**

| Contact top | Churn risk | Uplift | Random |
|---|---|---|---|
| 10% | $25,486 | $17,187 | $1,623 |
| **20%** | **$37,264** (ROI 264%) | $28,476 | $2,383 |
| 30% | $40,705 | $37,010 | $1,844 |
| **40%** | **$42,459** ← peak | $41,369 | $2,967 |
| 60% | $33,957 | $33,036 | $1,237 |
| 100% | $1,168 | $1,168 | $1,168 |

**All 7,043 customers** (what the app's Profit Planner shows): churn risk earns **$180k at 20%** and peaks at **$207k at 40%**; uplift peaks at $183k; random never exceeds about $10k.

## Why profit falls after 40%
After the top 40%, each extra contact goes to someone who would **stay anyway** (pure $50 cost) or a **sleeping dog** (negative value). Contacting everyone earns almost nothing.

## Recommendation
1. Target by **churn risk** first.
2. Contact about the **top 40%**.
3. Use uplift as a **filter**: skip customers with clearly negative uplift.
4. Run a **real A/B test** before trusting uplift numbers, because the effects here are simulated.
