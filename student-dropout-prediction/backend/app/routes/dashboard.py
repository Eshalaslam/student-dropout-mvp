"""
Dashboard routes — aggregate statistics, risk distribution, department breakdown, etc.
Computes risk dynamically from student features using the ML model.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import get_current_user
from backend.app.services.model_service import ModelService
from backend.app.services.shap_service import ShapService

router = APIRouter()


def _compute_risk_for_all_students() -> list[dict]:
    """Compute risk for all students from their stored features."""
    all_details = db_service.get_all_student_details()
    results = []
    model_service = ModelService()
    shap_service = ShapService()

    for d in all_details:
        sid = d.get("student_id", "")
        user = db_service.get_user_by_student_id(sid)
        name = (user.get("full_name") or user.get("name") or f"Student {sid}") if user else f"Student {sid}"
        dept = d.get("department", "Unknown")

        try:
            pred = model_service.predict(d)
            risk_score = pred["risk_score"]
            risk_band = pred["risk_band"].capitalize()  # High, Medium, Low
        except Exception:
            risk_score = 0.0
            risk_band = "Low"

        # Approval rate
        sem1_approved = d.get("units_approved_sem1", 0)
        sem1_enrolled = d.get("units_enrolled_sem1", 1)
        sem2_approved = d.get("units_approved_sem2", 0)
        sem2_enrolled = d.get("units_enrolled_sem2", 1)
        total_enrolled = sem1_enrolled + sem2_enrolled
        total_approved = sem1_approved + sem2_approved
        approval_rate = round(total_approved / total_enrolled, 4) if total_enrolled > 0 else 0.0

        # Top risk factors
        risk_factors = []
        try:
            shap_reasons = shap_service.explain(d, top_n=3)
            for r in shap_reasons:
                if r.get("category") == "risk":
                    risk_factors.append(r.get("feature", "unknown"))
        except Exception:
            pass

        results.append({
            "student_id": sid,
            "student_name": name,
            "department": dept,
            "risk_score": risk_score,
            "risk_band": risk_band,
            "risk_category": risk_band,
            "approval_rate": approval_rate,
            "attendance_percentage": d.get("attendance_percentage"),
            "top_risk_factor": risk_factors[0] if risk_factors else None,
        })

    return results


@router.get("/stats")
def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Dashboard overview stats: total students, risk counts, active interventions."""
    students = _compute_risk_for_all_students()
    high_risk = sum(1 for s in students if s.get("risk_category") == "High")
    medium_risk = sum(1 for s in students if s.get("risk_category") == "Medium")
    low_risk = sum(1 for s in students if s.get("risk_category") == "Low")

    # Count active interventions
    all_interventions = db_service.get_interventions()
    active_interventions = sum(
        1 for i in all_interventions
        if i.get("status") in ("Not Started", "In Progress", "Escalated")
    )

    return {
        "total_students": len(students),
        "high_risk_count": high_risk,
        "medium_risk_count": medium_risk,
        "low_risk_count": low_risk,
        "active_interventions": active_interventions,
    }


@router.get("/risk-distribution")
def get_risk_distribution(current_user: dict = Depends(get_current_user)):
    """Get count of students by risk band: high, medium, low."""
    students = _compute_risk_for_all_students()
    high = sum(1 for s in students if s.get("risk_category") == "High")
    medium = sum(1 for s in students if s.get("risk_category") == "Medium")
    low = sum(1 for s in students if s.get("risk_category") == "Low")
    return {"high": high, "medium": medium, "low": low}


@router.get("/department-breakdown")
def get_department_breakdown(current_user: dict = Depends(get_current_user)):
    """Get average risk percentage per department."""
    students = _compute_risk_for_all_students()
    dept_data: dict[str, list[float]] = {}
    for s in students:
        dept = s.get("department", "Unknown")
        if dept not in dept_data:
            dept_data[dept] = []
        dept_data[dept].append(s.get("risk_score", 0.0) * 100)

    result = []
    for dept, percentages in sorted(dept_data.items()):
        avg = round(sum(percentages) / len(percentages), 1) if percentages else 0.0
        result.append({"department": dept, "average_risk_percentage": avg})
    return result


@router.get("/top-risk-drivers")
def get_top_risk_drivers(current_user: dict = Depends(get_current_user)):
    """Get top risk factors from SHAP explanations across all students."""
    all_details = db_service.get_all_student_details()
    factor_counts: dict[str, int] = {}

    shap_service = ShapService()
    for d in all_details:
        try:
            shap_reasons = shap_service.explain(d, top_n=5)
            for r in shap_reasons:
                cat = r.get("category", "risk")
                if cat == "risk":
                    feat = r.get("feature", "unknown")
                    factor_counts[feat] = factor_counts.get(feat, 0) + 1
        except Exception:
            pass

    sorted_factors = sorted(factor_counts.items(), key=lambda x: x[1], reverse=True)
    return [{"factor": f, "count": c} for f, c in sorted_factors[:10]]


@router.get("/priority-outreach")
def get_priority_outreach(current_user: dict = Depends(get_current_user)):
    """Get high-risk students sorted by highest dropout probability."""
    students = _compute_risk_for_all_students()
    high_risk = [s for s in students if s.get("risk_category") == "High"]
    high_risk.sort(key=lambda x: x.get("risk_score", 0), reverse=True)
    return high_risk[:20]


@router.get("/summary")
def get_dashboard_summary(current_user: Optional[dict] = Depends(get_current_user)):
    """Aggregate dashboard summary with counts, averages, and status."""
    students = _compute_risk_for_all_students()
    high = sum(1 for s in students if s.get("risk_category") == "High")
    medium = sum(1 for s in students if s.get("risk_category") == "Medium")
    low = sum(1 for s in students if s.get("risk_category") == "Low")
    scores = [s.get("risk_score", 0.0) for s in students]
    avg_score = round(sum(scores) / len(scores), 4) if scores else 0.0

    all_interventions = db_service.get_interventions()
    active_interventions = sum(
        1 for i in all_interventions
        if i.get("status") in ("Not Started", "In Progress", "Escalated")
    )

    return {
        "total_students": len(students),
        "high_risk_count": high,
        "medium_risk_count": medium,
        "low_risk_count": low,
        "flagged_count": high,
        "average_risk_score": avg_score,
        "active_interventions": active_interventions,
        "database_connected": db_service.is_supabase_connected,
    }


@router.get("/interventions")
def get_dashboard_interventions(
    student_id: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Fetch interventions with optional student filter."""
    return db_service.get_interventions(student_id)


@router.post("/interventions", status_code=201)
def create_dashboard_intervention(
    body: dict,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Record an intervention from dashboard."""
    mentor_name = body.get("mentor_name") or (current_user.get("name") if current_user else "Mentor")
    assigned_mentor = body.get("assigned_mentor") or (current_user.get("mentorId") if current_user else None)
    int_status = body.get("status", "Not Started")

    record = {
        "student_id": body.get("student_id"),
        "mentor_name": mentor_name,
        "type": body.get("type", "Academic Advising"),
        "notes": body.get("notes", ""),
        "status": int_status,
        "assigned_mentor": assigned_mentor,
    }
    return db_service.create_intervention(record)


@router.patch("/interventions/{intervention_id}")
def update_dashboard_intervention(
    intervention_id: str,
    body: dict,
    current_user: Optional[dict] = Depends(get_current_user),
):
    """Update intervention status or notes."""
    updated = db_service.update_intervention(intervention_id, body)
    if not updated:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Intervention not found")
    return updated
