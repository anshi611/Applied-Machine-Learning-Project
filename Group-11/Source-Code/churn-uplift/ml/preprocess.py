"""
Data cleaning + preprocessing for the Telco churn dataset.

Two separate steps:
  1. clean_data()          -> fixes the raw data (types, missing values, target).
                              Output is still human-readable (e.g. "Month-to-month").
  2. build_preprocessor()  -> scikit-learn transformer that ENCODES categories
                              (one-hot) and SCALES numbers (standardisation).

Why keep step 2 separate?
  The scaler must learn its mean/std from the TRAINING data only. If we scaled
  the whole dataset before splitting, information from the test set would
  "leak" into training. Putting the scaler inside a scikit-learn Pipeline
  (Phase 3) avoids this and lets the backend reuse the exact same steps.

Run from the project root to create data/processed/telco_clean.csv:
    python ml/preprocess.py
"""
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = PROJECT_ROOT / "data" / "raw" / "telco_churn.csv"
CLEAN_PATH = PROJECT_ROOT / "data" / "processed" / "telco_clean.csv"

ID_COL = "customerID"
TARGET = "Churn"

# Numeric columns -> get scaled.
NUMERIC_COLS = ["tenure", "MonthlyCharges", "TotalCharges"]

# Already 0/1 -> used as-is (no encoding or scaling needed).
BINARY_NUMERIC_COLS = ["SeniorCitizen"]

# Text categories -> get one-hot encoded.
CATEGORICAL_COLS = [
    "gender", "Partner", "Dependents", "PhoneService", "MultipleLines",
    "InternetService", "OnlineSecurity", "OnlineBackup", "DeviceProtection",
    "TechSupport", "StreamingTV", "StreamingMovies", "Contract",
    "PaperlessBilling", "PaymentMethod",
]

FEATURE_COLS = NUMERIC_COLS + BINARY_NUMERIC_COLS + CATEGORICAL_COLS


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Return a cleaned copy of the raw Telco data."""
    df = df.copy()

    # 1) TotalCharges is stored as text and has 11 blank values.
    #    All 11 blanks are brand-new customers (tenure = 0) who have not been
    #    billed yet, so the correct value is 0 (not "missing").
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce").fillna(0.0)

    # 2) "No internet service" / "No phone service" mean the same as "No" for
    #    the add-on columns. The InternetService / PhoneService columns already
    #    record whether the customer has the base service, so merging these
    #    removes duplicate information and gives fewer one-hot columns.
    df = df.replace({"No internet service": "No", "No phone service": "No"})

    # 3) Target: "Yes"/"No" -> 1/0 so models can use it.
    if TARGET in df.columns:
        df[TARGET] = (df[TARGET] == "Yes").astype(int)

    return df


def build_preprocessor() -> ColumnTransformer:
    """
    Encoding + scaling step, to be placed at the start of a model Pipeline.
      - numbers      -> StandardScaler (mean 0, std 1)
      - categories   -> OneHotEncoder (one 0/1 column per category)
      - 0/1 columns  -> passed through unchanged
    handle_unknown="ignore" means an unseen category at prediction time
    (e.g. a typo from the web form) becomes all zeros instead of crashing.
    """
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_COLS),
            ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), CATEGORICAL_COLS),
            ("bin", "passthrough", BINARY_NUMERIC_COLS),
        ]
    )


def load_clean() -> pd.DataFrame:
    """Load the cleaned CSV (create it first with `python ml/preprocess.py`)."""
    return pd.read_csv(CLEAN_PATH)


RANDOM_STATE = 42   # fixed seed -> same split / same results every run
TEST_SIZE = 0.20    # 80% train, 20% test


def split_data(df: pd.DataFrame):
    """
    80/20 train/test split, STRATIFIED on Churn so both parts keep the
    same churn rate (about 26.5%). Every phase uses this function, so all
    models are evaluated on exactly the same test customers.
    """
    return train_test_split(
        df, test_size=TEST_SIZE, stratify=df[TARGET], random_state=RANDOM_STATE
    )


def main() -> None:
    raw = pd.read_csv(RAW_PATH)
    clean = clean_data(raw)
    CLEAN_PATH.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(CLEAN_PATH, index=False)
    print(f"Raw shape:   {raw.shape}")
    print(f"Clean shape: {clean.shape}")
    print(f"Missing values after cleaning: {int(clean.isna().sum().sum())}")
    print(f"Churn rate: {clean[TARGET].mean():.1%}")
    print(f"Saved to {CLEAN_PATH}")


if __name__ == "__main__":
    main()
