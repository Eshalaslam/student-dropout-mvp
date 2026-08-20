"""
Seed Data Script for Student Dropout Early-Warning System.

Creates demo data:
- 1 admin user (admin / admin123)
- 3 mentors with assigned students
- 10 students with full ML model training features
- Sample interventions and reports

Usage:
    cd student-dropout-prediction
    python -m backend.seed_data
"""
import sys
import os

# Add the project root to sys.path so imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "."))

from backend.app.db.supabase_client import db_service
from backend.app.services.auth_service import AuthService


def seed_admin():
    """Create admin user."""
    print("Seeding admin user...")
    existing = db_service.get_user_by_username("admin")
    if existing:
        print("  Admin user already exists.")
        return

    db_service.create_user({
        "email": "admin@dropout-system.edu",
        "password_hash": AuthService.hash_password("admin123"),
        "full_name": "System Administrator",
        "username": "admin",
        "role": "admin",
        "status": "Active",
    })
    print("  Created admin: admin / admin123")


def seed_mentors():
    """Create 3 mentors."""
    print("Seeding mentors...")
    mentors_data = [
        {
            "username": "priya",
            "password": "password",
            "name": "Dr. Priya Nair",
            "email": "priya@university.edu",
            "mentor_id": "M001",
        },
        {
            "username": "james",
            "password": "password",
            "name": "James O'Connor",
            "email": "james@university.edu",
            "mentor_id": "M002",
        },
        {
            "username": "sarah",
            "password": "password",
            "name": "Sarah Kim",
            "email": "sarah@university.edu",
            "mentor_id": "M003",
        },
        {
            "username": "mentor_james",
            "password": "mentor123",
            "name": "Dr. James Wilson",
            "email": "james.wilson@dropout-system.edu",
            "mentor_id": "MNT-001",
        },
        {
            "username": "mentor_sarah",
            "password": "mentor123",
            "name": "Prof. Sarah Chen",
            "email": "sarah.chen@dropout-system.edu",
            "mentor_id": "MNT-002",
        },
        {
            "username": "mentor_maria",
            "password": "mentor123",
            "name": "Dr. Maria Rodriguez",
            "email": "maria.rodriguez@dropout-system.edu",
            "mentor_id": "MNT-003",
        },
    ]

    created_mentors = []
    for md in mentors_data:
        existing = db_service.get_mentor_by_id(md["mentor_id"])
        if existing:
            print(f"  Mentor {md['name']} already exists.")
            created_mentors.append(existing)
            continue

        password_hash = AuthService.hash_password(md["password"])
        mentor = db_service.create_mentor({
            "username": md["username"],
            "password_hash": password_hash,
            "name": md["name"],
            "email": md["email"],
            "mentor_id": md["mentor_id"],
        })
        created_mentors.append(mentor)
        print(f"  Created mentor: {md['username']} / {md['password']} ({md['name']})")

    return created_mentors


