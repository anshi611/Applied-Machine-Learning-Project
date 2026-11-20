# Group 05 – Applied Machine Learning Project

## Team Name: ML Wizards

## Team Members

1. Mannat – Enrollment Number:2481053
2. Shireen – Enrollment Number: 2481137
3. Aditya Verma – Enrollment Number: 2481075
4. Subhrayan – Enrollment Number: 2481004
## Project Title

**Credit Model Benchmark: Comparative Analysis of Machine Learning Models for Credit Risk Prediction**

## Project Description

This project focuses on comparing different Machine Learning classification algorithms for credit risk prediction.

The objective is to evaluate and compare the performance of three Machine Learning models:

- Random Forest
- XGBoost
- Multi-Layer Perceptron (MLP)

The models are tested on two datasets:

1. Default of Credit Card Clients
2. German Credit (Statlog)

The project involves data loading, preprocessing, handling missing values, feature scaling, model training, evaluation and performance comparison.

The models are evaluated using the following metrics:

- Accuracy
- Precision
- Recall
- F1-Score

The results are presented through comparison tables, graphs and confusion matrices to identify the performance of different models across both datasets.

## Source Code

The complete source code is available in the Jupyter Notebook:

**ML_Wizards_Credit_Model_Benchmark.ipynb**

The notebook is implemented using Python in Google Colab and includes data preprocessing, model implementation, evaluation and visualisation.

## Project Design

The project follows these steps:

1. **Dataset Loading:** Loading the two credit risk datasets.
2. **Data Preprocessing:** Preparing the datasets for machine learning.
3. **Missing Value Handling:** Using SimpleImputer to handle missing values.
4. **Feature Transformation:** Applying StandardScaler and OneHotEncoder where required.
5. **Model Training:** Training Random Forest, XGBoost and MLP classifiers.
6. **Model Evaluation:** Evaluating models using Accuracy, Precision, Recall and F1-Score.
7. **Performance Comparison:** Comparing results across three random seeds.
8. **Visualisation:** Presenting results using graphs, tables and confusion matrices.

## Results and Screenshots

The project generates the following outputs:

- Model performance comparison tables.
- Accuracy comparison graphs.
- Precision comparison graphs.
- Recall comparison graphs.
- F1-score comparison graphs.
- Confusion matrices for each model and dataset.

### Key Results

The best-performing model based on mean F1-score was:

- **Default of Credit Card Clients:** MLP (0.4805).
- **German Credit (Statlog):** XGBoost (0.5468).

The results show that no single model performs best across every dataset. Model performance depends on the characteristics of the dataset and the evaluation metric.


**Course:** Applied Machine Learning  
**Group:** 05  
**Team:** ML Wizards
