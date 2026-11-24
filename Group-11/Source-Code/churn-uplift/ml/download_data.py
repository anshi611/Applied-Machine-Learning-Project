"""
Download the IBM Telco Customer Churn dataset into data/raw/.

Why a script instead of committing the CSV?
  - Raw data stays out of git (project rule).
  - Anyone can rebuild the data folder with one command.

Run from the project root:
    python ml/download_data.py
"""
from pathlib import Path
import urllib.request

# Public copy of the dataset published by IBM on GitHub.
URL = (
    "https://raw.githubusercontent.com/IBM/telco-customer-churn-on-icp4d/"
    "master/data/Telco-Customer-Churn.csv"
)

# Build paths relative to this file so the script works from any folder.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = PROJECT_ROOT / "data" / "raw" / "telco_churn.csv"


def main() -> None:
    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    if RAW_PATH.exists():
        print(f"Already downloaded: {RAW_PATH}")
        return
    print(f"Downloading from {URL} ...")
    urllib.request.urlretrieve(URL, RAW_PATH)
    print(f"Saved to {RAW_PATH} ({RAW_PATH.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