# Student data: 10 students with FULL model training features
STUDENTS = [
    {
        "student_id": "STU-1001",
        "student_name": "Alice Thompson",
        "department": "Computer Science",
        "semester": 3,
        "marital_status": 1, "application_mode": 1, "application_order": 1,
        "course": 9254, "daytime_attendance": 1, "age_at_enrollment": 19,
        "previous_qualification": 1, "previous_qualification_grade": 140.0,
        "mothers_qualification": 19, "fathers_qualification": 19,
        "mothers_occupation": 9, "fathers_occupation": 9,
        "admission_grade": 150.0, "displaced": 0, "special_needs": 0,
        "debtor": 0, "tuition_fees_current": 1, "gender": 0,
        "scholarship_holder": 1,
        "units_credited_sem1": 0, "units_enrolled_sem1": 6,
        "evaluations_sem1": 6, "units_approved_sem1": 6,
        "grade_sem1": 15.2, "no_evaluations_sem1": 0,
        "units_credited_sem2": 0, "units_enrolled_sem2": 6,
        "evaluations_sem2": 6, "units_approved_sem2": 6,
        "grade_sem2": 15.8, "no_evaluations_sem2": 0,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 95.0,
    },
    {
        "student_id": "STU-1002",
        "student_name": "Bob Martinez",
        "department": "Engineering",
        "semester": 2,
        "marital_status": 1, "application_mode": 1, "application_order": 2,
        "course": 9119, "daytime_attendance": 1, "age_at_enrollment": 20,
        "previous_qualification": 1, "previous_qualification_grade": 120.0,
        "mothers_qualification": 1, "fathers_qualification": 1,
        "mothers_occupation": 5, "fathers_occupation": 5,
        "admission_grade": 125.0, "displaced": 0, "special_needs": 0,
        "debtor": 1, "tuition_fees_current": 0, "gender": 1,
        "scholarship_holder": 0,
        "units_credited_sem1": 0, "units_enrolled_sem1": 6,
        "evaluations_sem1": 4, "units_approved_sem1": 2,
        "grade_sem1": 9.5, "no_evaluations_sem1": 2,
        "units_credited_sem2": 0, "units_enrolled_sem2": 6,
        "evaluations_sem2": 3, "units_approved_sem2": 1,
        "grade_sem2": 8.0, "no_evaluations_sem2": 3,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 55.0,
    },
    {
        "student_id": "STU-1003",
        "student_name": "Clara Nguyen",
        "department": "Business",
        "semester": 4,
        "marital_status": 2, "application_mode": 1, "application_order": 1,
        "course": 9085, "daytime_attendance": 1, "age_at_enrollment": 22,
        "previous_qualification": 1, "previous_qualification_grade": 135.0,
        "mothers_qualification": 10, "fathers_qualification": 10,
        "mothers_occupation": 7, "fathers_occupation": 7,
        "admission_grade": 130.0, "displaced": 0, "special_needs": 0,
        "debtor": 0, "tuition_fees_current": 1, "gender": 0,
        "scholarship_holder": 0,
        "units_credited_sem1": 0, "units_enrolled_sem1": 6,
        "evaluations_sem1": 6, "units_approved_sem1": 5,
        "grade_sem1": 13.0, "no_evaluations_sem1": 0,
        "units_credited_sem2": 0, "units_enrolled_sem2": 6,
        "evaluations_sem2": 6, "units_approved_sem2": 5,
        "grade_sem2": 13.5, "no_evaluations_sem2": 0,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 85.0,
    },
    {
        "student_id": "STU-1004",
        "student_name": "David Kim",
        "department": "Computer Science",
        "semester": 3,
        "marital_status": 1, "application_mode": 1, "application_order": 3,
        "course": 9254, "daytime_attendance": 1, "age_at_enrollment": 18,
        "previous_qualification": 1, "previous_qualification_grade": 160.0,
        "mothers_qualification": 19, "fathers_qualification": 19,
        "mothers_occupation": 9, "fathers_occupation": 9,
        "admission_grade": 165.0, "displaced": 0, "special_needs": 0,
        "debtor": 0, "tuition_fees_current": 1, "gender": 1,
        "scholarship_holder": 1,
        "units_credited_sem1": 0, "units_enrolled_sem1": 6,
        "evaluations_sem1": 6, "units_approved_sem1": 6,
        "grade_sem1": 16.0, "no_evaluations_sem1": 0,
        "units_credited_sem2": 0, "units_enrolled_sem2": 6,
        "evaluations_sem2": 6, "units_approved_sem2": 6,
        "grade_sem2": 16.5, "no_evaluations_sem2": 0,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 98.0,
    },
    {
        "student_id": "STU-1005",
        "student_name": "Eva Johnson",
        "department": "Psychology",
        "semester": 2,
        "marital_status": 1, "application_mode": 1, "application_order": 1,
        "course": 9070, "daytime_attendance": 0, "age_at_enrollment": 26,
        "previous_qualification": 1, "previous_qualification_grade": 110.0,
        "mothers_qualification": 1, "fathers_qualification": 1,
        "mothers_occupation": 3, "fathers_occupation": 5,
        "admission_grade": 115.0, "displaced": 1, "special_needs": 0,
        "debtor": 0, "tuition_fees_current": 1, "gender": 0,
        "scholarship_holder": 0,
        "units_credited_sem1": 0, "units_enrolled_sem1": 5,
        "evaluations_sem1": 3, "units_approved_sem1": 2,
        "grade_sem1": 10.0, "no_evaluations_sem1": 2,
        "units_credited_sem2": 0, "units_enrolled_sem2": 5,
        "evaluations_sem2": 2, "units_approved_sem2": 1,
        "grade_sem2": 9.0, "no_evaluations_sem2": 3,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 45.0,
    },
    {
        "student_id": "STU-1006",
        "student_name": "Frank Okafor",
        "department": "Engineering",
        "semester": 5,
        "marital_status": 1, "application_mode": 1, "application_order": 1,
        "course": 9119, "daytime_attendance": 1, "age_at_enrollment": 21,
        "previous_qualification": 1, "previous_qualification_grade": 145.0,
        "mothers_qualification": 10, "fathers_qualification": 10,
        "mothers_occupation": 7, "fathers_occupation": 7,
        "admission_grade": 140.0, "displaced": 1, "special_needs": 0,
        "debtor": 0, "tuition_fees_current": 1, "gender": 1,
        "scholarship_holder": 1,
        "units_credited_sem1": 0, "units_enrolled_sem1": 6,
        "evaluations_sem1": 6, "units_approved_sem1": 5,
        "grade_sem1": 14.0, "no_evaluations_sem1": 0,
        "units_credited_sem2": 0, "units_enrolled_sem2": 6,
        "evaluations_sem2": 6, "units_approved_sem2": 5,
        "grade_sem2": 14.5, "no_evaluations_sem2": 0,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 90.0,
    },
    {
        "student_id": "STU-1007",
        "student_name": "Grace Lee",
        "department": "Business",
        "semester": 3,
        "marital_status": 2, "application_mode": 1, "application_order": 2,
        "course": 9085, "daytime_attendance": 1, "age_at_enrollment": 24,
        "previous_qualification": 1, "previous_qualification_grade": 125.0,
        "mothers_qualification": 1, "fathers_qualification": 1,
        "mothers_occupation": 5, "fathers_occupation": 5,
        "admission_grade": 120.0, "displaced": 0, "special_needs": 0,
        "debtor": 1, "tuition_fees_current": 0, "gender": 0,
        "scholarship_holder": 0,
        "units_credited_sem1": 0, "units_enrolled_sem1": 6,
        "evaluations_sem1": 5, "units_approved_sem1": 3,
        "grade_sem1": 11.0, "no_evaluations_sem1": 1,
        "units_credited_sem2": 0, "units_enrolled_sem2": 6,
        "evaluations_sem2": 4, "units_approved_sem2": 2,
        "grade_sem2": 10.0, "no_evaluations_sem2": 2,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 65.0,
    },
    {
        "student_id": "STU-1008",
        "student_name": "Henry Patel",
        "department": "Computer Science",
        "semester": 4,
        "marital_status": 1, "application_mode": 1, "application_order": 1,
        "course": 9254, "daytime_attendance": 1, "age_at_enrollment": 19,
        "previous_qualification": 1, "previous_qualification_grade": 155.0,
        "mothers_qualification": 19, "fathers_qualification": 19,
        "mothers_occupation": 9, "fathers_occupation": 9,
        "admission_grade": 155.0, "displaced": 0, "special_needs": 0,
        "debtor": 0, "tuition_fees_current": 1, "gender": 1,
        "scholarship_holder": 1,
        "units_credited_sem1": 0, "units_enrolled_sem1": 6,
        "evaluations_sem1": 6, "units_approved_sem1": 6,
        "grade_sem1": 15.0, "no_evaluations_sem1": 0,
        "units_credited_sem2": 0, "units_enrolled_sem2": 6,
        "evaluations_sem2": 6, "units_approved_sem2": 5,
        "grade_sem2": 14.5, "no_evaluations_sem2": 0,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 92.0,
    },
    {
        "student_id": "STU-1009",
        "student_name": "Irene Schmidt",
        "department": "Psychology",
        "semester": 2,
        "marital_status": 1, "application_mode": 1, "application_order": 4,
        "course": 9070, "daytime_attendance": 1, "age_at_enrollment": 20,
        "previous_qualification": 1, "previous_qualification_grade": 100.0,
        "mothers_qualification": 1, "fathers_qualification": 1,
        "mothers_occupation": 3, "fathers_occupation": 3,
        "admission_grade": 105.0, "displaced": 0, "special_needs": 1,
        "debtor": 0, "tuition_fees_current": 1, "gender": 0,
        "scholarship_holder": 0,
        "units_credited_sem1": 0, "units_enrolled_sem1": 5,
        "evaluations_sem1": 3, "units_approved_sem1": 1,
        "grade_sem1": 8.5, "no_evaluations_sem1": 2,
        "units_credited_sem2": 0, "units_enrolled_sem2": 5,
        "evaluations_sem2": 2, "units_approved_sem2": 0,
        "grade_sem2": 7.0, "no_evaluations_sem2": 3,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 35.0,
    },
    {
        "student_id": "STU-1010",
        "student_name": "Jack Williams",
        "department": "Engineering",
        "semester": 3,
        "marital_status": 1, "application_mode": 1, "application_order": 1,
        "course": 9119, "daytime_attendance": 1, "age_at_enrollment": 21,
        "previous_qualification": 1, "previous_qualification_grade": 130.0,
        "mothers_qualification": 10, "fathers_qualification": 10,
        "mothers_occupation": 7, "fathers_occupation": 7,
        "admission_grade": 135.0, "displaced": 0, "special_needs": 0,
        "debtor": 0, "tuition_fees_current": 1, "gender": 1,
        "scholarship_holder": 0,
        "units_credited_sem1": 0, "units_enrolled_sem1": 6,
        "evaluations_sem1": 6, "units_approved_sem1": 4,
        "grade_sem1": 12.0, "no_evaluations_sem1": 0,
        "units_credited_sem2": 0, "units_enrolled_sem2": 6,
        "evaluations_sem2": 5, "units_approved_sem2": 3,
        "grade_sem2": 11.5, "no_evaluations_sem2": 1,
        "unemployment_rate": 10.8, "inflation_rate": 1.4, "gdp": 1.74,
        "attendance_percentage": 75.0,
    },
]


