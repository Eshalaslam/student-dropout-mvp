"""
Automated unit & integration tests for Student Dropout Prediction API.
Tests Authentication, Details Entry, ML Inference + SHAP Explainability,
Supabase / DB Persistence, and Dashboard Metrics.
"""
try:
    import pytest
except ImportError:
    pytest = None
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_and_health():
    """Verify root and health endpoints."""
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "message" in res_root.json()

    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    data = res_health.json()
    assert data["status"] == "healthy"
    assert data["services"]["ml_model"] is True


def test_student_registration_and_login():
    """Test full student auth workflow."""
    # 1. Register
    reg_payload = {
        "email": "emma.watson@campus.edu",
        "password": "securepassword123",
        "full_name": "Emma Watson",
        "student_id": "STU99001",
        "role": "student"
    }
    res_reg = client.post("/api/auth/register", json=reg_payload)
    assert res_reg.status_code == 201
    reg_data = res_reg.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["student_id"] == "STU99001"
    token = reg_data["access_token"]

    # 2. Access /api/auth/me with Bearer token
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "emma.watson@campus.edu"

    # 3. Login with student ID
    res_login = client.post("/api/auth/login", json={
        "email_or_student_id": "STU99001",
        "password": "securepassword123"
    })
    assert res_login.status_code == 200
    assert res_login.json()["user"]["full_name"] == "Emma Watson"


