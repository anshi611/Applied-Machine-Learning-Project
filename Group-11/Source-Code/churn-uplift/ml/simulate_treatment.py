"""
!!!  SIMULATED DATA  !!!
The IBM Telco dataset has NO real "received retention offer" column.
This file INVENTS one so we can demonstrate uplift modelling. Every effect
size below is an ASSUMPTION chosen by us. These are not real campaign results.

How the simulation works
------------------------
1. Random assignment (like a fair A/B test):
   each customer gets the offer (treatment = 1) with probability 50%.

2. Customers who did NOT get the offer (control) keep their REAL churn outcome.

3. Customers who DID get the offer: their outcome may change, depending on
   which (assumed) segment they belong to:
     - a real churner may be "saved" (churn 1 -> 0) with probability SAVE_RATE
     - for "sleeping dogs", a real stayer may churn BECAUSE they were
       contacted (0 -> 1) with probability BACKFIRE_RATE

Segments (checked in this order; first match wins):
    sleeping_dog  : Two-year contract AND tenure > 48 months
    lost_cause    : Fiber optic AND Electronic check AND MonthlyCharges > 90
    persuadable   : Month-to-month AND tenure <= 12 months
    m2m_other     : any other Month-to-month customer
    contract      : any other One-/Two-year contract customer

Run from the project root to print a summary of the simulated design:
    python ml/simulate_treatment.py
"""
import numpy as np
import pandas as pd

SIM_SEED = 2024          # fixed seed -> same simulated data every run
TREATMENT_SHARE = 0.5    # 50% of customers receive the offer

# ---- ASSUMED effect sizes (edit here to change the design) ----
SAVE_RATE = {            # share of real churners the offer keeps
    "sleeping_dog": 0.00,
    "lost_cause":   0.05,
    "persuadable":  0.40,
    "m2m_other":    0.20,
    "contract":     0.05,
}
BACKFIRE_RATE = {        # share of real stayers the offer pushes to churn
    "sleeping_dog": 0.03,
}


def assign_segment(df: pd.DataFrame) -> pd.Series:
    """Label every customer with one (assumed) response segment."""
    conditions = [
        (df["Contract"] == "Two year") & (df["tenure"] > 48),
        (df["InternetService"] == "Fiber optic")
        & (df["PaymentMethod"] == "Electronic check")
        & (df["MonthlyCharges"] > 90),
        (df["Contract"] == "Month-to-month") & (df["tenure"] <= 12),
        df["Contract"] == "Month-to-month",
    ]
    choices = ["sleeping_dog", "lost_cause", "persuadable", "m2m_other"]
    return pd.Series(np.select(conditions, choices, default="contract"), index=df.index)


def simulate_treatment(df: pd.DataFrame, seed: int = SIM_SEED) -> pd.DataFrame:
    """
    Return a copy of df with SIMULATED columns added:
      segment        assumed response segment
      treatment      1 = received retention offer (random, 50%)
      churn_sim      churn outcome after applying the offer's assumed effect
      save_rate / backfire_rate   the assumed effect for that customer
    The original 'Churn' column is kept unchanged (= outcome without offer).
    """
    rng = np.random.default_rng(seed)
    out = df.copy()
    out["segment"] = assign_segment(out)
    out["save_rate"] = out["segment"].map(SAVE_RATE).fillna(0.0)
    out["backfire_rate"] = out["segment"].map(BACKFIRE_RATE).fillna(0.0)

    out["treatment"] = (rng.random(len(out)) < TREATMENT_SHARE).astype(int)

    u = rng.random(len(out))  # one random draw per customer
    saved = (out["treatment"] == 1) & (out["Churn"] == 1) & (u < out["save_rate"])
    backfired = (out["treatment"] == 1) & (out["Churn"] == 0) & (u < out["backfire_rate"])

    out["churn_sim"] = out["Churn"]
    out.loc[saved, "churn_sim"] = 0
    out.loc[backfired, "churn_sim"] = 1

    # GROUND TRUTH (only possible because this is a simulation):
    # expected number of churners saved if we contact this customer.
    #   real churner -> saved with probability save_rate      (+)
    #   real stayer  -> pushed to churn with backfire_rate    (-)
    # Used ONLY to evaluate rankings, never as a model input.
    out["true_effect"] = out["Churn"] * out["save_rate"] - (1 - out["Churn"]) * out["backfire_rate"]
    return out


def true_uplift(base_churn_prob: pd.Series, save_rate: pd.Series, backfire_rate: pd.Series) -> pd.Series:
    """
    Expected reduction in churn probability if we contact the customer
    (positive = offer helps). Known only because WE designed the simulation:
        uplift = P(churn) * save_rate  -  P(stay) * backfire_rate
    """
    return base_churn_prob * save_rate - (1 - base_churn_prob) * backfire_rate


if __name__ == "__main__":
    from preprocess import load_clean

    sim = simulate_treatment(load_clean())
    print("=== SIMULATED treatment design (assumptions, not real data) ===\n")
    print(f"Treated: {sim.treatment.sum()} ({sim.treatment.mean():.1%})   "
          f"Control: {(1 - sim.treatment).sum()}\n")

    g = sim.groupby("segment")
    table = pd.DataFrame({
        "customers": g.size(),
        "share": g.size() / len(sim),
        "real_churn_rate": g["Churn"].mean(),
        "assumed_save_rate": g["save_rate"].first(),
        "assumed_backfire": g["backfire_rate"].first(),
        "churn_control": sim[sim.treatment == 0].groupby("segment")["churn_sim"].mean(),
        "churn_treated": sim[sim.treatment == 1].groupby("segment")["churn_sim"].mean(),
    })
    table["observed_uplift"] = table["churn_control"] - table["churn_treated"]
    order = ["persuadable", "m2m_other", "lost_cause", "contract", "sleeping_dog"]
    print(table.loc[order].round(3).to_string(), "\n")

    ctrl = sim.loc[sim.treatment == 0, "churn_sim"].mean()
    trt = sim.loc[sim.treatment == 1, "churn_sim"].mean()
    print(f"Overall churn  control={ctrl:.3f}  treated={trt:.3f}  "
          f"-> average offer effect = {ctrl - trt:.3f} ({(ctrl - trt) * 100:.1f} percentage points)")
