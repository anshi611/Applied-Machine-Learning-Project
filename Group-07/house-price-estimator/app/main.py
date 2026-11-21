from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.predictor import CONFIDENCE_LEVEL, predict_with_interval

BASE_DIR = Path(__file__).parent

app = FastAPI(title="House Price Estimator")


class HouseFeatures(BaseModel):
    MedInc: float = Field(..., gt=0, le=15, description="Median income in block (x $10,000)")
    HouseAge: float = Field(..., ge=1, le=52, description="Median house age (years)")
    AveRooms: float = Field(..., gt=0, le=20, description="Average rooms per household")
    AveBedrms: float = Field(..., gt=0, le=5, description="Average bedrooms per household")
    Population: float = Field(..., gt=0, le=10000, description="Block population")
    AveOccup: float = Field(..., gt=0, le=10, description="Average occupants per household")
    Latitude: float = Field(..., ge=32.5, le=42.0, description="Latitude (California)")
    Longitude: float = Field(..., ge=-124.5, le=-114.0, description="Longitude (California)")

class PredictionResponse(BaseModel):
    prediction: float
    lower: float
    upper: float
    confidence_level: float
    unit: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
def predict(features: HouseFeatures):
    pred, lower, upper = predict_with_interval(features.model_dump())
    return PredictionResponse(
        prediction=pred,
        lower=lower,
        upper=upper,
        confidence_level=CONFIDENCE_LEVEL,
        unit="$100,000",
    )


app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/")
def index():
    return FileResponse(BASE_DIR / "static" / "index.html")
