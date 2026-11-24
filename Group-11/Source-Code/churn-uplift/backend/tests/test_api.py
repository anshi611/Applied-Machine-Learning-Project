"""
Basic API tests. Run from the project root:
    pytest backend/tests -v
"""
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

# A typical high-risk customer: new, month-to-month, fiber, electronic check
RISKY = {
    "tenure": 2, "Contract": "Month-to-month", "InternetService": "Fiber optic",
    "PaymentMethod": "Electronic check", "MonthlyCharges": 85.0,
}
# A typical safe customer: long tenure, two-year contract, auto-pay
SAFE = {
    "tenure": 60, "Contract": "Two year", "InternetService": "DSL",
    "PaymentMethod": "Credit card (automatic)", "MonthlyCharges": 55.0,
    "OnlineSecurity": "Yes", "TechSupport": "Yes", "Partner": "Yes",
}


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["customers"] == 7043


def test_predict_returns_all_fields():
    r = client.post("/predict", json=RISKY)
    assert r.status_code == 200
    body = r.json()
    for key in ["churn_probability", "uplift_score", "recommended_action", "reason", "risk_level"]:
        assert key in body
    assert 0 <= body["churn_probability"] <= 1


def test_risky_customer_scores_higher_than_safe():
    risky = client.post("/predict", json=RISKY).json()["churn_probability"]
    safe = client.post("/predict", json=SAFE).json()["churn_probability"]
    assert risky > 0.5 > safe


def test_predict_rejects_bad_input():
    r = client.post("/predict", json={"Contract": "Ten year"})  # not an allowed value
    assert r.status_code == 422


def test_customers_sorted_and_paginated():
    r = client.get("/customers", params={"sort_by": "churn_prob", "limit": 10})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 10
    probs = [c["churn_prob"] for c in items]
    assert probs == sorted(probs, reverse=True)


def test_customers_filter_and_search():
    high = client.get("/customers", params={"risk": "High", "limit": 50}).json()
    assert all(c["risk_level"] == "High" for c in high["items"])
    first = high["items"][0]
    found = client.get("/customers", params={"q": first["customerID"]}).json()
    assert found["total"] == 1


def test_customer_detail_and_404():
    cid = client.get("/customers", params={"limit": 1}).json()["items"][0]["customerID"]
    r = client.get(f"/customers/{cid}")
    assert r.status_code == 200
    body = r.json()
    assert body["customerID"] == cid and body["name"]
    assert 0 <= body["chance_of_staying"] <= 1
    assert isinstance(body["reasons_leave"], list)
    assert client.get("/customers/NOT-A-REAL-ID").status_code == 404


def test_metrics_and_summary():
    m = client.get("/metrics").json()
    assert {"classical", "uplift", "roi", "mydel_roi"} <= m.keys()
    assert m["uplift"]["simulated"] is True
    s = client.get("/summary").json()
    assert 0.65 < s["retention_rate"] < 0.8
    assert sum(s["risk_counts"].values()) == s["n_customers"]
