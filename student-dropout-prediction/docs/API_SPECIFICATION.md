# Backend API Specification — Student Dropout Early-Warning System

This document specifies the complete REST API for the **Student Dropout Early-Warning System** designed to be implemented with **FastAPI**.

An importable **OpenAPI 3.0.3 YAML** specification is available at [`docs/openapi.yaml`](./openapi.yaml).

---

## 1. Authentication & RBAC Overview

All requests (except `POST /api/auth/login`) require a valid Bearer JWT in the `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
```

### Role Permissions Matrix

| Endpoint Group | Endpoint | Method | Admin | Mentor | Notes |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Auth** | `/api/auth/login` | `POST` | ✅ | ✅ | Open endpoint |
| | `/api/auth/logout` | `POST` | ✅ | ✅ | Invalidates session |
| | `/api/auth/me` | `GET` | ✅ | ✅ | Profile & role info |
| **Dashboard** | `/api/dashboard/stats` | `GET` | ✅ | ✅ | Mentor: Scoped to assigned students |
| | `/api/dashboard/risk-distribution` | `GET` | ✅ | ✅ | Mentor: Scoped to assigned students |
| | `/api/dashboard/department-breakdown`| `GET` | ✅ | ✅ | High-level departmental risk |
| | `/api/dashboard/top-risk-drivers` | `GET` | ✅ | ✅ | Recurring SHAP/model risk factors |
| | `/api/dashboard/priority-outreach` | `GET` | ✅ | ✅ | High risk students first |
| **Students** | `/api/students` | `GET` | ✅ | ✅ | Mentor: Scoped to assigned students |
| | `/api/students/{student_id}` | `GET` | ✅ | ✅ | Mentor: 403 if unassigned |
| | `/api/students/{student_id}` | `PATCH` | ✅ | ❌ | Admin only |
| **Interventions** | `/api/interventions` | `GET` | ✅ | ✅ | Mentor: Scoped to assigned board |
| | `/api/interventions/{student_id}` | `GET` | ✅ | ✅ | Mentor: 403 if unassigned |
| | `/api/interventions/{student_id}/status`| `PATCH`| ✅ | ✅ | Update status (Resolved, Escalated) |
| | `/api/interventions/{student_id}/notes` | `POST` | ✅ | ✅ | Append timeline note |
| | `/api/interventions/{student_id}/reassign`| `PATCH`| ✅ | ❌ | Admin only |
| **Reports** | `/api/reports/preview` | `GET` | ✅ | ✅ | Mentor: Scoped, mentor filter locked |
| | `/api/reports/export` | `POST` | ✅ | ✅ | Export CSV/PDF stream |
| | `/api/reports/history` | `GET` | ✅ | ✅ | Report generation audit |
| | `/api/reports/schedule` | `GET`/`POST` | ✅ | ✅ | Manage recurring schedules |
| | `/api/reports/schedule/{id}` | `DELETE` | ✅ | ✅ | Delete schedule |
| **Audit** | `/api/audit/fairness` | `GET` | ✅ | ❌ | Admin only |
| | `/api/audit/feature-disclosure` | `GET` | ✅ | ❌ | Admin only |
| | `/api/audit/access-log` | `GET` | ✅ | ❌ | Admin only |
| | `/api/audit/privacy-docs` | `GET`/`PUT` | ✅ | ❌ | Admin only |
| | `/api/audit/export` | `GET` | ✅ | ❌ | Admin only |
| **Mentor Mgmt** | `/api/mentors` | `GET`/`POST` | ✅ | ❌ | Admin only |
| | `/api/mentors/{id}` | `PATCH` | ✅ | ❌ | Admin only |
| | `/api/mentors/{id}/deactivate` | `PATCH` | ✅ | ❌ | Admin only |

---

## 2. API Endpoints

### 2.1 Authentication

