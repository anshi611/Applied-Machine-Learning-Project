# 9. Reproduce everything

[← ML in the app](08_ml_in_the_app.md) · Next: [Limitations and viva →](10_limitations_and_viva.md)

Run these from the **project root** (`churn-uplift/`) with the virtual environment active (`venv\Scripts\activate`).

## Run order
| Step | Command | Time | Produces |
|---|---|---|---|
| 1 | `python ml/download_data.py` | seconds | `data/raw/telco_churn.csv` |
| 2 | `python ml/preprocess.py` | seconds | `data/processed/telco_clean.csv` |
| 3 | `python ml/train_classical.py` | ~1–2 min | churn models, calibration, SHAP, ROC/confusion/calibration charts |
| 4 | `python ml/simulate_treatment.py` | seconds | *(prints the simulated design only)* |
| 5 | `python ml/plot_simulation.py` | seconds | `sim_design.png` |
| 6 | `python ml/train_uplift.py` | ~1 min | uplift model, Qini / gain / decile charts |
| 7 | `python ml/business_roi.py` | seconds | test-set profit table |
| 8 | `python ml/score_customers.py` | ~3–5 min | `backend/data/mydel_customers.csv`, `mydel_roi.json` |
| 9 | `pytest backend/tests -q` | seconds | checks the API still works with the new models |

**Order matters:** step 6 and 7 load the model from step 3; step 8 needs steps 3 and 6. Restart the backend after retraining so it loads the new files.

## Reproducibility
| Source of randomness | Fixed by |
|---|---|
| Train/test split, models, CV folds | `RANDOM_STATE = 42` in `preprocess.py` |
| Who "gets the offer" in the simulation | `SIM_SEED = 2024` in `simulate_treatment.py` |
| Fake customer names | seed 42 in `score_customers.py` |
| Business assumptions | `params.yaml` |

Running the steps again gives the same numbers.

## Where to change things
| I want to… | Edit |
|---|---|
| Change offer cost, customer value, campaign sizes, decision thresholds | `params.yaml` |
| Change the simulated effect sizes or segments | `SAVE_RATE`, `BACKFIRE_RATE`, `assign_segment()` in `simulate_treatment.py` |
| Change model settings | `make_models()` in `train_classical.py`, `base_models()` in `train_uplift.py` |
| Change calibration method | `CALIBRATION` in `train_classical.py` (and the matching line in `score_customers.py`) |
