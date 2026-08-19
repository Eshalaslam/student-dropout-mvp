"""
Mentor management routes — Admin only. CRUD for mentor accounts.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import AuthService, require_admin, get_current_user
from backend.app.schemas.mentor import MentorCreateRequest

router = APIRouter()


@router.get("/")
def list_mentors(current_user: Optional[dict] = Depends(get_current_user)):
    """List all mentors with their assigned student counts."""
    mentors = db_service.get_all_mentors()
    result = []
    for m in mentors:
        # Count assigned students
        assignments = db_service.get_students_by_mentor(m.get("mentor_id", ""))
        assigned_count = len(assignments)

        result.append({
            "id": m.get("id"),
            "mentor_id": m.get("mentor_id"),   # used for reassignment
            "username": m.get("username"),
            "name": m.get("name"),
            "email": m.get("email"),
            "role": m.get("role", "Mentor"),
            "mentorId": m.get("mentor_id"),
            "status": m.get("status", "Active"),
            "assigned_students_count": assigned_count,
        })
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_mentor(body: MentorCreateRequest, current_user: dict = Depends(require_admin)):
    """Register a new mentor account."""
    # Check for existing username
    existing = db_service.get_mentor_by_username(body.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mentor with username '{body.username}' already exists.",
        )

    password_hash = AuthService.hash_password(body.password)
    mentor = db_service.create_mentor({
        "username": body.username,
        "password_hash": password_hash,
        "name": body.name,
        "email": body.email,
        "mentor_id": body.mentorId,
    })

    return {
        "id": mentor.get("id"),
        "username": mentor.get("username"),
        "name": mentor.get("name"),
        "email": mentor.get("email"),
        "role": mentor.get("role", "Mentor"),
        "mentorId": mentor.get("mentor_id"),
        "status": mentor.get("status", "Active"),
    }


@router.patch("/{mentor_id}")
def update_mentor(
    mentor_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
):
    """Edit mentor name or email."""
    mentor = db_service.get_mentor_by_id(mentor_id)
    if not mentor:
        raise HTTPException(status_code=404, detail=f"Mentor '{mentor_id}' not found")

    allowed_fields = {"name", "email"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid update fields provided")

    updated = db_service.update_mentor(mentor_id, updates)
    return {
        "id": updated.get("id"),
        "username": updated.get("username"),
        "name": updated.get("name"),
        "email": updated.get("email"),
        "role": updated.get("role"),
        "mentorId": updated.get("mentor_id"),
        "status": updated.get("status"),
    }


@router.patch("/{mentor_id}/deactivate")
def toggle_mentor_status(mentor_id: str, current_user: dict = Depends(require_admin)):
    """Toggle mentor active/inactive status."""
    mentor = db_service.get_mentor_by_id(mentor_id)
    if not mentor:
        raise HTTPException(status_code=404, detail=f"Mentor '{mentor_id}' not found")

    updated = db_service.toggle_mentor_status(mentor_id)
    return {
        "id": updated.get("id"),
        "username": updated.get("username"),
        "name": updated.get("name"),
        "status": updated.get("status"),
        "message": f"Mentor status toggled to {updated.get('status')}",
    }
