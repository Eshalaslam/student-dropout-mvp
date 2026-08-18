"""
Intervention-related schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class InterventionNote(BaseModel):
    id: Optional[str] = None
    author: str
    timestamp: Optional[str] = None
    text: str


class StatusUpdate(BaseModel):
    status: str = Field(..., description="New status: Not Started, In Progress, Resolved, Escalated")


class NoteCreate(BaseModel):
    text: str = Field(..., description="Note text content")
    author: str = Field("Mentor", description="Author of the note")


class ReassignRequest(BaseModel):
    mentor_id: str = Field(..., description="New mentor ID to assign")


class InterventionStudent(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    dropout_probability: Optional[float] = None
    risk_category: Optional[str] = None
    intervention_status: Optional[str] = "Not Started"
    assigned_mentor: Optional[str] = None
    last_updated: Optional[str] = None
    mentor_notes: List[InterventionNote] = []
    attendance_percentage: Optional[float] = None
    approval_rate: Optional[float] = None
    risk_factors: List[dict] = []
