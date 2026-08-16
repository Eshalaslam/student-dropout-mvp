"""
API routes for dashboard aggregate statistics and intervention logs.
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary():
    """
    Get overall counts of students by risk level (high, medium, low).
    """
    return {"high_risk_count": 0, "medium_risk_count": 0, "low_risk_count": 0}

@router.get("/interventions")
def get_interventions():
    """
    Get logs of all student interventions.
    """
    return []
