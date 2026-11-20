# System Architecture

## High-level architecture

```mermaid
flowchart LR
    A[ULB Credit Card Dataset] --> B[Data Loading]
    C[PaySim Dataset] --> B
    B --> D[Dataset Cleaning]
    D --> E[Stratified Train/Test Split]
    E --> F[Train-only Preprocessing]
    F --> G1[Baseline Logistic Regression]
    F --> G2[SMOTE / SMOTENC]
    F --> G3[Balanced Class Weights]
    F --> G4[1:50 Cost-ratio Weights]
    F --> G5[Bayes Threshold Moving]
    G1 --> H[Fraud Probability Scores]
    G2 --> H
    G3 --> H
    G4 --> H
    G5 --> H
    H --> I[PR-AUC Evaluation]
    H --> J[Precision and Recall]
    H --> K[Economic Cost Evaluation]
    I --> L[Comparison Tables and Figures]
    J --> L
    K --> L
```

## Main components

| Component | Responsibility |
|---|---|
| Data loading | Reads the ULB and PaySim public datasets. |
| Preprocessing | Scales numerical features and encodes categorical features using training data only. |
| Imbalance handling | Applies SMOTE, SMOTENC, class weights, or threshold moving. |
| Classifier | Trains Logistic Regression models. |
| Evaluation | Calculates PR-AUC, precision, recall, false positives, false negatives, and economic cost. |
| Reporting | Produces CSV result tables and comparison plots. |
