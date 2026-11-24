"""Tests for the database endpoints (contact log + prediction history)."""
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def _a_customer_id():
    return client.get("/customers", params={"limit": 1}).json()["items"][0]["customerID"]


def test_contact_create_list_update_delete():
    cid = _a_customer_id()
    r = client.post(f"/customers/{cid}/contacts",
                    json={"channel": "Phone call", "outcome": "Pending", "note": "Left voicemail"})
    assert r.status_code == 201
    contact = r.json()
    assert contact["customer_id"] == cid and contact["id"] > 0

    history = client.get(f"/customers/{cid}/contacts").json()
    assert history[0]["id"] == contact["id"]

    r = client.patch(f"/contacts/{contact['id']}", json={"outcome": "Accepted offer"})
    assert r.status_code == 200 and r.json()["outcome"] == "Accepted offer"
    assert r.json()["note"] == "Left voicemail"  # untouched fields are kept

    stats = client.get("/contacts/stats").json()
    assert stats["total_contacts"] >= 1 and stats["by_outcome"]["Accepted offer"] >= 1

    recent = client.get("/contacts", params={"outcome": "Accepted offer"}).json()
    assert recent[0]["customer_name"]

    assert client.delete(f"/contacts/{contact['id']}").status_code == 204
    assert client.delete(f"/contacts/{contact['id']}").status_code == 404


def test_contact_validation_and_unknown_customer():
    cid = _a_customer_id()
    assert client.post(f"/customers/{cid}/contacts", json={"outcome": "Maybe"}).status_code == 422
    assert client.post("/customers/NOPE/contacts", json={}).status_code == 404
    assert client.get("/customers/NOPE/contacts").status_code == 404


def test_prediction_history_only_saved_when_asked():
    before = len(client.get("/predictions/history").json())
    client.post("/predict", json={"tenure": 3})                       # not saved
    client.post("/predict", params={"save": True}, json={"tenure": 3})  # saved
    hist = client.get("/predictions/history").json()
    assert len(hist) == before + 1
    assert hist[0]["input"]["tenure"] == 3 and 0 <= hist[0]["churn_probability"] <= 1
