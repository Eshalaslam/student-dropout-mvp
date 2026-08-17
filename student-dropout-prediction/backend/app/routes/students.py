"""
API routes for student record management, feature details, and prediction history.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from backend.app.schemas.student import StudentFeatures
from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import get_current_user

router = APIRouter()


@router.get("/")
def get_students(current_user: Optional[dict] = Depends(get_current_user)):
    """
    Get a list of all students with their latest risk status and evaluation dates.
    Useful for mentor dashboard and administrative overviews.
    """
    students_list = db_service.get_students_summary_list()
    return students_list


@router.get("/{student_id}")
def get_student_profile(student_id: str, current_user: Optional[dict] = Depends(get_current_user)):
    """
    Get detailed profile of a specific student, including their user info,
    saved feature details, and latest prediction.
    """
    user = db_service.get_user_by_student_id(student_id)
    details = db_service.get_student_details(student_id)
    preds = db_service.get_predictions_by_student(student_id)
    latest_pred = preds[0] if preds else None

    return {
        "student_id": student_id,
        "user_info": {
            "email": user.get("email") if user else None,
            "full_name": user.get("full_name") if user else f"Student {student_id}",
            "role": user.get("role") if user else "student"
        } if user else None,
        "latest_prediction": latest_pred,
        "has_saved_details": details is not None,
        "total_assessments": len(preds)
    }


@router.post("/{student_id}/details")
def save_student_details(
    student_id: str,
    features: StudentFeatures,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Enter or update dataset details and academic parameters for a student.
    Persists data in the Supabase student_details table.
    """
    saved = db_service.save_student_details(student_id, features.model_dump())
    return {
        "message": "Student details successfully saved in database",
        "student_id": student_id,
        "details": saved
    }


@router.get("/{student_id}/details")
def get_student_details(
    student_id: str,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Retrieve stored dataset details for a specific student.
    """
    details = db_service.get_student_details(student_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No dataset details found for student ID '{student_id}'. Please submit details first."
        )
    return details


@router.get("/{student_id}/history")
def get_student_prediction_history(
    student_id: str,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Get chronological history of all dropout risk evaluations for a student.
    """
    preds = db_service.get_predictions_by_student(student_id)
    return {
        "student_id": student_id,
        "total_records": len(preds),
        "history": preds
    }