def seed_students():
    """Create 10 students with full model training features."""
    print("Seeding students...")
    for s in STUDENTS:
        sid = s["student_id"]
        existing = db_service.get_student_details(sid)
        if existing:
            print(f"  Student {s['student_name']} already exists.")
            continue

        # Create user record
        existing_user = db_service.get_user_by_student_id(sid)
        if not existing_user:
            db_service.create_user({
                "email": f"{sid.lower().replace('-', '')}@dropout-system.edu",
                "password_hash": AuthService.hash_password("student123"),
                "full_name": s["student_name"],
                "student_id": sid,
                "role": "student",
                "username": sid.lower().replace("-", ""),
                "status": "Active",
            })

        # Create student details with all ML features
        features = {
            "marital_status": s["marital_status"],
            "application_mode": s["application_mode"],
            "application_order": s["application_order"],
            "course": s["course"],
            "daytime_attendance": s["daytime_attendance"],
            "age_at_enrollment": s["age_at_enrollment"],
            "previous_qualification": s["previous_qualification"],
            "previous_qualification_grade": s["previous_qualification_grade"],
            "mothers_qualification": s["mothers_qualification"],
            "fathers_qualification": s["fathers_qualification"],
            "mothers_occupation": s["mothers_occupation"],
            "fathers_occupation": s["fathers_occupation"],
            "admission_grade": s["admission_grade"],
            "displaced": s["displaced"],
            "special_needs": s["special_needs"],
            "debtor": s["debtor"],
            "tuition_fees_current": s["tuition_fees_current"],
            "gender": s["gender"],
            "scholarship_holder": s["scholarship_holder"],
            "units_credited_sem1": s["units_credited_sem1"],
            "units_enrolled_sem1": s["units_enrolled_sem1"],
            "evaluations_sem1": s["evaluations_sem1"],
            "units_approved_sem1": s["units_approved_sem1"],
            "grade_sem1": s["grade_sem1"],
            "no_evaluations_sem1": s["no_evaluations_sem1"],
            "units_credited_sem2": s["units_credited_sem2"],
            "units_enrolled_sem2": s["units_enrolled_sem2"],
            "evaluations_sem2": s["evaluations_sem2"],
            "units_approved_sem2": s["units_approved_sem2"],
            "grade_sem2": s["grade_sem2"],
            "no_evaluations_sem2": s["no_evaluations_sem2"],
            "unemployment_rate": s["unemployment_rate"],
            "inflation_rate": s["inflation_rate"],
            "gdp": s["gdp"],
            "department": s["department"],
            "semester": s["semester"],
            "attendance_percentage": s["attendance_percentage"],
        }
        db_service.save_student_details(sid, features)
        print(f"  Created student: {s['student_name']} ({sid})")