def test_mentor_registration():
    """Test mentor registration and role assignment."""
    reg_payload = {
        "email": "prof.davis@campus.edu",
        "password": "mentorpassword123",
        "full_name": "Prof. Charles Davis",
        "role": "mentor"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201
    assert res.json()["user"]["role"] == "mentor"


def test_student_details_save_and_retrieve():
    """Test entering student dataset details and retrieving them."""
    student_id = "STU99001"
    features_payload = {
        "marital_status": 1,
        "application_mode": 1,
        "application_order": 1,
        "course": 9254,
        "daytime_attendance": 1,
        "age_at_enrollment": 19,
        "previous_qualification": 1,
        "previous_qualification_grade": 140.0,
        "mothers_qualification": 1,
        "fathers_qualification": 1,
        "mothers_occupation": 4,
        "fathers_occupation": 4,
        "admission_grade": 135.0,
        "displaced": 1,
        "special_needs": 0,
        "debtor": 0,
        "tuition_fees_current": 1,
        "gender": 0,
        "scholarship_holder": 1,
        "units_credited_sem1": 0,
        "units_enrolled_sem1": 6,
        "evaluations_sem1": 6,
        "units_approved_sem1": 6,
        "grade_sem1": 15.0,
        "no_evaluations_sem1": 0,
        "units_credited_sem2": 0,
        "units_enrolled_sem2": 6,
        "evaluations_sem2": 6,
        "units_approved_sem2": 6,
        "grade_sem2": 15.5,
        "no_evaluations_sem2": 0,
        "unemployment_rate": 10.8,
        "inflation_rate": 1.4,
        "gdp": 1.74
    }

    # Save details
    res_save = client.post(f"/api/students/{student_id}/details", json=features_payload)
    assert res_save.status_code == 200
    assert res_save.json()["student_id"] == student_id

    # Retrieve details
    res_get = client.get(f"/api/students/{student_id}/details")
    assert res_get.status_code == 200
    details = res_get.json()
    assert details["student_id"] == student_id
    assert details["grade_sem1"] == 15.0
    assert details["scholarship_holder"] == 1


def test_prediction_with_shap_and_db_storage():
    """Test model prediction, SHAP explanation, recommendations, and persistence."""
    student_id = "STU99001"
    features_payload = {
        "marital_status": 1,
        "application_mode": 1,
        "application_order": 1,
        "course": 9254,
        "daytime_attendance": 1,
        "age_at_enrollment": 19,
        "previous_qualification": 1,
        "previous_qualification_grade": 140.0,
        "mothers_qualification": 1,
        "fathers_qualification": 1,
        "mothers_occupation": 4,
        "fathers_occupation": 4,
        "admission_grade": 135.0,
        "displaced": 1,
        "special_needs": 0,
        "debtor": 0,
        "tuition_fees_current": 1,
        "gender": 0,
        "scholarship_holder": 1,
        "units_credited_sem1": 0,
        "units_enrolled_sem1": 6,
        "evaluations_sem1": 6,
        "units_approved_sem1": 6,
        "grade_sem1": 15.0,
        "no_evaluations_sem1": 0,
        "units_credited_sem2": 0,
        "units_enrolled_sem2": 6,
        "evaluations_sem2": 6,
        "units_approved_sem2": 6,
        "grade_sem2": 15.5,
        "no_evaluations_sem2": 0,
        "unemployment_rate": 10.8,
        "inflation_rate": 1.4,
        "gdp": 1.74
    }

    res_pred = client.post(f"/api/prediction/predict?student_id={student_id}", json=features_payload)
    assert res_pred.status_code == 200
    data = res_pred.json()

    assert data["student_id"] == student_id
    assert "risk_score" in data
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["risk_band"] in ["low", "medium", "high"]
    assert isinstance(data["flagged"], bool)
    assert len(data["top_reasons"]) > 0
    assert "feature" in data["top_reasons"][0]
    assert "impact" in data["top_reasons"][0]
    assert "description" in data["top_reasons"][0]
    assert len(data["recommendations"]) > 0

    # Verify prediction is persisted in history
    res_hist = client.get(f"/api/students/{student_id}/history")
    assert res_hist.status_code == 200
    hist_data = res_hist.json()
    assert hist_data["total_records"] >= 1
    assert hist_data["history"][0]["student_id"] == student_id


def test_high_risk_prediction_profile():
    """Test that a student profile with failing grades and debt receives a high risk prediction."""
    at_risk_payload = {
        "marital_status": 1,
        "application_mode": 15,
        "application_order": 1,
        "course": 9254,
        "daytime_attendance": 0,
        "age_at_enrollment": 32,
        "previous_qualification": 1,
        "previous_qualification_grade": 105.0,
        "mothers_qualification": 1,
        "fathers_qualification": 1,
        "mothers_occupation": 9,
        "fathers_occupation": 9,
        "admission_grade": 100.0,
        "displaced": 0,
        "special_needs": 0,
        "debtor": 1,
        "tuition_fees_current": 0,
        "gender": 1,
        "scholarship_holder": 0,
        "units_credited_sem1": 0,
        "units_enrolled_sem1": 6,
        "evaluations_sem1": 6,
        "units_approved_sem1": 0,
        "grade_sem1": 0.0,
        "no_evaluations_sem1": 0,
        "units_credited_sem2": 0,
        "units_enrolled_sem2": 6,
        "evaluations_sem2": 6,
        "units_approved_sem2": 0,
        "grade_sem2": 0.0,
        "no_evaluations_sem2": 0,
        "unemployment_rate": 16.2,
        "inflation_rate": 2.8,
        "gdp": -1.5
    }

    res = client.post("/api/prediction/predict?student_id=STU_HIGH_RISK", json=at_risk_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["risk_band"] == "high"
    assert data["flagged"] is True
    assert data["risk_score"] > 0.6


def test_dashboard_summary_and_interventions():
    """Test dashboard metrics calculation and intervention workflow."""
    # 1. Summary
    res_sum = client.get("/api/dashboard/summary")
    assert res_sum.status_code == 200
    summary = res_sum.json()
    assert summary["total_students"] >= 1
    assert "high_risk_count" in summary
    assert "average_risk_score" in summary

    # 2. Create Intervention
    interv_payload = {
        "student_id": "STU_HIGH_RISK",
        "mentor_name": "Dr. Sarah Mitchell",
        "type": "Urgent Academic & Financial Advising",
        "notes": "Student discussed tuition payment schedule and enrolled in peer tutoring for math.",
        "status": "In Progress"
    }
    res_interv = client.post("/api/dashboard/interventions", json=interv_payload)
    assert res_interv.status_code == 201
    interv_data = res_interv.json()
    interv_id = interv_data["id"]
    assert interv_data["student_id"] == "STU_HIGH_RISK"

    # 3. Update Intervention Status
    res_patch = client.patch(f"/api/dashboard/interventions/{interv_id}", json={
        "status": "Resolved",
        "notes": "Emergency grant approved and student completed tutoring milestone."
    })
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "Resolved"

    # 4. List Interventions for Student
    res_list = client.get("/api/dashboard/interventions?student_id=STU_HIGH_RISK")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1
