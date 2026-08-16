# Backend + Frontend PRD — Student Dropout Early-Warning System

> [!IMPORTANT]
> **Temporary / Reference Document**
>
> This document is a working reference for the hackathon. It is **not a frozen
> specification**. APIs, screens, data structures, model integration, and
> implementation details may change as the project develops.
>
> Use this document as the current direction, but check the latest code and
> team decisions before making major implementation decisions.

---

## 1. Product Summary

Build a mentor-facing early-warning web application that helps academic
mentors identify students with elevated predicted dropout risk, understand
the model's explanation, and record interventions.

The product flow is:

```text
Login
  ↓
Dashboard
  ↓
Find At-Risk Student
  ↓
Student Details
  ↓
Understand Risk
  ↓
Record Intervention
  ↓
Track Intervention
```

The MVP is for mentors/academic staff, not students.

---

## 2. Frontend Scope

The MVP has four primary screens.

### Login

Provide basic mentor/admin login.

### Dashboard

Show:

- Total students
- High/medium/low risk counts
- Risk distribution
- At-risk student list
- Top risk factors
- Open intervention count
- Department/program risk where available

### Student List

Support:

- Search
- Filtering
- Sorting
- Risk display
- Intervention status

### Student Details

Show:

- Student information
- Academic information
- Predicted dropout probability
- Risk category
- Risk explanation
- Risk factors
- Protective factors
- Intervention history

Allow:

- Add intervention
- Update intervention status

Intervention tracking should remain inside Student Details rather than being a
separate primary screen.

---

## 3. Backend Scope

Use FastAPI.

The backend should provide:

- Authentication
- Student records
- Prediction results
- Student analysis
- Dashboard statistics
- Intervention CRUD
- Model/SHAP integration
- Health check

The backend should hide ML implementation details from the frontend.

---

## 4. Current API Contract

The following is the current API direction.

### Authentication

```text
POST /api/auth/login
```

### Prediction

```text
POST /api/predict
```

Expected product-level response:

```json
{
  "dropout_probability": 0.82,
  "risk_category": "High"
}
```

### Students

```text
GET /api/students
GET /api/students/{student_id}
```

### Student Analysis

```text
GET /api/students/{student_id}/analysis
```

Expected information:

- Dropout probability
- Risk category
- Risk factors
- Protective factors
- Plain-language explanation
- Recommendations where available

### Dashboard

```text
GET /api/dashboard/summary
```

### Interventions

```text
GET /api/students/{student_id}/interventions

POST /api/students/{student_id}/interventions

PATCH /api/interventions/{intervention_id}
```

### Health

```text
GET /api/health
```

The exact request and response schemas can evolve during development.

Once the frontend starts consuming an API, changes should be coordinated
between frontend and backend.

---

## 5. Risk Information

The ML system's final product target is:

```text
Dropout
Not-Dropout
```

The main user-facing output is:

```text
Dropout probability
Risk category
```

Risk categories:

```text
Low
Medium
High
```

The backend/model determines the risk category.

The frontend displays it and should not independently calculate it.

The UI should use responsible wording:

- Predicted dropout risk
- Elevated predicted risk
- Factors contributing to predicted risk

Avoid:

- Will drop out
- Guaranteed dropout
- This student will drop out

---

## 6. Explainability

The backend receives/produces SHAP-derived explanations.

The frontend displays:

### Risk factors

Factors contributing positively to predicted dropout risk.

### Protective factors

Factors associated with lower predicted risk.

### Plain-language explanation

Technical model features should be understandable to a mentor.

For example:

```text
curricular_units_1st_sem_approved
```

can be presented as:

```text
Courses successfully approved in the first semester
```

Raw SHAP values are not required in the standard mentor UI.

SHAP explanations describe model behavior and should not be presented as
causal proof.

---

## 7. Intervention Tracking

Interventions are associated with individual students.

Each intervention contains:

```text
Type
Date
Mentor
Notes
Status
```

Statuses:

```text
Open
In Progress
Resolved
```

The frontend should display intervention history chronologically.

The backend persists intervention data.

The dashboard may aggregate open/in-progress/resolved interventions.

---

## 8. Demo Data

The project may use simulated application data for development.

Potential simulated fields include:

- Display names
- Student IDs
- Department/program labels
- Attendance percentage
- Mentor information
- Intervention records

These fields are not necessarily from the UCI dataset and must not be
presented as real institutional records.

The frontend may use mock data while backend APIs are being developed.

The backend may use a temporary dummy ML pipeline while the ML team develops
the final model.

---

## 9. ML Integration Boundary

The ML team owns:

- Preprocessing
- Feature engineering
- Model training
- Model evaluation
- Threshold selection
- Final fitted model
- SHAP analysis

The backend owns:

- Loading the model artifact
- Calling inference
- Serving prediction results
- Serving explanations
- Connecting model output to the application

The frontend owns:

- Displaying prediction results
- Displaying explanations
- Displaying risk categories

The frontend must never depend directly on the pickle structure.

---

## 10. GenAI Integration

GenAI may be used to turn model explanations into useful intervention
suggestions.

The intended flow is:

```text
Student Data
     ↓
ML Model
     ↓
Dropout Probability
     ↓
SHAP Explanation
     ↓
GenAI
     ↓
Suggested Intervention
```

GenAI should not independently predict dropout.

Recommendations are suggestions for mentors, not guaranteed interventions.

---

## 11. Database

The backend database should manage application state such as:

- Users/mentors
- Students/application records
- Intervention records
- Other data needed by the dashboard

The database is separate from the ML training dataset.

The exact database technology and schema may change during development.

---

## 12. Non-Functional Expectations

### Performance

The dashboard and student pages should feel responsive for the demo dataset.

### Security

- Basic authentication
- No hardcoded credentials
- No exposed secrets
- Student information should not be publicly accessible

### Reliability

The following flow must work end-to-end:

```text
Login
 ↓
Dashboard
 ↓
Student List
 ↓
Student Details
 ↓
Risk
 ↓
Explanation
 ↓
Intervention
```

### Usability

A non-technical mentor should understand the risk display and explanation
without needing ML knowledge.

---

## 13. MVP Priorities

### Must Have

- Login
- Dashboard
- Student List
- Student Details
- Prediction/risk display
- SHAP-derived explanation
- Risk and protective factors
- Intervention creation
- Intervention status updates
- Intervention history
- Working frontend/backend integration

### Nice to Have

- Advanced dashboard analytics
- CSV export
- Technical SHAP view
- Visible fairness report
- Additional filters

### Out of Scope

- Student-facing portal
- Automated mentor alerts
- Live college-system integration
- Live attendance integration
- Continuous model retraining
- Cohort what-if simulation

---

## 14. Ownership

| Area | Owner |
|---|---|
| FastAPI | Backend |
| API contracts | Backend + Frontend |
| Database | Backend |
| Authentication | Backend |
| Model integration | Backend + ML |
| SHAP integration | Backend + ML |
| Intervention APIs | Backend |
| React UI | Frontend |
| Dashboard | Frontend |
| Student List | Frontend |
| Student Details | Frontend |
| Intervention UI | Frontend |
| GenAI integration | Backend/GenAI |
| ML model | ML Team |
| Preprocessing | ML Team |
| Final model evaluation | ML Team |
| Integration testing | Entire Team |

---

## 15. Implementation Principle

Keep the system simple enough to finish during the hackathon.

The most important successful path is:

```text
React Frontend
      ↓
FastAPI
      ↓
Database + ML Services
      ↓
Prediction / Explanation / Intervention
```

Do not add infrastructure or architecture that is not needed for the MVP.