def seed_mentor_assignments(mentors):
    """Assign students to mentors."""
    print("Seeding mentor assignments...")
    if not mentors:
        print("  No mentors available. Skipping.")
        return

    assignments = [
        (mentors[0].get("mentor_id", "MNT-001"), "STU-1001"),
        (mentors[0].get("mentor_id", "MNT-001"), "STU-1002"),
        (mentors[0].get("mentor_id", "MNT-001"), "STU-1003"),
        (mentors[1].get("mentor_id", "MNT-002"), "STU-1004"),
        (mentors[1].get("mentor_id", "MNT-002"), "STU-1005"),
        (mentors[1].get("mentor_id", "MNT-002"), "STU-1006"),
        (mentors[2].get("mentor_id", "MNT-003"), "STU-1007"),
        (mentors[2].get("mentor_id", "MNT-003"), "STU-1008"),
        (mentors[2].get("mentor_id", "MNT-003"), "STU-1009"),
        (mentors[0].get("mentor_id", "MNT-001"), "STU-1010"),
    ]

    existing = db_service.get_students_by_mentor(mentors[0].get("mentor_id", "MNT-001"))
    if existing:
        print("  Assignments already exist. Skipping.")
        return

    for mentor_id, student_id in assignments:
        db_service.assign_mentor(mentor_id, student_id)
    print(f"  Created {len(assignments)} mentor-student assignments")