#### `POST /api/auth/login`
- **Description:** Authenticates username and password credentials.
- **Auth:** Public
- **Request Body (`application/json`):**
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "user": {
      "id": "admin1",
      "username": "admin",
      "name": "Admin User",
      "email": "admin@university.edu",
      "role": "Admin",
      "mentorId": null,
      "mentorName": null,
      "status": "Active"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: `{"detail": "Invalid username or password."}`
  - `403 Forbidden`: `{"detail": "This account has been deactivated. Please contact an administrator."}`

#### `POST /api/auth/logout`
- **Description:** Ends the user session and revokes the active token.
- **Auth:** Admin, Mentor
- **Response `200 OK`:**
  ```json
  { "message": "Successfully logged out" }
  ```

#### `GET /api/auth/me`
- **Description:** Returns the current authenticated user identity.
- **Auth:** Admin, Mentor
- **Response `200 OK`:** `User` object.

---

### 2.2 Dashboard

#### `GET /api/dashboard/stats`
- **Description:** Returns aggregate KPI cards count.
- **Auth:** Admin, Mentor (scoped)
- **Response `200 OK`:**
  ```json
  {
    "total_students": 10,
    "high_risk_count": 4,
    "medium_risk_count": 3,
    "low_risk_count": 3,
    "active_interventions": 5
  }
  ```

#### `GET /api/dashboard/risk-distribution`
- **Description:** Proportions across High, Medium, and Low risk categories.
- **Auth:** Admin, Mentor (scoped)
- **Response `200 OK`:**
  ```json
  {
    "high": 4,
    "medium": 3,
    "low": 3
  }
  ```

#### `GET /api/dashboard/department-breakdown`
- **Description:** Average predicted dropout risk per department.
- **Auth:** Admin, Mentor
- **Response `200 OK`:**
  ```json
  [
    { "department": "Computer Science", "average_risk_percentage": 64 },
    { "department": "Mechanical Engineering", "average_risk_percentage": 65 },
    { "department": "Business Administration", "average_risk_percentage": 27 },
    { "department": "Nursing", "average_risk_percentage": 21 }
  ]
  ```

#### `GET /api/dashboard/top-risk-drivers`
- **Description:** Top recurring risk-direction SHAP/model factors across students.
- **Auth:** Admin, Mentor
- **Response `200 OK`:**
  ```json
  [
    { "factor": "High number of failed curricular units", "count": 4 },
    { "factor": "Low attendance percentage", "count": 3 },
    { "factor": "Low admission grade", "count": 2 }
  ]
  ```

#### `GET /api/dashboard/priority-outreach`
- **Description:** High risk students sorted by highest dropout probability first.
- **Auth:** Admin, Mentor (scoped)
- **Response `200 OK`:** Array of `Student` objects.

---

### 2.3 Students

#### `GET /api/students`
- **Description:** Filterable directory of student records.
- **Auth:** Admin, Mentor (automatically scoped to `assigned_mentor == current_user.name`)
- **Query Parameters:**
  - `search` (string): matches `student_name` or `student_id`
  - `risk_level` (enum: `All`, `High`, `Medium`, `Low`)
  - `department` (string)
- **Response `200 OK`:** Array of `Student` objects.

#### `GET /api/students/{student_id}`
- **Description:** Returns a full student academic profile, risk factors, and intervention history.
- **Auth:** Admin, Mentor (guarded: returns `403 Forbidden` if student not assigned to mentor).
- **Response `200 OK`:** `Student` object.
- **Error Responses:**
  - `403 Forbidden`: `{"detail": "You are only authorized to view students assigned to your mentorship."}`
  - `404 Not Found`: `{"detail": "Student STU-9999 not found."}`

#### `PATCH /api/students/{student_id}`
- **Description:** Admin-only update to student academic or financial status.
- **Auth:** Admin Only
- **Request Body:**
  ```json
  {
    "tuition_fees_up_to_date": true,
    "scholarship_holder": true,
    "attendance_percentage": 85
  }
  ```
- **Response `200 OK`:** Updated `Student` object.

---

### 2.4 Interventions

#### `GET /api/interventions`
- **Description:** Retrieves Kanban board records (students enriched with `intervention_status`, `assigned_mentor`, and `mentor_notes`).
- **Auth:** Admin, Mentor (scoped)
- **Query Parameters:**
  - `status` (enum: `All`, `Not Started`, `In Progress`, `Resolved`, `Escalated`)
  - `mentor_id` (string, Admin only)
  - `risk_band` (enum: `All`, `High`, `Medium`, `Low`)
- **Response `200 OK`:** Array of `InterventionStudent` objects.

#### `PATCH /api/interventions/{student_id}/status`
- **Description:** Updates the status of an ongoing student intervention.
- **Auth:** Admin, Mentor (assigned)
- **Request Body:**
  ```json
  {
    "status": "Resolved"
  }
  ```
- **Response `200 OK`:** Updated `InterventionStudent` object.

#### `POST /api/interventions/{student_id}/notes`
- **Description:** Appends a new timestamped mentor note. Author is automatically attributed to the active authenticated user.
- **Auth:** Admin, Mentor (assigned)
- **Request Body:**
  ```json
  {
    "text": "Conducted 1-on-1 counseling session regarding workload stress."
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "id": "note-1723928100",
    "author": "Dr. Priya Nair",
    "timestamp": "2026-08-17T15:30:00Z",
    "text": "Conducted 1-on-1 counseling session regarding workload stress."
  }
  ```

#### `PATCH /api/interventions/{student_id}/reassign`
- **Description:** Reassigns student to another mentor.
- **Auth:** Admin Only
- **Request Body:**
  ```json
  {
    "mentor_name": "James O'Connor"
  }
  ```
- **Response `200 OK`:** Updated `InterventionStudent` object.

---

### 2.5 Reports

#### `GET /api/reports/preview`
- **Description:** Generates live preview rows for the specified report type.
- **Auth:** Admin, Mentor (scoped)
- **Query Parameters:**
  - `type` (enum: `at-risk`, `intervention`, `dept-trend`, `audit`)
  - `department` (string)
  - `risk_band` (string)
  - `mentor_id` (string, Admin only)
  - `status` (string)
  - `date_from` (date)
  - `date_to` (date)
- **Response `200 OK`:**
  ```json
  {
    "report_type": "at-risk",
    "total_records": 4,
    "generated_at": "2026-08-18T00:00:00Z",
    "data": [...]
  }
  ```

#### `POST /api/reports/export`
- **Description:** Downloads compiled report as `.csv` or `.pdf`.
- **Auth:** Admin, Mentor (scoped)
- **Request Body:**
  ```json
  {
    "type": "at-risk",
    "format": "csv",
    "filters": { "department": "All", "risk_band": "High" }
  }
  ```
- **Response `200 OK`:** Binary file stream (`text/csv` or `application/pdf`).

#### `GET /api/reports/history`
- **Description:** Lists generated report logs.
- **Auth:** Admin, Mentor

#### `GET /api/reports/schedule` / `POST /api/reports/schedule`
- **Description:** View or create automated recurring email schedules (`Weekly` / `Monthly`).

#### `DELETE /api/reports/schedule/{id}`
- **Description:** Cancels an active automated report schedule.

---

### 2.6 Bias & Privacy Audit (Admin Only)

#### `GET /api/audit/fairness`
- **Description:** Returns algorithmic fairness metrics (Recall, FNR, FPR, Selection Rate) grouped by demographic attributes.
- **Auth:** Admin Only (`403 Forbidden` for Mentor)
- **Query Parameters:** `attribute` (enum: `gender`, `category`, `region`, `age_band`)
- **Response `200 OK`:**
  ```json
  {
    "attribute": "gender",
    "threshold": 0.10,
    "overall": { "group": "Cohort", "n": 10, "recall": 0.88, "fnr": 0.12, "fpr": 0.08, "selectionRate": 0.35 },
    "groups": [
      { "group": "Female", "n": 4, "recall": 0.85, "fnr": 0.15, "fpr": 0.09, "selectionRate": 0.31 },
      { "group": "Male", "n": 6, "recall": 0.89, "fnr": 0.11, "fpr": 0.07, "selectionRate": 0.38 }
    ]
  }
  ```

#### `GET /api/audit/feature-disclosure`
- **Description:** Transparency breakdown of sensitive auditing features vs. active model prediction features.
- **Auth:** Admin Only

#### `GET /api/audit/access-log`
- **Description:** Paginated compliance access log tracking data reads, exports, and updates.
- **Auth:** Admin Only
- **Query Parameters:** `user`, `action_type`, `date_from`, `date_to`

#### `GET /api/audit/privacy-docs` & `PUT /api/audit/privacy-docs`
- **Description:** Retrieve and edit institutional data privacy guidelines (Markdown content).
- **Auth:** Admin Only

#### `GET /api/audit/export`
- **Description:** Exports the entire access log and fairness evaluation record as CSV.
- **Auth:** Admin Only

---

### 2.7 Mentor Management (Admin Only)

#### `GET /api/mentors`
- **Description:** Retrieves all registered mentor profiles, their active/inactive status, and assigned student counts.
- **Auth:** Admin Only (`403 Forbidden` for Mentor)
- **Response `200 OK`:**
  ```json
  [
    {
      "id": "mentor1",
      "username": "priya",
      "name": "Dr. Priya Nair",
      "email": "priya@university.edu",
      "role": "Mentor",
      "mentorId": "M001",
      "status": "Active",
      "assigned_students_count": 4
    }
  ]
  ```

#### `POST /api/mentors`
- **Description:** Registers a new mentor account and generates login credentials. Role is locked as `Mentor`.
- **Auth:** Admin Only
- **Request Body:**
  ```json
  {
    "name": "Dr. Ramesh Gupta",
    "username": "ramesh.gupta",
    "password": "TempPassword@2026",
    "mentorId": "M004",
    "email": "ramesh.gupta@university.edu"
  }
  ```
- **Response `201 Created`:** `MentorProfile` object.
- **Error Responses:**
  - `400 Bad Request`: `{"detail": "Username 'ramesh.gupta' is already taken."}`

#### `PATCH /api/mentors/{id}`
- **Description:** Updates mentor's Name or Email. `mentorId`, `username`, and `role` are immutable.
- **Auth:** Admin Only

#### `PATCH /api/mentors/{id}/deactivate`
- **Description:** Soft-deactivates or reactivates a mentor account. Deactivating disables login access while preserving historical notes and assignments.
- **Auth:** Admin Only
- **Response `200 OK`:** Updated `MentorProfile` with toggled `status` (`Active` <-> `Inactive`).

---

## 3. Data Models Schema Reference

### `Student` Schema
| Field | Type | Description |
| :--- | :--- | :--- |
| `student_id` | `string` | Unique identifier (e.g., `STU-1002`) |
| `student_name` | `string` | Full name |
| `department` | `string` | Academic department |
| `semester` | `integer` | Current semester |
| `admission_grade` | `number` | Admission evaluation score (0 - 200) |
| `age_at_enrollment` | `integer` | Age when enrolled |
| `scholarship_holder` | `boolean` | Scholarship recipient status |
| `tuition_fees_up_to_date` | `boolean` | Tuition fee status |
| `curricular_units_1st_sem_enrolled` | `integer` | Units enrolled in 1st semester |
| `curricular_units_1st_sem_approved` | `integer` | Units passed in 1st semester |
| `curricular_units_2nd_sem_enrolled` | `integer` | Units enrolled in 2nd semester |
| `curricular_units_2nd_sem_approved` | `integer` | Units passed in 2nd semester |
| `curricular_units_failed` | `integer` | Total failed curricular units |
| `approval_rate` | `number` | Ratio of approved to enrolled units |
| `attendance_percentage` | `number` | Overall attendance (0 - 100) |
| `dropout_probability` | `number` | Predicted dropout probability (0.00 - 1.00) |
| `risk_category` | `string` | `High`, `Medium`, `Low` |
| `risk_factors` | `RiskFactor[]` | Top model feature contributions |
| `interventions` | `InterventionItem[]` | Past actions history |

### `RiskFactor` Schema
| Field | Type | Values |
| :--- | :--- | :--- |
| `factor` | `string` | Plain-language factor description |
| `tier` | `string` | `major`, `moderate`, `minor` |
| `direction` | `string` | `risk`, `protective` |

### `InterventionStudent` Schema
*(Extends `Student` with the following fields)*
| Field | Type | Description |
| :--- | :--- | :--- |
| `intervention_status` | `string` | `Not Started`, `In Progress`, `Resolved`, `Escalated` |
| `assigned_mentor` | `string` | Assigned mentor's full name |
| `last_updated` | `string (date)` | Date of last follow-up |
| `mentor_notes` | `InterventionNote[]` | Reverse-chronological timeline notes |

---

## 4. Standard Error Response

All error responses follow the standard FastAPI error format:
```json
{
  "detail": "Descriptive error message"
}
```
Common HTTP status codes used:
- `400 Bad Request`: Validation failure or duplicate username.
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: Insufficient role permissions or accessing unassigned student.
- `404 Not Found`: Target resource ID does not exist.
