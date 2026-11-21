from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

SAMPLE = {
    "MedInc": 3.5,
    "HouseAge": 20,
    "AveRooms": 5.0,
    "AveBedrms": 1.0,
    "Population": 1200,
    "AveOccup": 3.0,
    "Latitude": 34.0,
    "Longitude": -118.0,
}


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_predict_ok():
    r = client.post("/predict", json=SAMPLE)
    assert r.status_code == 200
    body = r.json()
    assert body["lower"] <= body["prediction"] <= body["upper"]


def test_predict_missing_field():
    bad = {k: v for k, v in SAMPLE.items() if k != "MedInc"}
    assert client.post("/predict", json=bad).status_code == 422


def test_latitude_out_of_range_rejected():
    bad = {**SAMPLE, "Latitude": 10}
    assert client.post("/predict", json=bad).status_code == 422


def test_negative_income_rejected():
    bad = {**SAMPLE, "MedInc": -1}
    assert client.post("/predict", json=bad).status_code == 422


def test_non_numeric_value_rejected():
    bad = {**SAMPLE, "MedInc": "abc"}
    assert client.post("/predict", json=bad).status_code == 422


def test_response_fields_and_interval():
    body = client.post("/predict", json=SAMPLE).json()
    assert body["confidence_level"] == 0.9
    assert body["unit"] == "$100,000"
    assert body["lower"] >= 0


def test_index_page_served():
    r = client.get("/")
    assert r.status_code == 200
    assert "House Price Estimator" in r.text
