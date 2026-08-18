"""
Student routes — list, detail, and update student records.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import get_current_user, require_auth, require_admin
from backend.app.services.model_service import ModelService
from backend.app.services.shap_service import ShapService

router = APIRouter()


def _compute_student_profile(student_id: str, details: dict) -> dict:
    """Build a full student profile with risk factors and interventions."""
    student_name = f"Student {student_id}"
    user = db_service.get_user_by_student_id(student_id)
    if user:
        student_name = user.get("full_name") or user.get("name") or student_name

    # Compute risk using ML model
    dropout_probability = 0.0
    risk_category = "Low"
    risk_factors = []

    if details:
        try:
            model_service = ModelService()
            pred = model_service.predict(details)
            dropout_probability = pred["risk_score"]
            risk_category = pred["risk_band"].capitalize()  # High, Medium, Low

            # Get SHAP risk factors
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

    # Compute approval rate
    sem1_approved = details.get("units_approved_sem1", 0) if details else 0
    sem1_enrolled = details.get("units_enrolled_sem1", 1) if details else 1
    sem2_approved = details.get("units_approved_sem2", 0) if details else 0
    sem2_enrolled = details.get("units_enrolled_sem2", 1) if details else 1
    total_enrolled = sem1_enrolled + sem2_enrolled
    total_approved = sem1_approved + sem2_approved
    approval_rate = round(total_approved / total_enrolled, 4) if total_enrolled > 0 else 0.0

    # Failed units
    failed_sem1 = max(0, sem1_enrolled - sem1_approved)
    failed_sem2 = max(0, sem2_enrolled - sem2_approved)
    curricular_units_failed = failed_sem1 + failed_sem2

    # Get interventions
    interventions_raw = db_service.get_interventions(student_id)
    interventions = []
    for iv in interventions_raw:
        interventions.append({
            "type": iv.get("type", "Academic Advising"),
            "date": iv.get("created_at"),
            "notes": iv.get("notes", ""),
            "status": iv.get("status", "Open"),
            "mentor_name": iv.get("mentor_name", ""),
        })

    return {
        "student_id": student_id,
        "student_name": student_name,
        "department": details.get("department") if details else None,
        "semester": details.get("semester") if details else None,
        "admission_grade": details.get("admission_grade") if details else None,
        "age_at_enrollment": details.get("age_at_enrollment") if details else None,
        "scholarship_holder": details.get("scholarship_holder") if details else None,
        "tuition_fees_up_to_date": details.get("tuition_fees_current") if details else None,
        "curricular_units_1st_sem_enrolled": details.get("units_enrolled_sem1") if details else None,
        "curricular_units_1st_sem_approved": details.get("units_approved_sem1") if details else None,
        "curricular_units_2nd_sem_enrolled": details.get("units_enrolled_sem2") if details else None,
        "curricular_units_2nd_sem_approved": details.get("units_approved_sem2") if details else None,
        "curricular_units_failed": curricular_units_failed,
        "approval_rate": approval_rate,
        "attendance_percentage": details.get("attendance_percentage") if details else None,
        "dropout_probability": dropout_probability,
        "risk_category": risk_category,
        "risk_factors": risk_factors,
        "interventions": interventions,
    }


@router.get("/")
def list_students(
    search: Optional[str] = Query(None, description="Search by name or student ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level: High, Medium, Low"),
    department: Optional[str] = Query(None, description="Filter by department"),
    current_user: Optional[dict] = Depends(get_current_user),
):
    """List all students with optional search and filters. Mentors see only assigned students."""
    all_details = db_service.get_all_student_details()
    student_profiles = []

    for d in all_details:
        sid = d.get("student_id", "")
        profile = _compute_student_profile(sid, d)
        student_profiles.append(profile)

    # Mentor filter: only assigned students
    role = (current_user.get("role", "") if current_user else "")
    if role == "Mentor":
        mentor_id = current_user.get("mentorId") or current_user.get("mentor_id")
        if mentor_id:
            assignments = db_service.get_students_by_mentor(mentor_id)
            assigned_ids = {a["student_id"] for a in assignments}
            student_profiles = [p for p in student_profiles if p["student_id"] in assigned_ids]

    # Search filter
    if search:
        search_lower = search.lower()
        student_profiles = [
            p for p in student_profiles
            if search_lower in p["student_id"].lower()
            or search_lower in p["student_name"].lower()
        ]

    # Risk level filter
    if risk_level:
        student_profiles = [
            p for p in student_profiles
            if p["risk_category"].lower() == risk_level.lower()
        ]

    # Department filter
    if department:
        student_profiles = [
            p for p in student_profiles
            if p.get("department") and p["department"].lower() == department.lower()
        ]

    return student_profiles


@router.get("/{student_id}")
def get_student_detail(student_id: str, current_user: Optional[dict] = Depends(get_current_user)):
    """Get detailed student profile with risk factors and interventions."""
    details = db_service.get_student_details(student_id)
    profile = _compute_student_profile(student_id, details)

    # Mentor check: can only view assigned students
    role = (current_user.get("role", "") if current_user else "")
    if role == "Mentor":
        mentor_id = current_user.get("mentorId") or current_user.get("mentor_id")
        if mentor_id:
            assignments = db_service.get_students_by_mentor(mentor_id)
            assigned_ids = {a["student_id"] for a in assignments}
            if student_id not in assigned_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not assigned to this student.",
                )

    return profile


@router.patch("/{student_id}")
def update_student(
    student_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
):
    """Admin only: update student fields (tuition_fees_up_to_date, scholarship_holder, attendance_percentage)."""
    details = db_service.get_student_details(student_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No details found for student '{student_id}'.",
        )

    allowed_fields = {"tuition_fees_up_to_date", "scholarship_holder", "attendance_percentage"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid update fields provided.",
        )

    # Map API field names to DB column names
    field_map = {
        "tuition_fees_up_to_date": "tuition_fees_current",
        "scholarship_holder": "scholarship_holder",
        "attendance_percentage": "attendance_percentage",
    }

    db_updates = {}
    for api_field, value in updates.items():
        db_col = field_map.get(api_field, api_field)
        db_updates[db_col] = value

    # Merge with existing details
    merged = {**details, **db_updates}
    saved = db_service.save_student_details(student_id, merged)

    # Log the access
    db_service.log_access(
        user_name=current_user.get("sub", "admin"),
        role="Admin",
        action=f"Updated student {student_id}",
        student_id=student_id,
    )

    return {"message": "Student updated successfully", "student_id": student_id, "updates": updates}


@router.post("/{student_id}/details")
def save_student_details_endpoint(
    student_id: str,
    features: dict,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Save or update raw dataset features for a student."""
    saved = db_service.save_student_details(student_id, features)
    return {"message": "Details saved successfully", "student_id": student_id, **saved}


