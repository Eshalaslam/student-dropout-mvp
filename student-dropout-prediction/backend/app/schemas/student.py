"""
Pydantic schemas for data validation.

Field names use simplified, frontend-friendly naming.
The feature_mapping module translates these to the full ML column names
that the model/scaler expect.
"""
from pydantic import BaseModel, Field
from typing import List


class StudentFeatures(BaseModel):
    # Demographics
    marital_status: int = Field(..., description="Marital status code")
    application_mode: int = Field(..., description="Application mode code")
    application_order: int = Field(..., description="Application order (0=first choice)")
    course: int = Field(..., description="Course code")
    daytime_attendance: int = Field(..., description="1=daytime, 0=evening")
    age_at_enrollment: int = Field(..., description="Age at enrollment")

    # Qualification
    previous_qualification: int = Field(..., description="Previous qualification code")
    previous_qualification_grade: float = Field(..., description="Previous qualification grade")
    mothers_qualification: int = Field(..., description="Mother's qualification code")
    fathers_qualification: int = Field(..., description="Father's qualification code")
    mothers_occupation: int = Field(..., description="Mother's occupation code")
    fathers_occupation: int = Field(..., description="Father's occupation code")
    admission_grade: float = Field(..., description="Admission grade")

    # Status flags
    displaced: int = Field(..., description="1=displaced student")
    special_needs: int = Field(..., description="1=educational special needs")
    debtor: int = Field(..., description="1=debtor")
    tuition_fees_current: int = Field(..., description="1=tuition fees up to date")
    gender: int = Field(..., description="Gender code")
    scholarship_holder: int = Field(..., description="1=scholarship holder")

    # Semester 1 academics
    units_credited_sem1: int = Field(..., description="Curricular units credited, 1st semester")
    units_enrolled_sem1: int = Field(..., description="Curricular units enrolled, 1st semester")
    evaluations_sem1: int = Field(..., description="Curricular units evaluated, 1st semester")
    units_approved_sem1: int = Field(..., description="Curricular units approved, 1st semester")
    grade_sem1: float = Field(..., description="Average grade, 1st semester")
    no_evaluations_sem1: int = Field(..., description="Curricular units without evaluations, 1st semester")

    # Semester 2 academics
    units_credited_sem2: int = Field(..., description="Curricular units credited, 2nd semester")
    units_enrolled_sem2: int = Field(..., description="Curricular units enrolled, 2nd semester")
    evaluations_sem2: int = Field(..., description="Curricular units evaluated, 2nd semester")
    units_approved_sem2: int = Field(..., description="Curricular units approved, 2nd semester")
    grade_sem2: float = Field(..., description="Average grade, 2nd semester")
    no_evaluations_sem2: int = Field(..., description="Curricular units without evaluations, 2nd semester")

    # Macroeconomic
    unemployment_rate: float = Field(..., description="Unemployment rate")
    inflation_rate: float = Field(..., description="Inflation rate")
    gdp: float = Field(..., description="GDP")


class Reason(BaseModel):
    feature: str
    impact: float


class PredictionResponse(BaseModel):
    student_id: str
    risk_score: float
    risk_band: str
    flagged: bool
    top_reasons: List[Reason] = []
