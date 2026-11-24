# 2. Cleaning and preprocessing

[← Problem and data](01_problem_and_data.md) · Next: [Churn models →](03_churn_models.md)

Code: [`ml/preprocess.py`](../ml/preprocess.py)

The work is split into **two separate steps on purpose**.

## Step 1: Cleaning (`clean_data`), done once and saved
Fixes problems in the raw file. The output is still human-readable.

| Problem | Fix | Why it's correct |
|---|---|---|
| `TotalCharges` is stored as text, with **11 blanks** | Convert to a number; blanks → **0** | All 11 blanks are new customers (tenure = 0) who haven't been billed yet. 0 is the true value, not "missing" |
| "No internet service" / "No phone service" in add-on columns | Merge into **"No"** | `InternetService` / `PhoneService` already record whether the base service exists. Merging removes duplicated information |
| `Churn` is "Yes"/"No" | Convert to **1 / 0** | Models need numbers |

Output: `data/processed/telco_clean.csv`

## Step 2: Encoding and scaling (`build_preprocessor`), inside every model
A scikit-learn `ColumnTransformer`:

| Column type | Columns | Transformation |
|---|---|---|
| Numeric | tenure, MonthlyCharges, TotalCharges | `StandardScaler`: mean 0, standard deviation 1 |
| Categorical | 15 text columns (Contract, PaymentMethod…) | `OneHotEncoder`: one 0/1 column per category (`drop="if_binary"` for Yes/No columns) |
| Already 0/1 | SeniorCitizen | Passed through unchanged |

`handle_unknown="ignore"` means a category never seen in training (e.g. a typo from the web form) becomes all zeros instead of crashing the API.

## Why keep step 2 separate? Data leakage
The scaler learns a **mean and standard deviation**. If we scaled the whole dataset *before* splitting, the test customers' values would influence the scaler, so the model would get a sneak peek at the test set. That is **data leakage**, and it makes results look better than they really are.

So the preprocessor sits **inside a scikit-learn `Pipeline`** together with the model:

```
Pipeline = [ preprocess (fit on TRAIN only) ] → [ model ]
```

- During `fit`, the scaler and encoder learn only from training rows.
- During cross-validation, they are re-fitted inside every fold.
- The saved `.joblib` file contains both, so the backend applies **exactly** the same transformation to new customers.

## The train/test split (`split_data`)
- **80% train (5,634) / 20% test (1,409)**
- **Stratified** on Churn: both parts keep the 26.5% churn rate.
- **Fixed seed (42)**: every script gets the *same* test customers, so all chapters compare models on identical data.

The test set is like an exam the model has never seen. It's used **only** for final evaluation, never for choosing settings.