@router.get("/{student_id}/details")
def get_student_details_endpoint(
    student_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Fetch raw stored dataset features for a student."""
    details = db_service.get_student_details(student_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No details found for student '{student_id}'.",
        )
    return details


@router.get("/{student_id}/history")
def get_student_prediction_history(
    student_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Retrieve historical prediction and risk assessments for a student."""
    history = db_service.get_predictions_by_student(student_id)
    return {
        "student_id": student_id,
        "total_records": len(history),
        "history": history,
    }


@router.get("/{student_id}/analysis")
def get_student_analysis_endpoint(
    student_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Get full ML prediction, SHAP reasons, and recommendations for a student."""
    details = db_service.get_student_details(student_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No features available to analyze student '{student_id}'.",
        )

    model_service = ModelService()
    shap_service = ShapService()
    from backend.app.services.recommendation_service import RecommendationService
    rec_service = RecommendationService()

    pred = model_service.predict(details)
    reasons = shap_service.explain(details, top_n=5)
    recommendations = rec_service.generate_recommendations(details, pred, reasons)

    return {
        "student_id": student_id,
        "dropout_probability": pred["risk_score"],
        "risk_category": pred["risk_band"].capitalize(),
        "flagged": pred["flagged"],
        "risk_factors": [r for r in reasons if r.get("category") == "risk"],
        "protective_factors": [r for r in reasons if r.get("category") == "protective"],
        "top_reasons": reasons,
        "recommendations": recommendations,
    }


@router.post("/{student_id}/interventions", status_code=status.HTTP_201_CREATED)
def create_student_intervention_endpoint(
    student_id: str,
    body: dict,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Add a new intervention record for a student."""
    mentor_name = body.get("mentor_name") or (current_user.get("name") if current_user else "Academic Mentor")
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
        action=f"Recorded intervention for {student_id} ({record['type']})",
        student_id=student_id,
    )

    return saved


@router.get("/{student_id}/interventions")
def get_student_interventions_endpoint(
    student_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """List all interventions recorded for a student."""
    return db_service.get_interventions(student_id)
