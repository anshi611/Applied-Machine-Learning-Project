"""
Request / response shapes for the API (Pydantic models).

Pydantic checks every incoming request automatically: wrong types or
values not in the allowed list return a clear 422 error instead of crashing
the model.
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field

YesNo = Literal["Yes", "No"]


class CustomerFeatures(BaseModel):
    """One customer's details, same columns the models were trained on."""
    gender: Literal["Female", "Male"] = "Female"
    SeniorCitizen: Literal[0, 1] = 0
    Partner: YesNo = "No"
    Dependents: YesNo = "No"
    tenure: int = Field(12, ge=0, le=100, description="Months with the company")
    PhoneService: YesNo = "Yes"
    MultipleLines: YesNo = "No"
    InternetService: Literal["DSL", "Fiber optic", "No"] = "Fiber optic"
    OnlineSecurity: YesNo = "No"
    OnlineBackup: YesNo = "No"
    DeviceProtection: YesNo = "No"
    TechSupport: YesNo = "No"
    StreamingTV: YesNo = "No"
    StreamingMovies: YesNo = "No"
    Contract: Literal["Month-to-month", "One year", "Two year"] = "Month-to-month"
    PaperlessBilling: YesNo = "Yes"
    PaymentMethod: Literal[
        "Electronic check", "Mailed check",
        "Bank transfer (automatic)", "Credit card (automatic)",
    ] = "Electronic check"
    MonthlyCharges: float = Field(70.0, gt=0, le=500)
    TotalCharges: Optional[float] = Field(
        None, ge=0, description="If empty, estimated as MonthlyCharges x tenure")


class PredictionResponse(BaseModel):
    churn_probability: float      # 0..1, from the churn model
    uplift_score: float           # change in P(stay) if we send the offer (SIMULATED training data)
    customer_value: float         # MonthlyCharges x clv_months
    expected_offer_profit: float  # uplift x value - offer cost
    risk_level: Literal["Low", "Medium", "High"]
    recommended_action: str
    reason: str


# ---------- database: contact log ----------
Channel = Literal["Phone call", "Email", "SMS", "In store"]
ContactAction = Literal["Retention offer ($50 discount)", "Contract upgrade offer",
                        "Service / support call", "Check-in (no offer)"]
Outcome = Literal["Pending", "Accepted offer", "Declined", "No answer", "Stayed", "Left"]


class ContactCreate(BaseModel):
    """What an agent records after contacting a customer."""
    channel: Channel = "Phone call"
    action: ContactAction = "Retention offer ($50 discount)"
    outcome: Outcome = "Pending"
    note: str = Field("", max_length=500)
    agent: str = Field("", max_length=80)


class ContactUpdate(BaseModel):
    """Change the outcome later, e.g. Pending -> Accepted offer."""
    outcome: Optional[Outcome] = None
    note: Optional[str] = Field(None, max_length=500)


class Contact(ContactCreate):
    id: int
    customer_id: str
    created_at: str
