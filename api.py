# ==============================================================================
# Dropout Risk API — defines the exact request/response contract.
# Backend team: this is what to call. Frontend team: this is what you'll receive.
# ==============================================================================

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import joblib
import pandas as pd

app = FastAPI(title="Dropout Risk API")

# Load saved artifacts from Cell 16
model = joblib.load("dropout_model.pkl")
scaler = joblib.load("scaler.pkl")
threshold = joblib.load("threshold.pkl")

# --- Request shape: what backend sends in -----------------------------------
class StudentFeatures(BaseModel):
    marital_status: int
    application_mode: int
    application_order: int
    course: int
    daytime_evening_attendance: int
    previous_qualification: int
    previous_qualification_grade: float
    mothers_qualification: int
    fathers_qualification: int
    mothers_occupation: int
    fathers_occupation: int
    admission_grade: float
    displaced: int
    educational_special_needs: int
    debtor: int
    tuition_fees_up_to_date: int
    gender: int
    scholarship_holder: int
    age_at_enrollment: int
    curricular_units_1st_sem_credited: int
    curricular_units_1st_sem_enrolled: int
    curricular_units_1st_sem_evaluations: int
    curricular_units_1st_sem_approved: int
    curricular_units_1st_sem_grade: float
    curricular_units_1st_sem_without_evaluations: int
    curricular_units_2nd_sem_credited: int
    curricular_units_2nd_sem_enrolled: int
    curricular_units_2nd_sem_evaluations: int
    curricular_units_2nd_sem_approved: int
    curricular_units_2nd_sem_grade: float
    curricular_units_2nd_sem_without_evaluations: int
    unemployment_rate: float
    inflation_rate: float
    gdp: float

# --- Response shape: what frontend receives ----------------------------------
class TopReason(BaseModel):
    feature: str
    impact: float  # positive = pushed risk up, negative = pushed risk down

class PredictionResponse(BaseModel):
    student_id: str
    risk_score: float          # 0.0 - 1.0, raw model probability
    risk_band: str             # "high" | "medium" | "low"
    flagged: bool              # True if risk_score >= threshold
    top_reasons: List[TopReason]  # filled in once SHAP is wired in


@app.post("/predict", response_model=PredictionResponse)
def predict(student_id: str, features: StudentFeatures):
    X = pd.DataFrame([features.dict()])
    X_scaled = pd.DataFrame(scaler.transform(X), columns=X.columns)

    prob = float(model.predict_proba(X_scaled)[0, 1])

    if prob >= 0.66:
        band = "high"
    elif prob >= threshold:
        band = "medium"
    else:
        band = "low"

    # Placeholder until SHAP is added — replace with real top-3 feature impacts
    top_reasons = [
        {"feature": "curricular_units_2nd_sem_approved", "impact": 0.21},
        {"feature": "tuition_fees_up_to_date", "impact": 0.14},
    ]

    return {
        "student_id": student_id,
        "risk_score": round(prob, 4),
        "risk_band": band,
        "flagged": prob >= threshold,
        "top_reasons": top_reasons
    }
