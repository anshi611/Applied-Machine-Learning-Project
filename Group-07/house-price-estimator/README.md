# House Price Estimator with Prediction Intervals

Applied ML Lab (CSE2512P), Group 7 (Iconics), Track 4: Functional MVP.

A small web app that estimates the typical house value for a California neighbourhood and returns a 90% prediction range. The model is gradient boosting trained on the California Housing dataset, with split conformal prediction intervals. The API is built with FastAPI and the front-end is a single HTML page.

## Setup

Windows (PowerShell):

    git clone https://github.com/Aryan-Pahal/house-price-estimator.git
    cd house-price-estimator
    python -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt

macOS / Linux:

    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

## Run the app

    python -m uvicorn app.main:app --reload

Open http://127.0.0.1:8000/ for the web page, or http://127.0.0.1:8000/docs for the API docs.

## Run the tests

    python -m pytest

## Retrain the model (optional)

The trained model is included in `models/model.joblib`. To retrain it and regenerate `report/metrics.json`:

    python -m src.train

This downloads the dataset on first use (internet needed). The notebook `notebooks/modelling.ipynb` shows the full analysis with plots.

## API

`POST /predict` takes 8 numbers (MedInc, HouseAge, AveRooms, AveBedrms, Population, AveOccup, Latitude, Longitude) and returns `prediction`, `lower`, `upper`, `confidence_level` and `unit`. Prices are in units of $100,000. Out-of-range inputs return HTTP 422.

## Project structure

    app/          FastAPI backend and web page (app/static/index.html)
    src/          data cleaning, training, conformal intervals
    notebooks/    modelling notebook
    models/       trained model
    report/       metrics, figures and user-testing notes
    tests/        API tests

## Data

California Housing dataset (Pace and Barry, 1997), loaded through scikit-learn. It is public data from the 1990 census, so prices reflect 1990 values and are capped at $500,000.

## Limitations

- The interval has a constant width, so it is less precise for very cheap or very expensive areas.
- Prices are from 1990 and capped at $500,000.
- The model only covers California.

## Team

Aryan Pahal, Vidushi Sehrawat, Gautam Budhiraja. See the contribution table in the report.
