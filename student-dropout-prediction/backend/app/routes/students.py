"""
Student routes — list, detail, and update student records.
"""
import uuid
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import get_current_user, require_auth, require_admin, AuthService
from backend.app.services.model_service import ModelService
from backend.app.services.shap_service import ShapService
from backend.app.schemas.student import StudentCreateRequest

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

    # Get assigned mentor from DB relationships
    mentor_assignment = db_service.get_assigned_mentor_for_student(student_id)
    assigned_mentor = None
    assigned_mentor_id = None
    if mentor_assignment:
        assigned_mentor_id = mentor_assignment.get("mentor_id")
        assigned_mentor = mentor_assignment.get("mentor_name") or assigned_mentor_id
    # Also check denormalized field on users table
    if not assigned_mentor and user:
        uid_mentor = user.get("mentor_id")
        if uid_mentor:
            assigned_mentor_id = uid_mentor
            assigned_mentor = user.get("mentor_name") or uid_mentor

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
        "assigned_mentor": assigned_mentor,
        "assigned_mentor_id": assigned_mentor_id,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_student(
    body: StudentCreateRequest,
    current_user: dict = Depends(require_admin),
):
    """Admin only: add a new student to the system."""
    # Generate or validate student_id (defaults to sequential STU-1011, STU-1012, etc.)
    student_id = body.student_id
    if not student_id:
        all_details = db_service.get_all_student_details()
        max_num = 1010
        for d in all_details:
            sid = str(d.get("student_id", ""))
            if sid.startswith("STU-") and sid[4:].isdigit():
                try:
                    max_num = max(max_num, int(sid[4:]))
                except ValueError:
                    pass
        student_id = f"STU-{max_num + 1}"

    # Check for duplicate student_id or email
    if db_service.get_user_by_student_id(student_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A student with ID '{student_id}' already exists.",
        )
    existing_email = db_service.get_user_by_email(body.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{body.email}' already exists.",
        )

    password_hash = AuthService.hash_password(body.password or "student123")
    username = body.username or student_id

    # Resolve initial mentor name if mentor_id provided
    mentor_name = None
    if body.mentor_id:
        mentor = db_service.get_mentor_by_id(body.mentor_id)
        if mentor:
            mentor_name = mentor.get("name")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mentor '{body.mentor_id}' not found.",
            )

    user_data = {
        "email": body.email,
        "password_hash": password_hash,
        "full_name": body.full_name,
        "student_id": student_id,
        "role": "student",
        "username": username,
        "mentor_id": body.mentor_id,
        "mentor_name": mentor_name,
        "status": "Active",
    }

    features = {
        "marital_status": body.marital_status,
        "application_mode": body.application_mode,
        "application_order": body.application_order,
        "course": body.course,
        "daytime_attendance": body.daytime_attendance,
        "age_at_enrollment": body.age_at_enrollment,
        "previous_qualification": body.previous_qualification,
        "previous_qualification_grade": body.previous_qualification_grade,
        "mothers_qualification": body.mothers_qualification,
        "fathers_qualification": body.fathers_qualification,
        "mothers_occupation": body.mothers_occupation,
        "fathers_occupation": body.fathers_occupation,
        "admission_grade": body.admission_grade,
        "displaced": body.displaced,
        "special_needs": body.special_needs,
        "debtor": body.debtor,
        "tuition_fees_current": body.tuition_fees_current,
        "gender": body.gender,
        "scholarship_holder": body.scholarship_holder,
        "units_credited_sem1": body.units_credited_sem1,
        "units_enrolled_sem1": body.units_enrolled_sem1,
        "evaluations_sem1": body.evaluations_sem1,
        "units_approved_sem1": body.units_approved_sem1,
        "grade_sem1": body.grade_sem1,
        "no_evaluations_sem1": body.no_evaluations_sem1,
        "units_credited_sem2": body.units_credited_sem2,
        "units_enrolled_sem2": body.units_enrolled_sem2,
        "evaluations_sem2": body.evaluations_sem2,
        "units_approved_sem2": body.units_approved_sem2,
        "grade_sem2": body.grade_sem2,
        "no_evaluations_sem2": body.no_evaluations_sem2,
        "unemployment_rate": body.unemployment_rate,
        "inflation_rate": body.inflation_rate,
        "gdp": body.gdp,
        "department": body.department,
        "semester": body.semester,
        "attendance_percentage": body.attendance_percentage,
    }

    # Create user + student details atomically
    try:
        db_service.create_student(user_data, features)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create student: {e}",
        )

    # Assign mentor if provided
    if body.mentor_id:
        try:
            db_service.assign_mentor(body.mentor_id, student_id)
        except Exception:
            pass  # Non-fatal: student is created, just log

    # Log access
    db_service.log_access(
        user_name=current_user.get("sub", "admin"),
        role="Admin",
        action=f"Added new student {student_id} ({body.full_name})",
        student_id=student_id,
    )

    # Return the full student profile
    details = db_service.get_student_details(student_id)
    profile = _compute_student_profile(student_id, details)
    return profile


