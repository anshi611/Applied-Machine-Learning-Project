"""Load and clean the California Housing data."""
from sklearn.datasets import fetch_california_housing

PRICE_CAP = 5.0          # target is capped at $500k in this dataset
MAX_AVE_ROOMS = 20
MAX_AVE_BEDRMS = 5
MAX_AVE_OCCUP = 10
MAX_POPULATION = 10_000


def load_clean_data(verbose=True):
    """Return (X, y) after removing capped prices and implausible rows."""
    data = fetch_california_housing(as_frame=True)
    X, y = data.data, data.target
    n0 = len(X)

    X = X.drop_duplicates()
    y = y.loc[X.index]
    n_dup = n0 - len(X)

    keep = (
        (y < PRICE_CAP)
        & (X["AveRooms"] <= MAX_AVE_ROOMS)
        & (X["AveBedrms"] <= MAX_AVE_BEDRMS)
        & (X["AveOccup"] <= MAX_AVE_OCCUP)
        & (X["Population"] <= MAX_POPULATION)
    )
    X, y = X[keep], y[keep]

    if verbose:
        print(f"Rows: {n0} -> {len(X)} (duplicates removed: {n_dup}, "
              f"capped/outlier rows removed: {n0 - n_dup - len(X)})")
    return X, y
