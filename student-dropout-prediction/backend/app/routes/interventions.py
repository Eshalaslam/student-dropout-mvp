"""
Intervention routes — track and manage mentor interventions for at-risk students.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import require_auth, require_admin, require_mentor
from backend.app.schemas.intervention import StatusUpdate, NoteCreate, ReassignRequest

router = APIRouter()


def _get_intervention_student_profile(student_id: str) -> dict:
    """Build intervention profile for a student."""
    details = db_service.get_student_details(student_id)
    user = db_service.get_user_by_student_id(student_id)
    student_name = user.get("full_name") or f"Student {student_id}" if user else f"Student {student_id}"

    intervention_status = "Not Started"
    assigned_mentor = None
    last_updated = None

    # Get the latest intervention for this student
    interventions = db_service.get_interventions(student_id)
    if interventions:
        latest = interventions[0]  # Already sorted newest first
        intervention_status = latest.get("intervention_status", latest.get("status", "Not Started"))
        assigned_mentor = latest.get("assigned_mentor") or latest.get("mentor_name")
        last_updated = latest.get("last_updated") or latest.get("updated_at")

    # Compute risk
    dropout_probability = 0.0
    risk_category = "Low"
    if details:
        try:
            from backend.app.services.model_service import ModelService
            model_service = ModelService()
            pred = model_service.predict(details)
            dropout_probability = pred["risk_score"]
            risk_category = pred["risk_band"].capitalize()
        except Exception:
            pass

    # Attendance & approval
    attendance_percentage = details.get("attendance_percentage") if details else None
    sem1_approved = details.get("units_approved_sem1", 0) if details else 0
    sem1_enrolled = details.get("units_enrolled_sem1", 1) if details else 1
    sem2_approved = details.get("units_approved_sem2", 0) if details else 0
    sem2_enrolled = details.get("units_enrolled_sem2", 1) if details else 1
    total_enrolled = sem1_enrolled + sem2_enrolled
    total_approved = sem1_approved + sem2_approved
    approval_rate = round(total_approved / total_enrolled, 4) if total_enrolled > 0 else 0.0

    # Mentor notes
    notes_raw = db_service.get_notes_by_student("mentor_notes", student_id)
    mentor_notes = [
        {
            "id": n.get("id"),
            "author": n.get("author", ""),
            "timestamp": n.get("timestamp"),
            "text": n.get("text", ""),
        }
        for n in notes_raw
    ]

    # Risk factors
    risk_factors = []
    if details:
        try:
            from backend.app.services.shap_service import ShapService
            shap_service = ShapService()
            shap_reasons = shap_service.explain(details, top_n=5)
            for r in shap_reasons:
                impact = r.get("impact", 0)
                tier = "major" if abs(impact) > 0.1 else "moderate" if abs(impact) > 0.05 else "minor"
                direction = "risk" if impact > 0 else "protective"
                risk_factors.append({
                    "factor": r.get("feature", "unknown"),
                    "tier": tier,
                    "direction": direction,
                })
        except Exception:
            pass

    return {
        "student_id": student_id,
        "student_name": student_name,
        "department": details.get("department") if details else None,
        "semester": details.get("semester") if details else None,
        "dropout_probability": dropout_probability,
        "risk_category": risk_category,
        "intervention_status": intervention_status,
        "assigned_mentor": assigned_mentor,
        "last_updated": last_updated,
        "mentor_notes": mentor_notes,
        "attendance_percentage": attendance_percentage,
        "approval_rate": approval_rate,
        "risk_factors": risk_factors,
    }


@router.get("/")
def list_interventions(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by intervention status"),
    mentor_id: Optional[str] = Query(None, description="Filter by assigned mentor ID"),
    risk_band: Optional[str] = Query(None, description="Filter by risk band: High, Medium, Low"),
    current_user: dict = Depends(require_auth),
):
    """List all students with intervention details. Mentors see only assigned students."""
    all_details = db_service.get_all_student_details()
    profiles = []
    for d in all_details:
        sid = d.get("student_id", "")
        profile = _get_intervention_student_profile(sid)
        profiles.append(profile)

    # Mentor filter
    role = current_user.get("role", "")
    if role == "Mentor":
        mid = current_user.get("mentorId") or current_user.get("mentor_id")
        if mid:
            assignments = db_service.get_students_by_mentor(mid)
            assigned_ids = {a["student_id"] for a in assignments}
            profiles = [p for p in profiles if p["student_id"] in assigned_ids]

    # Status filter
    if status_filter:
        profiles = [
            p for p in profiles
            if p["intervention_status"] and p["intervention_status"].lower() == status_filter.lower()
        ]

    # Mentor ID filter
    if mentor_id:
        profiles = [p for p in profiles if p.get("assigned_mentor") == mentor_id]

    # Risk band filter
    if risk_band:
        profiles = [p for p in profiles if p["risk_category"].lower() == risk_band.lower()]

    return profiles


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_intervention(
    body: dict,
    current_user: Optional[dict] = Depends(require_auth),
):
    """Create a new intervention record."""
    student_id = body.get("student_id")
    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_id is required",
        )

    mentor_name = body.get("mentor_name") or (current_user.get("name") if current_user else "Mentor")
    assigned_mentor = body.get("assigned_mentor") or (current_user.get("mentorId") if current_user else None)
    int_status = body.get("status", "Open")

    record = {
        "student_id": student_id,
        "mentor_name": mentor_name,
        "type": body.get("type", "Academic Advising"),
        "notes": body.get("notes", ""),
        "status": int_status,
        "intervention_status": int_status,
        "assigned_mentor": assigned_mentor,
    }
    saved = db_service.create_intervention(record)

    db_service.log_access(
        user_name=(current_user.get("sub") or current_user.get("username") or "system") if current_user else "mentor",
        role=(current_user.get("role") or "Mentor") if current_user else "Mentor",
        action=f"Recorded intervention for {student_id}",
        student_id=student_id,
    )

    return saved


@router.get("/{student_id}")
def get_intervention_detail(student_id: str, current_user: dict = Depends(require_auth)):
    """Get intervention details for a specific student."""
    profile = _get_intervention_student_profile(student_id)

    # Mentor check
    role = current_user.get("role", "")
    if role == "Mentor":
        mid = current_user.get("mentorId") or current_user.get("mentor_id")
        if mid:
            assignments = db_service.get_students_by_mentor(mid)
            assigned_ids = {a["student_id"] for a in assignments}
            if student_id not in assigned_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not assigned to this student.",
                )

    return profile


@router.patch("/{student_id}/status")
def update_intervention_status(
    student_id: str,
    body: StatusUpdate,
    current_user: dict = Depends(require_auth),
):
    """Update intervention status: Not Started → In Progress → Resolved → Escalated."""
    valid_statuses = {"Not Started", "In Progress", "Resolved", "Escalated"}
    if body.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    # Check if intervention exists
    interventions = db_service.get_interventions(student_id)
    if not interventions:
        # Create one
        mentor_name = current_user.get("name", "Mentor")
        db_service.create_intervention({
            "student_id": student_id,
            "mentor_name": mentor_name,
            "type": "Academic Advising",
            "notes": "",
            "status": body.status,
            "intervention_status": body.status,
            "assigned_mentor": current_user.get("mentorId") or current_user.get("mentor_id"),
        })
    else:
        latest = interventions[0]
        db_service.update_intervention(latest["id"], {
            "status": body.status if body.status in ("Open", "In Progress", "Resolved") else latest.get("status"),
            "intervention_status": body.status,
        })

    # Log access
    db_service.log_access(
        user_name=current_user.get("sub", ""),
        role=current_user.get("role", ""),
        action=f"Updated intervention status for {student_id} to {body.status}",
        student_id=student_id,
    )

    return {"message": f"Intervention status updated to {body.status}", "student_id": student_id, "status": body.status}


@router.post("/{student_id}/notes")
def add_intervention_note(
    student_id: str,
    body: NoteCreate,
    current_user: dict = Depends(require_auth),
):
    """Add a timestamped mentor note for a student's intervention."""
    note = db_service.add_note("mentor_notes", student_id, body.author, body.text)

    # Log access
    db_service.log_access(
        user_name=current_user.get("sub", ""),
        role=current_user.get("role", ""),
        action=f"Added intervention note for {student_id}",
        student_id=student_id,
    )

    return {
        "message": "Note added successfully",
        "note": {
            "id": note.get("id"),
            "author": note.get("author"),
            "timestamp": note.get("timestamp"),
            "text": note.get("text"),
        },
    }


@router.patch("/{student_id}/reassign")
def reassign_mentor(
    student_id: str,
    body: ReassignRequest,
    current_user: dict = Depends(require_admin),
):
    """Admin only: reassign a student's mentor."""
    mentor = db_service.get_mentor_by_id(body.mentor_id)
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mentor '{body.mentor_id}' not found.",
        )

    # Update or create intervention with new mentor
    interventions = db_service.get_interventions(student_id)
    if interventions:
        latest = interventions[0]
        db_service.update_intervention(latest["id"], {
            "assigned_mentor": body.mentor_id,
            "mentor_name": mentor.get("name", ""),
        })

    # Create assignment record
    db_service.assign_mentor(body.mentor_id, student_id)

    # Log access
    db_service.log_access(
        user_name=current_user.get("sub", "admin"),
        role="Admin",
        action=f"Reassigned mentor for {student_id} to {body.mentor_id}",
        student_id=student_id,
    )

    return {
        "message": f"Student {student_id} reassigned to mentor {mentor.get('name', body.mentor_id)}",
        "student_id": student_id,
        "mentor_id": body.mentor_id,
        "mentor_name": mentor.get("name"),
    }
