# Processing Flow and UML-style Model View

## Experiment flowchart

```mermaid
flowchart TD
    Start([Start]) --> Load[Load public dataset]
    Load --> Clean[Remove leakage-prone or non-generalising columns]
    Clean --> Split[Stratified 80/20 split]
    Split --> Fit[Fit scaler and encoder on training data]
    Fit --> Treatment{Select treatment}
    Treatment -->|None| Baseline[Train baseline model]
    Treatment -->|SMOTE / SMOTENC| Resample[Resample training data]
    Treatment -->|Class weights| Weight[Set cost-sensitive weights]
    Treatment -->|Threshold moving| Threshold[Set Bayes threshold]
    Resample --> Train[Train Logistic Regression]
    Weight --> Train
    Baseline --> Train
    Threshold --> Score[Generate test probabilities]
    Train --> Score
    Score --> Metrics[Calculate PR-AUC and economic metrics]
    Metrics --> Repeat[Repeat for seeds 42, 7, and 2024]
    Repeat --> Compare[Compare methods and datasets]
    Compare --> End([Export tables and plots])
```

## UML-style component relationships

```mermaid
classDiagram
    class DatasetLoader {
        +load_credit_card_data()
        +load_paysim_data()
    }
    class Preprocessor {
        +fit_transform_train()
        +transform_test()
    }
    class Treatment {
        +fit_model()
        +predict_scores()
    }
    class Evaluator {
        +calculate_pr_auc()
        +calculate_cost()
        +summarise_results()
    }
    class ReportGenerator {
        +write_csv_tables()
        +plot_results()
    }
    DatasetLoader --> Preprocessor : supplies data
    Preprocessor --> Treatment : transformed features
    Treatment --> Evaluator : predictions
    Evaluator --> ReportGenerator : metrics
```

## Notebook interface design

This is a notebook-based project rather than a deployed web application. The user interface is the Jupyter/Google Colab notebook, organised into data loading, preprocessing, model training, evaluation, visualisation, and reproducibility sections.
