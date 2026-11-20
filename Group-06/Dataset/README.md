# Dataset

This project uses two public fraud-detection datasets. The original files are not committed because they are large and are distributed under their own dataset licences. The notebook downloads or reads them during execution.

## 1. ULB Credit Card Fraud Detection

- Source: [Kaggle – Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
- Licence: Open Data Commons Database Contents License (DbCL) v1.0
- Expected filename: `creditcard.csv`
- Description: Real, anonymised European credit-card transactions with a highly imbalanced fraud label.

## 2. PaySim Synthetic Financial Dataset

- Source: [Kaggle – Synthetic Financial Datasets For Fraud Detection](https://www.kaggle.com/datasets/ealaxi/paysim1)
- Licence: CC BY-SA 4.0
- Expected filename: `PS_20174392719_1491204439457_log.csv`
- Description: Synthetic mobile-money transactions generated using the PaySim simulator.

## Download and placement

1. Download both datasets from the links above.
2. Place the CSV files in the location expected by the notebook, or update the file paths in the data-loading cells.
3. Run `Source-Code/Group6_Fraud_Detection_v2.ipynb` from the beginning.

The notebook uses a stratified 10% sample of PaySim to keep the experiment reproducible and computationally manageable. Dataset sources, licences, preprocessing, and sampling details are also documented in the project report.
