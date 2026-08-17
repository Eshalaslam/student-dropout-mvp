"""
API routes for dashboard aggregate statistics and intervention logs.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional, List
from backend.app.schemas.student import InterventionCreate, InterventionUpdate, InterventionResponse
from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import get_current_user

router = APIRouter()


@router.get("/summary")
def get_dashboard_summary(current_user: Optional[dict] = Depends(get_current_user)):
    """
    Get overall counts of students by risk level (high, medium, low, unassessed),
    flagged student totals, average system risk score, and Supabase connection status.
    """
    return db_service.get_dashboard_metrics()


@router.get("/interventions")
def get_interventions(
    student_id: Optional[str] = Query(None, description="Optional student ID filter"),
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Get logs of all student interventions, optionally filtered by student_id.
    """
    return db_service.get_interventions(student_id)


@router.post("/interventions", status_code=status.HTTP_201_CREATED)
def create_intervention(
    payload: InterventionCreate,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Log a new mentor intervention for an at-risk student.
    """
    data = payload.model_dump()
    if current_user and current_user.get("role") == "mentor":
        data["mentor_name"] = current_user.get("full_name", data.get("mentor_name"))
    
    saved = db_service.create_intervention(data)
    return saved


@router.patch("/interventions/{intervention_id}")
def update_intervention(
    intervention_id: str,
    payload: InterventionUpdate,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Update intervention notes or status ('Open', 'In Progress', 'Resolved').
    """
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update fields provided."
        )
    
    updated = db_service.update_intervention(intervention_id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention '{intervention_id}' not found."
        )
    return updated
