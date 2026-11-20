# Cost-Sensitive Learning vs Resampling for Fraud Detection

## Project overview

This project benchmarks resampling and cost-sensitive learning methods for fraud detection using Logistic Regression on the ULB Credit Card Fraud and PaySim datasets.

The methods compared are a baseline model, SMOTE, SMOTENC, balanced class weights, 1:50 cost-ratio class weights, and Bayes-optimal threshold moving. Performance is evaluated using PR-AUC and an economic cost model of ₹5,000 per missed fraud and ₹100 per false alarm.

## Objectives

- Compare resampling and cost-sensitive methods under one leakage-safe protocol.
- Measure ranking quality with PR-AUC on highly imbalanced data.
- Compare business impact using economic fraud-detection cost.
- Reproduce results across random seeds and public datasets.

## Team members

| Name | Enrollment number |
|---|---|
| Pulkit Sharma | 2481135 |
| Rajan Kumar | 2481126 |
| Reyaan Malik | 2481100 |
| Jasnoor Kaur | 2481009 |
| Hiral | 2481102 |

Team: Chole Bhature  
Course: Applied Machine Learning  
Track: Reproducibility / Benchmark (Topic A)  
Institution: IILM University, Gurugram

## Technologies used

Python, Jupyter Notebook, Google Colab, pandas, NumPy, scikit-learn, imbalanced-learn, Matplotlib, seaborn, and KaggleHub.

## Folder structure

```text
Group-06/
├── README.md
├── Source-Code/
│   ├── Group6_Fraud_Detection_v2.ipynb
│   └── requirements.txt
├── Project-Design/
├── Dataset/
├── Documentation/
│   └── Group6_Chole_Bhature_AML_Report.docx
└── Screenshots/
```

## Datasets

The datasets are not included because of size and licensing considerations. Download them from:

- [ULB Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
- [PaySim Synthetic Financial Dataset](https://www.kaggle.com/datasets/ealaxi/paysim1)

The notebook includes dataset download instructions and expects `creditcard.csv` and `PS_20174392719_1491204439457_log.csv` when running locally.

## Installation and execution

```bash
pip install -r Source-Code/requirements.txt
```

Open `Source-Code/Group6_Fraud_Detection_v2.ipynb` in Jupyter or Google Colab and run all cells. The notebook generates the result tables and plots used in the report.

## Reproducibility

The main seed is 42. Robustness checks use seeds 7 and 2024. The full experiment takes approximately two minutes after the datasets are available.
