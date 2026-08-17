# Backend API & Database Documentation

The Student Dropout Prediction Backend is built with **FastAPI**, **Scikit-Learn/SHAP**, and **Supabase PostgreSQL**.

---

## 1. Authentication Endpoints

### Register (`POST /api/auth/register`)
Registers a new student or academic mentor and returns a JWT Bearer token.
```json
{
  "email": "student@campus.edu",
  "password": "password123",
  "full_name": "Alex Johnson",
  "student_id": "STU10432",
  "role": "student"
}
```

### Login (`POST /api/auth/login`)
Authenticates via email or student ID and password.
```json
{
  "email_or_student_id": "STU10432",
  "password": "password123"
}
```

### Current User Profile (`GET /api/auth/me`)
Headers: `Authorization: Bearer <token>`
Returns the logged-in user profile.

---

## 2. Prediction & Model Inference

### Predict Dropout Risk (`POST /api/prediction/predict`)
Query Parameter: `?student_id=STU10432` (or automatically extracted from JWT token)
Calculates predicted dropout probability, risk band, decision threshold flag, top SHAP driver explanations, and tailored academic recommendations, saving the results to Supabase.

#### Example Request Payload (UCI Dataset Features):
```json
{
  "marital_status": 1,
  "application_mode": 1,
  "application_order": 1,
  "course": 9254,
  "daytime_attendance": 1,
  "age_at_enrollment": 20,
  "previous_qualification": 1,
  "previous_qualification_grade": 130.0,
  "mothers_qualification": 1,
  "fathers_qualification": 1,
  "mothers_occupation": 5,
  "fathers_occupation": 5,
  "admission_grade": 125.0,
  "displaced": 0,
  "special_needs": 0,
  "debtor": 0,
  "tuition_fees_current": 1,
  "gender": 1,
  "scholarship_holder": 0,
  "units_credited_sem1": 0,
  "units_enrolled_sem1": 6,
  "evaluations_sem1": 6,
  "units_approved_sem1": 6,
  "grade_sem1": 13.5,
  "no_evaluations_sem1": 0,
  "units_credited_sem2": 0,
  "units_enrolled_sem2": 6,
  "evaluations_sem2": 6,
  "units_approved_sem2": 6,
  "grade_sem2": 14.0,
  "no_evaluations_sem2": 0,
  "unemployment_rate": 10.8,
  "inflation_rate": 1.4,
  "gdp": 1.74
}
```

#### Example Response:
```json
{
  "id": "c1f7a79e-4e63-469b-b0b3-8c467a73f8a0",
  "student_id": "STU10432",
  "risk_score": 0.1005,
  "risk_band": "low",
  "flagged": false,
  "top_reasons": [
    {
      "feature": "curricular_units_2nd_sem_approved",
      "impact": -0.6836,
      "description": "Courses successfully approved in Semester 2",
      "category": "protective"
    },
    {
      "feature": "curricular_units_1st_sem_approved",
      "impact": -0.582,
      "description": "Courses successfully approved in Semester 1",
      "category": "protective"
    },
    {
      "feature": "engagement_score",
      "impact": 0.3553,
      "description": "Overall academic evaluation engagement score",
      "category": "risk"
    }
  ],
  "recommendations": [
    {
      "title": "Maintain Positive Academic Trajectory",
      "description": "Performance metrics are solid. Continue attending regular evaluations and consider participating in undergraduate research or leadership clubs.",
      "action_type": "Career & Enrichment",
      "priority": "info"
    }
  ],
  "created_at": "2026-08-17T10:09:27.123456+00:00"
}
```

---

## 3. Student Record Endpoints

- `GET /api/students`: Lists all students with their latest risk status and evaluation dates.
- `GET /api/students/{student_id}`: Returns profile, saved details status, and latest prediction.
- `POST /api/students/{student_id}/details`: Enters / updates student dataset features in Supabase.
- `GET /api/students/{student_id}/details`: Fetches stored dataset features.
- `GET /api/students/{student_id}/history`: Returns historical risk evaluations for the student.

---

## 4. Dashboard & Interventions

- `GET /api/dashboard/summary`: Aggregate counts (total students, high, medium, low risk, unassessed, flagged count, average risk score, Supabase status).
- `GET /api/dashboard/interventions?student_id=STU10432`: Fetch mentor interventions.
- `POST /api/dashboard/interventions`: Record a new intervention.
- `PATCH /api/dashboard/interventions/{id}`: Update intervention status (`Open`, `In Progress`, `Resolved`) or notes.

---

## 5. Supabase Setup Guide

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project.
3. Open the **SQL Editor** in Supabase and execute the script in `backend/app/db/schema.sql`.
4. Go to **Project Settings -> API** and copy:
   - Project URL -> `SUPABASE_URL`
   - Anon or service_role Key -> `SUPABASE_KEY`
5. Place them into `student-dropout-prediction/.env`.
