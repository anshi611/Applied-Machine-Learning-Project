# Dataset: IBM Telco Customer Churn

- **Source:** IBM's public sample dataset, https://github.com/IBM/telco-customer-churn-on-icp4d (`data/Telco-Customer-Churn.csv`)
- **Size:** 7,043 customers × 21 columns. Churn rate 26.5%.
- **One row = one customer:** demographics (gender, SeniorCitizen, Partner, Dependents), account details (tenure, Contract, PaperlessBilling, PaymentMethod, MonthlyCharges, TotalCharges), services (PhoneService, MultipleLines, InternetService and add-ons) and the target `Churn`.

| File | Description |
|---|---|
| `telco_churn_raw.csv` | The original file, unchanged (downloaded by `ml/download_data.py`) |
| `telco_churn_clean.csv` | After `ml/preprocess.py`: `TotalCharges` converted to a number (11 blanks for tenure-0 customers set to 0), "No internet/phone service" merged into "No", `Churn` mapped to 1/0 |

Encoding and scaling are **not** applied in these files. They happen inside each model's pipeline, fitted on training data only, to avoid data leakage.

The retention-offer data used for uplift modelling is **simulated** at run time by `ml/simulate_treatment.py`. It is not part of the original dataset.
