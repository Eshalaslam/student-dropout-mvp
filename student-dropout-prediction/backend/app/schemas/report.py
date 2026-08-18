"""
Report-related schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class ReportHistoryItem(BaseModel):
    id: str
    name: str
    type: str
    generatedBy: Optional[str] = None
    date: Optional[str] = None
    size: Optional[str] = None


class ScheduledReport(BaseModel):
    id: str
    name: str
    type: str
    frequency: str  # Weekly, Monthly
    email: str
    active: bool = True


class ScheduledReportCreate(BaseModel):
    name: str
    type: str
    frequency: str = Field(..., description="Weekly or Monthly")
    email: str
