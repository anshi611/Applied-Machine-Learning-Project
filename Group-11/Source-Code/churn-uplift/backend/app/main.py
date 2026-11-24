"""
FastAPI backend for the myDel customer-retention demo.
(myDel is a FICTIONAL company; its customers are real anonymous IBM Telco records
with generated fake names.)

Endpoints
  GET  /health                 is the API up and are models loaded?
  GET  /summary                dashboard numbers for all myDel customers
  GET  /customers              customer list: search, filter, sort, pages
  GET  /customers/{id}         one customer: chance of staying, reasons, action
  POST /predict                score any customer details -> churn prob, uplift, action
  GET  /metrics                model comparison (classical, uplift, ROI)

Database (SQLite, backend/app/database.py): what the retention team does
  GET    /customers/{id}/contacts   contact history for one customer
  POST   /customers/{id}/contacts   log a new contact (channel, action, outcome, note)
  PATCH  /contacts/{contact_id}     update an outcome (e.g. Pending -> Accepted offer)
  DELETE /contacts/{contact_id}     remove a contact
  GET    /contacts                  recent contacts across all customers
  GET    /contacts/stats            campaign results: counts, acceptance rate
  GET    /predictions/history       customers checked on the predictor page

Run locally from the project root:
    uvicorn backend.app.main:app --reload
Interactive docs: http://127.0.0.1:8000/docs
"""
import os
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .database import Database
from .model_service import ModelService
from .schemas import Contact, ContactCreate, ContactUpdate, CustomerFeatures, Outcome, PredictionResponse

app = FastAPI(
    title="myDel Retention API",
    description="Customer churn prediction with a simple uplift extension for the fictional "
                "company myDel. Uplift results use SIMULATED retention-offer data.",
    version="2.0.0",
)

# CORS: lets the React frontend (a different address/port) call this API.
# Set CORS_ORIGINS="https://my-app.vercel.app" in production.
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models + customer data ONCE when the server starts (not on every request).
service = ModelService()
db = Database()


@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": True, "customers": len(service.customers),
            "database": "ok", "contacts_logged": db.contact_stats()["total_contacts"]}


@app.get("/summary")
def summary():
    return service.summary()


@app.get("/customers")
def customers(
    q: str = Query("", description="Search by name or customer ID"),
    risk: Optional[Literal["High", "Medium", "Low"]] = None,
    contract: Optional[Literal["Month-to-month", "One year", "Two year"]] = None,
    action: Optional[str] = None,
    sort_by: Literal["churn_prob", "chance_of_staying", "uplift_score", "expected_offer_profit",
                     "MonthlyCharges", "tenure", "name"] = "churn_prob",
    descending: bool = True,
    limit: int = Query(25, ge=1, le=10000),
    offset: int = Query(0, ge=0),
):
    """myDel's customers. Default: most at-risk first."""
    return service.list_customers(q, risk, contract, action, sort_by, descending, limit, offset)


@app.get("/customers/{customer_id}")
def customer_detail(customer_id: str):
    c = service.get_customer(customer_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@app.post("/predict", response_model=PredictionResponse)
def predict(customer: CustomerFeatures,
            save: bool = Query(False, description="Store this prediction in the history table")):
    features = customer.model_dump()
    result = service.predict_one(features)
    if save:
        db.log_prediction(features, result)
    return result


@app.get("/metrics")
def metrics():
    return {
        "classical": service.classical,
        "uplift": service.uplift_metrics,
        "roi": service.roi,              # test-set ROI (Phase 5, in the README)
        "mydel_roi": service.mydel_roi,  # same method on all myDel customers (used by the app)
    }


# ================= Database endpoints =================
def _customer_name(customer_id: str) -> str:
    c = service.get_customer(customer_id)
    return c["name"] if c else ""


@app.get("/customers/{customer_id}/contacts", response_model=list[Contact])
def list_customer_contacts(customer_id: str):
    if service.get_customer(customer_id) is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db.contacts_for(customer_id)


@app.post("/customers/{customer_id}/contacts", response_model=Contact, status_code=201)
def add_contact(customer_id: str, contact: ContactCreate):
    if service.get_customer(customer_id) is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db.add_contact(customer_id, contact.model_dump())


@app.patch("/contacts/{contact_id}", response_model=Contact)
def update_contact(contact_id: int, changes: ContactUpdate):
    if db.get_contact(contact_id) is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return db.update_contact(contact_id, changes.model_dump())


@app.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: int):
    if not db.delete_contact(contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")


@app.get("/contacts/stats")
def contact_stats():
    return db.contact_stats()


@app.get("/contacts")
def recent_contacts(limit: int = Query(50, ge=1, le=500), outcome: Optional[Outcome] = None):
    rows = db.recent_contacts(limit, outcome)
    for r in rows:
        r["customer_name"] = _customer_name(r["customer_id"])
    return rows


@app.get("/predictions/history")
def prediction_history(limit: int = Query(50, ge=1, le=500)):
    return db.prediction_history(limit)
