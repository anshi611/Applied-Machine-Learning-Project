# 1. The problem and the data

[← Guide home](README.md) · Next: [Preprocessing →](02_preprocessing.md)

## The business question
A phone company loses money when customers leave (**churn**). It can send a **$50 retention discount**, but not to everyone. So:

> **Which customers should get the discount?**

We split that into two ML questions:

| Question | Type of problem | Model |
|---|---|---|
| Who is likely to leave? | Binary classification (churn = 1 / 0) | Churn model (chapter 3) |
| Who will the discount actually help? | Uplift / causal effect estimation | T-learner (chapter 6) |

## The dataset
**IBM Telco Customer Churn**: public, 7,043 customers, 21 columns, one row per customer.

| Group | Columns |
|---|---|
| ID | `customerID` (not used for training) |
| Demographics | `gender`, `SeniorCitizen`, `Partner`, `Dependents` |
| Account | `tenure` (months), `Contract`, `PaperlessBilling`, `PaymentMethod`, `MonthlyCharges`, `TotalCharges` |
| Services | `PhoneService`, `MultipleLines`, `InternetService`, `OnlineSecurity`, `OnlineBackup`, `DeviceProtection`, `TechSupport`, `StreamingTV`, `StreamingMovies` |
| **Target** | `Churn` (Yes/No) |

So the model has **19 input features**, 3 numeric and 16 categorical/binary.

**Class balance:** 26.5% churn, 73.5% stay. The data is **imbalanced**. A model that always says "stays" would be 73.5% accurate and useless. That's why accuracy is never our headline metric (see chapter 3).

## What the EDA showed
Notebook: [`notebooks/01_eda.ipynb`](../notebooks/01_eda.ipynb). Charts: [`notebooks/figures/`](../notebooks/figures).

| Finding | Churn rate | Chart |
|---|---|---|
| Month-to-month vs two-year contract | **43% vs 3%** | [02_contract.png](../notebooks/figures/02_contract.png) |
| Tenure 0–6 months vs 4+ years | **53% vs 10%** | [03_tenure.png](../notebooks/figures/03_tenure.png) |
| Fiber optic vs DSL internet | **42% vs 19%** | [05_internet.png](../notebooks/figures/05_internet.png) |
| Electronic check vs automatic payment | **45% vs 15–17%** | [06_payment.png](../notebooks/figures/06_payment.png) |
| No tech support vs has tech support | **31% vs 15%** | [07_addons.png](../notebooks/figures/07_addons.png) |

**What this tells us before any modelling:** churn is mostly about **commitment** (contract, tenure) and **friction** (payment method, missing support), not about demographics. The models later confirm this (chapter 5), which is a good sanity check.

## Key words
| Word | Meaning |
|---|---|
| Churn | A customer cancelling |
| Feature | One input column (e.g. tenure) |
| Target / label | What we predict (Churn) |
| Imbalanced | One class is much rarer than the other |
| EDA | Exploratory data analysis: charts and counts before modelling |