@router.get("/")
def list_students(
    search: Optional[str] = Query(None, description="Search by name or student ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level: High, Medium, Low"),
    department: Optional[str] = Query(None, description="Filter by department"),
    current_user: Optional[dict] = Depends(get_current_user),
):
    """List all students with optional search and filters. Mentors see only assigned students.

    Uses bulk queries (2 total regardless of student count) to avoid N+1 DB round-trips.
    """
    # ── 1. Bulk fetch — 4 DB queries total ─────────────────────────────────────
    all_details     = db_service.get_all_student_details()           # 1 query
    all_users       = db_service.get_all_student_users_bulk()        # 1 query
    all_ivs         = db_service.get_all_interventions_bulk()        # 1 query
    all_assignments = db_service.get_all_mentor_assignments_bulk()   # 1 query (JOIN)

    # Init ML services once outside the loop (loading model once, not N times)
    try:
        model_service = ModelService()
    except Exception:
        model_service = None
    try:
        shap_service = ShapService()
    except Exception:
        shap_service = None

    # ── 2. Assemble profiles in Python — zero additional DB calls ──────────────
    student_profiles = []
    for d in all_details:
        sid = d.get("student_id", "")
        if not sid:
            continue

        # Student name from bulk user dict
        user = all_users.get(sid)
        student_name = (user.get("full_name") or user.get("name") or f"Student {sid}") if user else f"Student {sid}"

        # Risk scoring (CPU-bound, no DB)
        dropout_probability = 0.0
        risk_category = "Low"
        risk_factors = []
        if d and model_service:
            try:
                pred = model_service.predict(d)
                dropout_probability = pred["risk_score"]
                risk_category = pred["risk_band"].capitalize()
                if shap_service:
                    for r in shap_service.explain(d, top_n=5):
                        impact = r.get("impact", 0)
                        tier = "major" if abs(impact) > 0.1 else "moderate" if abs(impact) > 0.05 else "minor"
                        risk_factors.append({
                            "factor": r.get("feature", "unknown"),
                            "tier": tier,
                            "direction": "risk" if impact > 0 else "protective",
                        })
            except Exception:
                pass

        # Approval rates (in-memory arithmetic)
        sem1_approved = d.get("units_approved_sem1", 0) or 0
        sem1_enrolled = d.get("units_enrolled_sem1", 1) or 1
        sem2_approved = d.get("units_approved_sem2", 0) or 0
        sem2_enrolled = d.get("units_enrolled_sem2", 1) or 1
        total_enrolled = sem1_enrolled + sem2_enrolled
        total_approved = sem1_approved + sem2_approved
        approval_rate = round(total_approved / total_enrolled, 4) if total_enrolled > 0 else 0.0
        curricular_units_failed = max(0, sem1_enrolled - sem1_approved) + max(0, sem2_enrolled - sem2_approved)

        # Interventions from bulk dict
        ivs_for_student = all_ivs.get(sid, [])
        interventions = [
            {
                "type": iv.get("type", "Academic Advising"),
                "date": iv.get("created_at"),
                "notes": iv.get("notes", ""),
                "status": iv.get("status", "Open"),
                "mentor_name": iv.get("mentor_name", ""),
            }
            for iv in ivs_for_student
        ]

        # Assigned mentor — check latest intervention first (most authoritative),
        # then fall back to mentor_assignments JOIN table
        assigned_mentor = None
        assigned_mentor_id = None
        if ivs_for_student:
            latest_iv = ivs_for_student[0]  # sorted newest-first by bulk query
            assigned_mentor = latest_iv.get("mentor_name") or latest_iv.get("assigned_mentor")
            assigned_mentor_id = latest_iv.get("assigned_mentor")
        if not assigned_mentor:
            asgn = all_assignments.get(sid)
            if asgn:
                assigned_mentor = asgn.get("mentor_name")
                assigned_mentor_id = asgn.get("mentor_id") or assigned_mentor_id

        student_profiles.append({
            "student_id": sid,
            "student_name": student_name,
            "department": d.get("department"),
            "semester": d.get("semester"),
            "admission_grade": d.get("admission_grade"),
            "age_at_enrollment": d.get("age_at_enrollment"),
            "scholarship_holder": d.get("scholarship_holder"),
            "tuition_fees_up_to_date": d.get("tuition_fees_current"),
            "curricular_units_1st_sem_enrolled": d.get("units_enrolled_sem1"),
            "curricular_units_1st_sem_approved": d.get("units_approved_sem1"),
            "curricular_units_2nd_sem_enrolled": d.get("units_enrolled_sem2"),
            "curricular_units_2nd_sem_approved": d.get("units_approved_sem2"),
            "curricular_units_failed": curricular_units_failed,
            "approval_rate": approval_rate,
            "attendance_percentage": d.get("attendance_percentage"),
            "dropout_probability": dropout_probability,
            "risk_category": risk_category,
            "risk_factors": risk_factors,
            "interventions": interventions,
            # Mentor assignment — used by StudentList filter and MentorAssignDropdown
            "assigned_mentor": assigned_mentor,
            "assigned_mentor_id": assigned_mentor_id,
            "assignedMentorId": assigned_mentor_id,
            "assignedMentor": assigned_mentor,
        })

    # ── 3. Role-based scoping ──────────────────────────────────────────────────
    role = (current_user.get("role", "") if current_user else "")
    if role.lower() == "mentor":
        mentor_id = current_user.get("mentorId") or current_user.get("mentor_id")
        if mentor_id:
            assignments = db_service.get_students_by_mentor(mentor_id)
            assigned_ids = {a["student_id"] for a in assignments}
            student_profiles = [p for p in student_profiles if p["student_id"] in assigned_ids]

    # ── 4. Optional filters ────────────────────────────────────────────────────
    if search:
        search_lower = search.lower()
        student_profiles = [
            p for p in student_profiles
            if search_lower in p["student_id"].lower() or search_lower in p["student_name"].lower()
        ]
    if risk_level:
        student_profiles = [
            p for p in student_profiles
            if p["risk_category"].lower() == risk_level.lower()
        ]
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
