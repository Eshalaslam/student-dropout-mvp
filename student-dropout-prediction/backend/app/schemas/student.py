"""
Pydantic schemas for data validation.
"""
from pydantic import BaseModel
from typing import List

class StudentFeatures(BaseModel):
    # Demographics
    gender: int
    age_at_enrollment: int
    
    # Academics Sem 1
    units_enrolled_sem1: int
    units_approved_sem1: int
    grade_sem1: float
    
    # Academics Sem 2
    units_enrolled_sem2: int
    units_approved_sem2: int
    grade_sem2: float
    
    # Socio-economic
    scholarship_holder: int
    debtor: int
    tuition_fees_up_to_date: int

class Reason(BaseModel):
    feature: str
    impact: float

class PredictionResponse(BaseModel):
    risk_score: float
    risk_band: str
    flagged: bool
    top_reasons: List[Reason] = []
