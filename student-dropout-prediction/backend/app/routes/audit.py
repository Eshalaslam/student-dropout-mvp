"""
Audit routes — fairness analysis, feature disclosure, access logs, privacy docs.
All endpoints are Admin-only.
"""
import csv
import io
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import require_admin
from backend.app.schemas.audit import FeatureInfluence

router = APIRouter()


@router.get("/fairness")
def get_fairness_audit(
    attribute: Optional[str] = Query(None, description="Demographic attribute: gender, category, region, age_band"),
    current_user: dict = Depends(require_admin),
):
    """Get demographic fairness audit results by attribute."""
    if attribute:
        result = db_service.get_fairness_result(attribute)
        if not result:
            raise HTTPException(status_code=404, detail=f"No fairness result for attribute '{attribute}'")
        return result

    # Return all fairness results
    results = db_service.get_all_fairness_results()
    return results


@router.get("/feature-disclosure")
def get_feature_disclosure(current_user: dict = Depends(require_admin)):
    """Get feature influence disclosure table."""
    features = db_service.get_feature_influences()
    return [
        {
            "feature": f.get("feature"),
            "sensitive": f.get("sensitive", False),
            "usedInModel": f.get("used_in_model", True),
            "auditOnly": f.get("audit_only", False),
        }
        for f in features
    ]


@router.get("/access-log")
def get_access_log(
    user: Optional[str] = Query(None, alias="user", description="Filter by user name"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    current_user: dict = Depends(require_admin),
):
    """Get access compliance logs with optional user/action filters."""
    logs = db_service.get_access_logs(user_name=user, action=action)
    return [
        {
            "id": l.get("id"),
            "timestamp": l.get("timestamp"),
            "user": l.get("user_name"),
            "role": l.get("role"),
            "action": l.get("action"),
            "studentId": l.get("student_id"),
        }
        for l in logs
    ]


@router.get("/privacy-docs")
def get_privacy_docs(current_user: dict = Depends(require_admin)):
    """Get the current privacy documentation."""
    doc = db_service.get_privacy_doc()
    if not doc:
        return {"content": "", "updated_at": None}
    return {
        "content": doc.get("content", ""),
        "updated_at": doc.get("updated_at"),
    }


@router.put("/privacy-docs")
def update_privacy_docs(
    body: dict,
    current_user: dict = Depends(require_admin),
):
    """Update privacy documentation."""
    content = body.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")

    doc = db_service.update_privacy_doc(content)

    # Log access
    db_service.log_access(
        user_name=current_user.get("sub", "admin"),
        role="Admin",
        action="Updated privacy documentation",
    )

    return {
        "content": doc.get("content", ""),
        "updated_at": doc.get("updated_at"),
    }


@router.get("/export")
def export_audit(
    current_user: dict = Depends(require_admin),
):
    """Export full audit data as CSV."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Access logs
    writer.writerow(["=== ACCESS LOGS ==="])
    writer.writerow(["timestamp", "user", "role", "action", "student_id"])
    logs = db_service.get_access_logs()
    for l in logs:
        writer.writerow([
            l.get("timestamp", ""),
            l.get("user_name", ""),
            l.get("role", ""),
            l.get("action", ""),
            l.get("student_id", ""),
        ])

    writer.writerow([])
    writer.writerow(["=== FAIRNESS RESULTS ==="])
    writer.writerow(["attribute", "threshold", "overall_recall", "overall_fnr"])
    fairness = db_service.get_all_fairness_results()
    for f in fairness:
        overall = f.get("overall", {})
        if isinstance(overall, str):
            import json
            try:
                overall = json.loads(overall)
            except Exception:
                overall = {}
        writer.writerow([
            f.get("attribute", ""),
            f.get("threshold", ""),
            overall.get("recall", ""),
            overall.get("fnr", ""),
        ])

    writer.writerow([])
    writer.writerow(["=== FEATURE INFLUENCE ==="])
    writer.writerow(["feature", "sensitive", "used_in_model", "audit_only"])
    features = db_service.get_feature_influences()
    for feat in features:
        writer.writerow([
            feat.get("feature", ""),
            feat.get("sensitive", False),
            feat.get("used_in_model", True),
            feat.get("audit_only", False),
        ])

    output.seek(0)

    # Log access
    db_service.log_access(
        user_name=current_user.get("sub", "admin"),
        role="Admin",
        action="Exported full audit report",
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_export.csv"},
    )
