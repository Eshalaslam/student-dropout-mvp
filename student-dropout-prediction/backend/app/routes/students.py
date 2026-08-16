"""
API routes for student record management and details.
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_students():
    """
    Get a list of all students with their risk status.
    """
    return []

@router.get("/{student_id}")
def get_student_details(student_id: str):
    """
    Get detailed profile of a specific student.
    """
    return {"student_id": student_id}
