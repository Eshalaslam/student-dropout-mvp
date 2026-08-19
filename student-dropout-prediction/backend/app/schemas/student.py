"""
Pydantic schemas for student data validation, predictions, and interventions.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class StudentFeatures(BaseModel):
    # Demographics
    marital_status: int = Field(1, description="Marital status code (1: single, 2: married, etc.)")
    application_mode: int = Field(1, description="Application mode code (e.g., 1: 1st phase general)")
    application_order: int = Field(1, description="Application preference order (1=1st choice)")
    course: int = Field(9254, description="Degree course code")
    daytime_attendance: int = Field(1, description="1=daytime attendance, 0=evening")
    age_at_enrollment: int = Field(20, description="Age at university enrollment")

    # Qualification & Socio-Demographics
    previous_qualification: int = Field(1, description="Previous qualification code (1: Secondary education)")
    previous_qualification_grade: float = Field(130.0, description="Previous qualification grade (0-200)")
    mothers_qualification: int = Field(1, description="Mother's qualification code")
    fathers_qualification: int = Field(1, description="Father's qualification code")
    mothers_occupation: int = Field(5, description="Mother's occupation code")
    fathers_occupation: int = Field(5, description="Father's occupation code")
    admission_grade: float = Field(125.0, description="Admission entrance exam grade (0-200)")

    # Socio-Economic & Status flags
    displaced: int = Field(0, description="1=displaced / relocated student, 0=no")
    special_needs: int = Field(0, description="1=educational special needs, 0=no")
    debtor: int = Field(0, description="1=has outstanding debt, 0=no")
    tuition_fees_current: int = Field(1, description="1=tuition fees up to date, 0=overdue")
    gender: int = Field(1, description="Gender code (0: Female, 1: Male)")
    scholarship_holder: int = Field(0, description="1=scholarship holder, 0=no")

    # Semester 1 academics
    units_credited_sem1: int = Field(0, description="Curricular units credited, 1st semester")
    units_enrolled_sem1: int = Field(6, description="Curricular units enrolled, 1st semester")
    evaluations_sem1: int = Field(6, description="Curricular units evaluated, 1st semester")
    units_approved_sem1: int = Field(6, description="Curricular units approved/passed, 1st semester")
    grade_sem1: float = Field(13.5, description="Average grade, 1st semester (0-20)")
    no_evaluations_sem1: int = Field(0, description="Curricular units without evaluations, 1st semester")

    # Semester 2 academics
    units_credited_sem2: int = Field(0, description="Curricular units credited, 2nd semester")
    units_enrolled_sem2: int = Field(6, description="Curricular units enrolled, 2nd semester")
    evaluations_sem2: int = Field(6, description="Curricular units evaluated, 2nd semester")
    units_approved_sem2: int = Field(6, description="Curricular units approved/passed, 2nd semester")
    grade_sem2: float = Field(14.0, description="Average grade, 2nd semester (0-20)")
    no_evaluations_sem2: int = Field(0, description="Curricular units without evaluations, 2nd semester")

    # Macroeconomic context
    unemployment_rate: float = Field(10.8, description="Regional unemployment rate (%)")
    inflation_rate: float = Field(1.4, description="Inflation rate (%)")
    gdp: float = Field(1.74, description="GDP growth rate (%)")


class Reason(BaseModel):
    feature: str
    impact: float
    description: Optional[str] = None
    category: Optional[str] = "risk"  # "risk" | "protective"


class RecommendationItem(BaseModel):
    title: str
    description: str
    action_type: str
    priority: str  # "high", "medium", "info"


class PredictionResponse(BaseModel):
    id: Optional[str] = None
    student_id: str
    risk_score: float
    risk_band: str  # "high", "medium", "low"
    flagged: bool
    top_reasons: List[Reason] = []
    recommendations: List[RecommendationItem] = []
    created_at: Optional[str] = None


class StudentDetailsResponse(BaseModel):
    student_id: str
    features: StudentFeatures
    updated_at: Optional[str] = None


class RiskFactor(BaseModel):
    factor: str
    tier: str = Field(..., description="major, moderate, or minor")
    direction: str = Field(..., description="risk or protective")


class InterventionItem(BaseModel):
    type: str
    date: Optional[str] = None
    notes: Optional[str] = None
    status: str = "Open"  # Open, In Progress, Resolved
    mentor_name: Optional[str] = None


class Student(BaseModel):
    student_id: str
    student_name: str
    department: Optional[str] = None
    semester: Optional[int] = None
    admission_grade: Optional[float] = None
    age_at_enrollment: Optional[int] = None
    scholarship_holder: Optional[int] = None
    tuition_fees_up_to_date: Optional[int] = None
    curricular_units_1st_sem_enrolled: Optional[int] = None
    curricular_units_1st_sem_approved: Optional[int] = None
    curricular_units_2nd_sem_enrolled: Optional[int] = None
    curricular_units_2nd_sem_approved: Optional[int] = None
    curricular_units_failed: Optional[int] = None
    approval_rate: Optional[float] = None
    attendance_percentage: Optional[float] = None
    dropout_probability: Optional[float] = None
    risk_category: str = "Low"  # High, Medium, Low
    risk_factors: List[RiskFactor] = []
    interventions: List[InterventionItem] = []


class InterventionCreate(BaseModel):
    student_id: str
    mentor_name: Optional[str] = "Academic Mentor"
    type: str = "Academic Advising"
    notes: str
    status: Optional[str] = "Open"


class InterventionUpdate(BaseModel):
    notes: Optional[str] = None
    status: Optional[str] = None


class InterventionResponse(BaseModel):
    id: str
    student_id: str
    mentor_name: str
    type: str
    notes: str
    status: str
    created_at: str
    updated_at: Optional[str] = None


class StudentCreateRequest(BaseModel):
    """Schema for admin creating a new student."""
    # Identity
    full_name: str = Field(..., description="Student's full name")
    email: str = Field(..., description="Student's email address")
    student_id: Optional[str] = Field(None, description="Student ID (auto-generated if blank)")
    password: Optional[str] = Field("student123", description="Initial password (default: student123)")
    username: Optional[str] = Field(None, description="Username (defaults to student_id)")
    mentor_id: Optional[str] = Field(None, description="Initial mentor ID to assign")

    # Optional metadata
    department: Optional[str] = Field(None, description="Department / faculty name")
    semester: Optional[int] = Field(1, description="Current semester (1-8)")
    attendance_percentage: Optional[float] = Field(None, description="Attendance % (0-100)")

    # Dataset features (with sensible defaults)
    marital_status: int = Field(1)
    application_mode: int = Field(1)
    application_order: int = Field(1)
    course: int = Field(9254)
    daytime_attendance: int = Field(1)
    age_at_enrollment: int = Field(20)
    previous_qualification: int = Field(1)
    previous_qualification_grade: float = Field(130.0)
    mothers_qualification: int = Field(1)
    fathers_qualification: int = Field(1)
    mothers_occupation: int = Field(5)
    fathers_occupation: int = Field(5)
    admission_grade: float = Field(125.0)
    displaced: int = Field(0)
    special_needs: int = Field(0)
    debtor: int = Field(0)
    tuition_fees_current: int = Field(1)
    gender: int = Field(1)
    scholarship_holder: int = Field(0)
    units_credited_sem1: int = Field(0)
    units_enrolled_sem1: int = Field(6)
    evaluations_sem1: int = Field(6)
    units_approved_sem1: int = Field(6)
    grade_sem1: float = Field(13.5)
    no_evaluations_sem1: int = Field(0)
    units_credited_sem2: int = Field(0)
    units_enrolled_sem2: int = Field(6)
    evaluations_sem2: int = Field(6)
    units_approved_sem2: int = Field(6)
    grade_sem2: float = Field(14.0)
    no_evaluations_sem2: int = Field(0)
    unemployment_rate: float = Field(10.8)
    inflation_rate: float = Field(1.4)
    gdp: float = Field(1.74)
