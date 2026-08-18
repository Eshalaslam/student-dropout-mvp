"""
Report routes — generate previews, export CSV/PDF, manage history and schedules.
"""
import csv
import io
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import get_current_user
from backend.app.schemas.report import ScheduledReportCreate

router = APIRouter()


def _apply_filters(profiles: list, department: Optional[str], risk_band: Optional[str],
                   mentor_id: Optional[str], status_filter: Optional[str]) -> list:
    """Apply query filters to student profiles."""
    if department:
        profiles = [p for p in profiles if (p.get("department") or "").lower() == department.lower()]
    if risk_band:
        profiles = [p for p in profiles if (p.get("risk_category") or "").lower() == risk_band.lower()]
    if mentor_id:
        profiles = [p for p in profiles if p.get("assigned_mentor") == mentor_id]
    if status_filter:
        profiles = [p for p in profiles if (p.get("intervention_status") or "").lower() == status_filter.lower()]
    return profiles


@router.get("/preview")
def preview_report(
    type: str = Query("risk_summary", description="Report type"),
    department: Optional[str] = Query(None),
    risk_band: Optional[str] = Query(None),
    mentor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None, alias="status"),
    date: Optional[str] = Query(None, description="Date filter"),
    current_user: dict = Depends(get_current_user),
):
    """Generate a report preview with optional filters."""
    all_details = db_service.get_all_student_details()
    profiles = []
    for d in all_details:
        sid = d.get("student_id", "")
        # Quick profile
        from backend.app.routes.interventions import _get_intervention_student_profile
        profile = _get_intervention_student_profile(sid)
        profiles.append(profile)

    profiles = _apply_filters(profiles, department, risk_band, mentor_id, status)

    total = len(profiles)
    high = sum(1 for p in profiles if p.get("risk_category") == "High")
    medium = sum(1 for p in profiles if p.get("risk_category") == "Medium")
    low = sum(1 for p in profiles if p.get("risk_category") == "Low")

    return {
        "type": type,
        "total_students": total,
        "high_risk_count": high,
        "medium_risk_count": medium,
        "low_risk_count": low,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "filters": {
            "department": department,
            "risk_band": risk_band,
            "mentor_id": mentor_id,
            "status": status,
            "date": date,
        },
        "students": profiles[:50],  # Cap preview
    }


@router.post("/export")
def export_report(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """Export a report as CSV based on filters."""
    report_type = body.get("type", "risk_summary")
    dept = body.get("department")
    risk_band = body.get("risk_band")
    mentor_id = body.get("mentor_id")
    status_filter = body.get("status")
    export_format = body.get("format", "csv")

    all_details = db_service.get_all_student_details()
    profiles = []
    for d in all_details:
        sid = d.get("student_id", "")
        from backend.app.routes.interventions import _get_intervention_student_profile
        profile = _get_intervention_student_profile(sid)
        profiles.append(profile)

    profiles = _apply_filters(profiles, dept, risk_band, mentor_id, status_filter)

    # Save report record
    report_record = db_service.create_report({
        "name": f"{report_type}_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
        "type": report_type,
        "generated_by": current_user.get("sub", "system"),
        "size": f"{len(profiles)} students",
        "filters": {"department": dept, "risk_band": risk_band, "mentor_id": mentor_id, "status": status_filter},
    })

    # Log access
    db_service.log_access(
        user_name=current_user.get("sub", ""),
        role=current_user.get("role", ""),
        action=f"Exported {report_type} report ({len(profiles)} students)",
    )

    if export_format == "csv":
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "student_id", "student_name", "department", "semester",
            "dropout_probability", "risk_category", "approval_rate",
            "attendance_percentage", "intervention_status", "assigned_mentor",
        ])
        for p in profiles:
            writer.writerow([
                p.get("student_id", ""),
                p.get("student_name", ""),
                p.get("department", ""),
                p.get("semester", ""),
                p.get("dropout_probability", 0),
                p.get("risk_category", ""),
                p.get("approval_rate", 0),
                p.get("attendance_percentage", ""),
                p.get("intervention_status", ""),
                p.get("assigned_mentor", ""),
            ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={report_record.get('name', 'report')}.csv"
            },
        )

    # Default: return JSON
    return {
        "report_id": report_record.get("id"),
        "name": report_record.get("name"),
        "type": report_type,
        "total_students": len(profiles),
        "students": profiles,
    }


@router.get("/history")
def get_report_history(current_user: dict = Depends(get_current_user)):
    """Get list of previously generated reports."""
    reports = db_service.get_reports_history()
    return [
        {
            "id": r.get("id"),
            "name": r.get("name"),
            "type": r.get("type"),
            "generatedBy": r.get("generated_by"),
            "date": r.get("date"),
            "size": r.get("size"),
        }
        for r in reports
    ]


@router.get("/schedule")
def get_report_schedules(current_user: dict = Depends(get_current_user)):
    """Get all scheduled reports."""
    schedules = db_service.get_schedules()
    return [
        {
            "id": s.get("id"),
            "name": s.get("name"),
            "type": s.get("type"),
            "frequency": s.get("frequency"),
            "email": s.get("email"),
            "active": s.get("active", True),
        }
        for s in schedules
    ]


@router.post("/schedule")
def create_report_schedule(
    body: ScheduledReportCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new scheduled report."""
    if body.frequency not in ("Weekly", "Monthly"):
        raise HTTPException(status_code=400, detail="Frequency must be 'Weekly' or 'Monthly'")

    schedule = db_service.create_schedule({
        "name": body.name,
        "type": body.type,
        "frequency": body.frequency,
        "email": body.email,
    })
    return {
        "id": schedule.get("id"),
        "name": schedule.get("name"),
        "type": schedule.get("type"),
        "frequency": schedule.get("frequency"),
        "email": schedule.get("email"),
        "active": schedule.get("active", True),
    }


@router.delete("/schedule/{schedule_id}")
def delete_report_schedule(schedule_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a scheduled report by ID."""
    deleted = db_service.delete_schedule(schedule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Schedule '{schedule_id}' not found")
    return {"message": "Schedule deleted successfully", "id": schedule_id}