def seed_interventions():
    """Create sample interventions for high/medium risk students."""
    print("Seeding interventions...")
    existing = db_service.get_interventions()
    if existing:
        print("  Interventions already exist. Skipping.")
        return

    high_risk_students = ["STU-1002", "STU-1005", "STU-1007", "STU-1009"]
    medium_risk_students = ["STU-1003", "STU-1010"]

    for sid in high_risk_students:
        db_service.create_intervention({
            "student_id": sid,
            "mentor_name": "Dr. James Wilson",
            "type": "Academic Advising",
            "notes": "Initial risk assessment flagged for academic performance concerns. Schedule meeting.",
            "status": "In Progress",
            "intervention_status": "In Progress",
            "assigned_mentor": "MNT-001",
        })

    for sid in medium_risk_students:
        db_service.create_intervention({
            "student_id": sid,
            "mentor_name": "Prof. Sarah Chen",
            "type": "Academic Advising",
            "notes": "Monitoring academic progress. Follow up next semester.",
            "status": "Open",
            "intervention_status": "Not Started",
            "assigned_mentor": "MNT-002",
        })

    print(f"  Created {len(high_risk_students) + len(medium_risk_students)} interventions")


def seed_reports():
    """Create sample report history and schedules."""
    print("Seeding reports...")
    existing = db_service.get_reports_history()
    if existing:
        print("  Reports already exist. Skipping.")
        return

    db_service.create_report({
        "name": "Risk Summary - Jan 2026",
        "type": "risk_summary",
        "generated_by": "admin",
        "size": "10 students",
    })
    db_service.create_report({
        "name": "Department Analysis - Jan 2026",
        "type": "department_analysis",
        "generated_by": "admin",
        "size": "4 departments",
    })

    # Schedules
    db_service.create_schedule({
        "name": "Weekly Risk Summary",
        "type": "risk_summary",
        "frequency": "Weekly",
        "email": "admin@dropout-system.edu",
    })
    db_service.create_schedule({
        "name": "Monthly Full Report",
        "type": "full_report",
        "frequency": "Monthly",
        "email": "admin@dropout-system.edu",
    })

    print("  Created 2 reports and 2 schedules")


def seed_predictions():
    """Compute and seed predictions for all student details."""
    print("Seeding predictions...")
    existing = db_service.get_all_predictions()
    if existing:
        print("  Predictions already exist. Skipping.")
        return

    from backend.app.services.model_service import ModelService
    from backend.app.services.shap_service import ShapService
    from backend.app.services.recommendation_service import RecommendationService

    model_service = ModelService()
    shap_service = ShapService()
    rec_service = RecommendationService()

    details = db_service.get_all_student_details()
    count = 0
    for d in details:
        sid = d.get("student_id")
        if not sid:
            continue
        try:
            pred = model_service.predict(d)
            reasons = shap_service.explain(d, top_n=5)
            recs = rec_service.generate_recommendations(d, pred, reasons)
            db_service.save_prediction({
                "student_id": sid,
                "risk_score": pred["risk_score"],
                "risk_band": pred["risk_band"].capitalize(),
                "flagged": pred["flagged"],
                "top_reasons": reasons,
                "recommendations": recs,
                "features_snapshot": d
            })
            count += 1
        except Exception as e:
            print(f"Error seeding prediction for {sid}: {e}")
    print(f"  Created {count} predictions")


def main():
    """Run all seed functions."""
    print("=" * 60)
    print("Seeding Student Dropout Early-Warning System")
    print("=" * 60)

    seed_admin()
    mentors = seed_mentors()
    seed_students()
    seed_mentor_assignments(mentors)
    seed_predictions()
    seed_interventions()
    seed_reports()

    print("=" * 60)
    print("Seeding complete!")
    print("=" * 60)
    print()
    print("Seed credentials:")
    print("  Admin:   admin / admin123")
    print("  Mentor:  mentor_james / mentor123")
    print("  Mentor:  mentor_sarah / mentor123")
    print("  Mentor:  mentor_maria / mentor123")


if __name__ == "__main__":
    main()
