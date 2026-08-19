# Student Dropout Early-Warning & Prediction System

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-2.0.0-teal.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.3.1-purple.svg)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Aiven%2FSupabase-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, full-stack machine learning early-warning application designed to identify higher education students at risk of academic dropout, explain the underlying risk drivers using SHAP (SHapley Additive exPlanations), track mentor interventions, conduct algorithmic fairness/bias audits, and manage student-mentor relationships.

---

## Table of Contents

1. [Overview & Problem Statement](#overview--problem-statement)
2. [User Roles & Responsibilities](#user-roles--responsibilities)
3. [Implemented Features](#implemented-features)
4. [System Architecture](#system-architecture)
5. [Frontend Technology & Architecture](#frontend-technology--architecture)
6. [Backend Technology & Architecture](#backend-technology--architecture)
7. [Database Architecture & Connection Pooling](#database-architecture--connection-pooling)
8. [Database Schema & Entity-Relationship Model](#database-schema--entity-relationship-model)
9. [Workflows & Sequence Diagrams](#workflows--sequence-diagrams)
   - [Add Student Workflow](#1-add-student-workflow)
   - [Assign Mentor Workflow](#2-assign-mentor-workflow)
   - [Database Connection Pool Flow](#3-database-connection-pool-flow)
10. [API Endpoint Reference](#api-endpoint-reference)
11. [Environment Variables](#environment-variables)
12. [Installation & Setup Instructions](#installation--setup-instructions)
    - [Prerequisites](#prerequisites)
    - [Backend Setup](#1-backend-setup)
    - [Frontend Setup](#2-frontend-setup)
    - [Database Initialization](#3-database-initialization)
13. [Running the Application](#running-the-application)
14. [Testing & Verification](#testing--verification)
15. [Security & Validation](#security--validation)
16. [Troubleshooting & Common Issues](#troubleshooting--common-issues)
17. [Current Project Status & Roadmap](#current-project-status--roadmap)
18. [License & Acknowledgments](#license--acknowledgments)

---

## Overview & Problem Statement

University student retention is a critical challenge in higher education. Academic, socio-economic, financial, and personal pressures often accumulate silently until a student drops out. Traditional administrative approaches react only after academic failure occurs.

This system provides a proactive **Early-Warning System (EWS)** using machine learning models trained on university dataset features (demographics, prior academic qualification, admission grades, semester unit enrollments/approvals, attendance, and macroeconomic factors).

### Key Objectives
* **Early Detection**: Compute raw dropout risk probability (0.0 to 1.0) and categorize students into **High**, **Medium**, or **Low** risk bands.
* **Explainability (SHAP)**: Provide actionable insights into *why* a student is at risk (e.g., failed units, tuition arrears, declining attendance) rather than returning a black-box score.
* **Closed-Loop Intervention Tracking**: Enable advisors and mentors to record outreach, assign case ownership, track progress, and write progress notes.
* **Algorithmic Fairness & Bias Audit**: Analyze predictions across sensitive demographic sub-groups (gender, age, scholarship status) to ensure unbiased interventions.

---

## User Roles & Responsibilities

The system enforces Role-Based Access Control (RBAC) across three distinct user roles:

| Role | Access Level | Primary Responsibilities |
| :--- | :--- | :--- |
| **Admin** | Full System Access | Add new students, assign/reassign mentors, manage mentor accounts, configure system settings, run algorithmic bias audits, generate system reports. |
| **Mentor** | Scoped Access | View cohort of assigned students, track risk indicators, create/update intervention cases, write timestamped progress notes. |
| **Student** | Personal Access | View personal academic profile, risk status, SHAP risk drivers, recommendations, and assigned mentor details. |

---

## Implemented Features

### 1. Add Student Feature (Admin)
* **Admin Form Modal**: Dedicated UI modal allowing administrators to register a student, input dataset attributes (admission grade, semester performance, attendance, tuition status, scholarship status), and assign an initial mentor.
* **Sequential ID Generation**: Automatically assigns sequential IDs (`STU-1011`, `STU-1012`, etc.) matching existing database patterns if left blank.
* **Database & ML Integration**: Inserts records into `users` and `student_details` tables, executes ML risk scoring, and returns the newly computed profile to update the UI without page reload.

### 2. Assign Mentor Feature (Backend & DB Integration)
* **Backend Endpoint**: Dedicated `PATCH /api/interventions/{student_id}/reassign` and DB utility integration.
* **Flexible Lookup**: Resolves mentor by `mentor_id`, `username`, or full `name`.
* **Multi-Table Synchronization**: Atomically updates `mentor_assignments`, `users` (`mentor_id`, `mentor_name`), and `interventions` tables.
* **Persistence**: Retains mentor assignments across sessions, page refreshes, and user logins.

### 3. Database Connection Pooling
* **Threaded Pool**: Implements `psycopg2.pool.ThreadedConnectionPool` configured via `MAX_CONNECTIONS` (default `10`) and `MIN_CONNECTIONS` (default `1`).
* **Connection Hygiene**: Ensures every query checks out a connection and safely returns it (`putconn()`) in `finally` blocks, with `conn.rollback()` on errors.
* **Graceful Disposal**: Hooked into FastAPI `@app.on_event("shutdown")` to cleanly close all active connections.
* **Resilient Fallback**: Automatically falls back to an in-memory data store if PostgreSQL is unreachable.

### 4. Machine Learning & SHAP Explainability
* **Model Engine**: Logistic Regression / Gradient Boosting classifier trained on UCI dataset features.
* **SHAP Risk Drivers**: Generates top positive (risk-elevating) and negative (protective) feature impacts per student.
* **Automated Recommendations**: Generates contextual academic, financial, and counseling recommendations.

### 5. Mentor Intervention Tracking & Case Notes
* **Intervention Lifecycle**: Tracks status progression (`Not Started` -> `Open` -> `In Progress` -> `Resolved` -> `Escalated`).
* **Timestamped Notes**: Allows mentors to append historical intervention notes.

### 6. Reports & Bias/Privacy Audit
* **Reports Generator**: Filtered cohort reporting exported as downloadable CSV or structured JSON.
* **Bias & Fairness Audit**: Evaluates demographic parity, equal opportunity, and disparate impact metrics across protected attributes.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (React 18 + Vite)"]
        UI["App Shell Layout"]
        SL["Student List Page"]
        AM["Add Student Modal"]
        MD["Mentor Assign Dropdown"]
        API_JS["API Service Layer (api.js)"]
    end

    subgraph Server["Backend Layer (FastAPI)"]
        Router["FastAPI APIRouter"]
        AuthService["Auth & RBAC Service"]
        ModelService["ML Model Engine (Joblib)"]
        ShapService["SHAP Explainer"]
        DBService["DatabaseService (Singleton)"]
    end

    subgraph Storage["Database & Persistence Layer"]
        Pool["Threaded Connection Pool (psycopg2)"]
        Postgres[(PostgreSQL / Aiven Cloud)]
        InMemory[("In-Memory Store (Fallback)")]
    end

    UI --> SL
    SL --> AM
    SL --> MD
    SL & AM & MD --> API_JS
    API_JS -- HTTP + JWT Bearer --> Router
    Router --> AuthService
    Router --> ModelService
    Router --> ShapService
    Router --> DBService
    DBService --> Pool
    Pool -- "getconn() / putconn()" --> Postgres
    DBService -. "Fallback when DB offline" .-> InMemory
```

---

## Frontend Technology & Architecture

* **Framework**: React 18.3.1 (Vite 5.3.1 bundler)
* **Routing**: React Router v7.18.2 (`BrowserRouter`, `PublicRoute`, `PrivateRoute`)
* **Styling**: Vanilla CSS + TailwindCSS 3.4.4 with curated color palettes (Slate, Teal, Rose, Amber)
* **Iconography**: Lucide React icons
* **State & Authentication**: `AuthContext` with JWT persistence in `localStorage`

### Key Frontend Components
* `App.jsx`: Main routing container and global student cohort state manager.
* `StudentList.jsx`: Searchable, filterable student catalog with risk badges and admin controls.
* `AddStudentModal.jsx`: Modal dialog for admin student creation.
* `MentorAssignDropdown.jsx`: Inline mentor selection dropdown with live API synchronization.
* `StudentTable.jsx`: Shared tabular representation of student risk profiles.
* `StudentDetails.jsx`: Comprehensive view showing risk metrics, SHAP breakdown, recommendations, and intervention logs.

---

## Backend Technology & Architecture

* **Framework**: FastAPI 2.0.0 (Uvicorn 0.24.0 ASGI server)
* **Validation**: Pydantic v2 schemas (`backend/app/schemas/`)
* **Authentication**: PyJWT + bcrypt password hashing
* **Machine Learning**: `scikit-learn` model pipeline (`dropout_model.pkl`, `scaler.pkl`, `threshold.pkl`)
* **Explainability**: `SHAP` kernel explainer (`explainer.pkl`)

### Backend Package Structure
```
student-dropout-prediction/
├── backend/
│   ├── app/
│   │   ├── db/
│   │   │   ├── schema.sql           # PostgreSQL table definitions & indices
│   │   │   └── supabase_client.py   # DatabaseService & connection pool implementation
│   │   ├── routes/
│   │   │   ├── auth.py              # Login, register, me, account list
│   │   │   ├── dashboard.py         # Summary metrics & risk distributions
│   │   │   ├── students.py          # Student CRUD, details, analysis, creation
│   │   │   ├── interventions.py     # Intervention status, notes, mentor assignment
│   │   │   ├── mentors.py           # Mentor account management
│   │   │   ├── prediction.py        # ML prediction & SHAP endpoint
│   │   │   ├── reports.py           # Report generation & scheduling
│   │   │   └── audit.py             # Bias audit & privacy docs
│   │   ├── schemas/                 # Pydantic request/response validation models
│   │   ├── services/                # ML, SHAP, Recommendation, and Auth business logic
│   │   └── main.py                  # FastAPI application entrypoint & shutdown hooks
│   ├── seed_data.py                 # Initial database & in-memory seeder
│   └── requirements.txt             # Python dependencies
├── frontend/                        # React frontend application
├── .env                             # Centralized environment variables
└── README.md                        # Project documentation
```

---

## Database Architecture & Connection Pooling

The database layer utilizes `psycopg2.pool.ThreadedConnectionPool` to manage database connections efficiently across concurrent API requests.

### Key Pooling Specifications
1. **Singleton Pool**: Created once upon application startup in `DatabaseService.__init__()`.
2. **Environment Controlled**: `MIN_CONNECTIONS` (default `1`) and `MAX_CONNECTIONS` (default `10`).
3. **Safe Checkout/Checkin**:
   ```python
   def _query(self, sql: str, params=None) -> List[Dict[str, Any]]:
       conn = self._pool.getconn()
       try:
           cur = conn.cursor(cursor_factory=RealDictCursor)
           cur.execute(sql, params or ())
           rows = cur.fetchall()
           cur.close()
           return [dict(r) for r in rows]
       finally:
           self._pool.putconn(conn)
   ```
4. **Exception Protection**: Write operations (`_execute`, `_execute_returning`) execute `conn.rollback()` inside `except` blocks before returning connections in `finally` to prevent connection poisoning.
5. **Shutdown Cleanup**: On server stop, `db_service.close_pool()` closes all open sockets gracefully.

---

## Database Schema & Entity-Relationship Model

```mermaid
erDiagram
    users {
        UUID id PK
        TEXT email UK
        TEXT password_hash
        TEXT full_name
        TEXT student_id UK
        TEXT role
        TEXT username UK
        TEXT mentor_id
        TEXT mentor_name
        TEXT status
        TIMESTAMPTZ created_at
    }

    student_details {
        TEXT student_id PK
        INT marital_status
        INT application_mode
        INT course
        INT age_at_enrollment
        NUMERIC admission_grade
        INT scholarship_holder
        INT tuition_fees_current
        INT units_enrolled_sem1
        INT units_approved_sem1
        NUMERIC grade_sem1
        INT units_enrolled_sem2
        INT units_approved_sem2
        NUMERIC grade_sem2
        NUMERIC attendance_percentage
        TEXT department
        INT semester
        TIMESTAMPTZ updated_at
    }

    mentors {
        UUID id PK
        TEXT username UK
        TEXT password_hash
        TEXT name
        TEXT email
        TEXT role
        TEXT mentor_id UK
        TEXT status
        TIMESTAMPTZ created_at
    }

    mentor_assignments {
        UUID id PK
        TEXT mentor_id FK
        TEXT student_id FK
        TIMESTAMPTZ assigned_at
    }

    predictions {
        UUID id PK
        TEXT student_id FK
        NUMERIC risk_score
        TEXT risk_band
        BOOLEAN flagged
        JSONB top_reasons
        JSONB recommendations
        TIMESTAMPTZ created_at
    }

    interventions {
        UUID id PK
        TEXT student_id FK
        TEXT mentor_name
        TEXT type
        TEXT notes
        TEXT status
        TEXT intervention_status
        TEXT assigned_mentor
        TIMESTAMPTZ created_at
    }

    users ||--o| student_details : "has profile"
    mentors ||--o{ mentor_assignments : "assigned to"
    users ||--o{ mentor_assignments : "has assigned"
    users ||--o{ predictions : "has risk logs"
    users ||--o{ interventions : "has intervention cases"
```

---

## Workflows & Sequence Diagrams

### 1. Add Student Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as StudentList UI
    participant Modal as AddStudentModal
    participant API as FastAPI Router (/api/students/)
    participant Auth as require_admin
    participant DB as DatabaseService (Pool)
    participant ML as ML Model Service

    Admin->>UI: Click "+ Add Student"
    UI->>Modal: Open Form Dialog
    Admin->>Modal: Submit Name, Email, Dept, Grades, Mentor
    Modal->>API: POST /api/students/ (Bearer JWT)
    API->>Auth: Validate Admin Role
    Auth-->>API: Authorized
    API->>DB: Check student_id & email uniqueness
    API->>ML: Predict Dropout Risk (Score + Band)
    API->>DB: Insert into users + student_details
    API->>DB: assign_mentor() if mentor selected
    DB-->>API: Student Record Persisted
    API-->>Modal: 201 Created (Full Student Profile)
    Modal-->>UI: Close Modal & Prepend Student to State
    UI-->>Admin: Table updates immediately with risk band & mentor
```

### 2. Assign Mentor Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as MentorAssignDropdown
    participant API as FastAPI Router (/api/interventions/{id}/reassign)
    participant Auth as require_admin
    participant DB as DatabaseService (Pool)

    Admin->>UI: Select Mentor from Dropdown
    UI->>API: PATCH /api/interventions/{student_id}/reassign (mentor_id)
    API->>Auth: Validate Admin Role
    API->>DB: Validate student_id & resolve mentor_id
    API->>DB: Delete old assignment & INSERT into mentor_assignments
    API->>DB: UPDATE users SET mentor_id, mentor_name
    API->>DB: UPDATE/INSERT interventions (assigned_mentor, mentor_name)
    DB-->>API: Assignment Persisted
    API-->>UI: 200 OK (updated mentor_name & student_id)
    UI-->>Admin: Dropdown displays assigned mentor immediately
```

### 3. Database Connection Pool Flow

```mermaid
sequenceDiagram
    autonumber
    participant Request as Incoming API Request
    participant Pool as ThreadedConnectionPool
    participant Conn as Active PostgreSQL Socket
    participant App as Query Execution
    
    Request->>Pool: getconn()
    alt Connections Available
        Pool-->>Request: Return existing connection socket
    else Pool Exhausted (< MAX_CONNECTIONS)
        Pool->>Conn: Open new connection
        Pool-->>Request: Return new connection
    end
    Request->>App: Execute SQL Query with Cursor
    alt Query Success
        App->>Conn: COMMIT transaction
    else Exception Occurs
        App->>Conn: ROLLBACK transaction
    end
    Request->>Pool: putconn(conn) in finally block
    Pool-->>Request: Connection returned to pool for reuse
```

---

## API Endpoint Reference

### 1. Authentication (`/api/auth`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and issues JWT access token. |
| `POST` | `/api/auth/register` | Public | Registers a new user account. |
| `GET` | `/api/auth/me` | Bearer Token | Retrieves current logged-in user context. |
| `POST` | `/api/auth/logout` | Public | Revokes local session token. |
| `GET` | `/api/auth/accounts` | Public | Returns list of available demo login accounts. |

### 2. Students (`/api/students`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/students/` | Bearer Token | Returns list of students (scoped by mentor assignment for mentors). |
| `POST` | `/api/students/` | Admin | **(New)** Adds a new student, generates ML prediction, and stores in DB. |
| `GET` | `/api/students/{id}` | Bearer Token | Returns detailed student profile with risk factors and interventions. |
| `PATCH` | `/api/students/{id}` | Admin | Updates editable student attributes (attendance, tuition, scholarship). |
| `GET` | `/api/students/{id}/details` | Bearer Token | Fetches raw UCI dataset feature attributes. |
| `POST` | `/api/students/{id}/details` | Bearer Token | Saves raw UCI dataset features for a student. |
| `GET` | `/api/students/{id}/analysis` | Bearer Token | Runs real-time ML inference, SHAP explanations, and recommendations. |

### 3. Interventions (`/api/interventions`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/interventions/` | Bearer Token | Lists all intervention cases across cohort. |
| `GET` | `/api/interventions/{id}` | Bearer Token | Gets intervention details for a specific student. |
| `PATCH` | `/api/interventions/{id}/status` | Bearer Token | Updates status (`Not Started` -> `In Progress` -> `Resolved` -> `Escalated`). |
| `POST` | `/api/interventions/{id}/notes` | Bearer Token | Appends timestamped mentor progress note. |
| `PATCH` | `/api/interventions/{id}/reassign` | Admin | **(Enhanced)** Assigns/reassigns a mentor to a student in DB. |

### 4. Mentors (`/api/mentors`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/mentors/` | Bearer Token | Lists all mentor profiles and assigned student counts. |
| `POST` | `/api/mentors/` | Admin | Registers a new mentor account. |
| `PATCH` | `/api/mentors/{id}` | Admin | Updates mentor profile fields. |
| `PATCH` | `/api/mentors/{id}/deactivate` | Admin | Toggles active/inactive status of a mentor. |

### 5. Prediction & Machine Learning (`/api/prediction`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/prediction/predict` | Public / Auth | Evaluates feature payload and returns risk score, band, and SHAP drivers. |

### 6. Dashboard & Aggregates (`/api/dashboard`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary` | Bearer Token | Returns high-level summary counts and average risk metrics. |
| `GET` | `/api/dashboard/stats` | Bearer Token | Overview statistics for dashboard widgets. |
| `GET` | `/api/dashboard/risk-distribution` | Bearer Token | Returns breakdown of students by risk band (`High`, `Medium`, `Low`). |
| `GET` | `/api/dashboard/department-breakdown` | Bearer Token | Risk statistics grouped by department. |

---

## Environment Variables

Configure environment variables in `.env` (located in project root and `backend/` directory):

```env
# Database Connection (Aiven or Supabase PostgreSQL)
DATABASE_URL=postgres://avnadmin:your_aiven_db_password@pg-34fc6a4c-ramts3012005-c404.h.aivencloud.com:27145/defaultdb?sslmode=require

# Database Connection Pooling Configuration
MAX_CONNECTIONS=10
MIN_CONNECTIONS=1

# JWT Authentication
JWT_SECRET=supersecret-student-dropout-jwt-key-2026-hackathon
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440
```

---

## Installation & Setup Instructions

### Prerequisites
* **Python**: 3.10 or higher
* **Node.js**: 18.0 or higher (with `npm`)
* **PostgreSQL**: PostgreSQL 13+ (or cloud database on Aiven / Supabase)

### 1. Backend Setup

```bash
# Navigate to the project root directory
cd student-dropout-mvp/student-dropout-prediction

# Install Python dependencies
pip install -r backend/requirements.txt
```

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install Node modules
npm install
```

### 3. Database Initialization

Execute the SQL script in `backend/app/db/schema.sql` against your PostgreSQL database to create the required tables and indices:

```bash
# Example loading schema using psql CLI
psql "postgres://avnadmin:your_aiven_db_password@pg-34fc6a4c-ramts3012005-c404.h.aivencloud.com:27145/defaultdb?sslmode=require" -f backend/app/db/schema.sql
```

---

## Running the Application

### 1. Start the Backend API Server

From `student-dropout-prediction/` root:

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

* Backend Swagger API Documentation: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**
* OpenAPI JSON Specification: **[http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)**

### 2. Start the Frontend Development Server

In a second terminal window, navigate to `frontend/`:

```bash
cd frontend
npm run dev
```

* Web Application URL: **[http://localhost:5173](http://localhost:5173)**

---

## Testing & Verification

### 1. Verify Database Connection & Pooling
Execute the DB verification script to confirm connection pool initialization and table queries:

```bash
python -c "import sys; sys.path.insert(0, '.'); from backend.app.db.supabase_client import db_service; print('DB Connected:', db_service.is_supabase_connected)"
```

### 2. Verify Backend API Endpoints (FastAPI TestClient)
Run the backend test suite:

```bash
pytest backend/tests/test_backend.py -v
```

### 3. Verify Frontend Production Build
Validate that the React application compiles without bundling errors:

```bash
cd frontend
npm run build
```

---

## Security & Validation

* **Password Security**: Passwords are standardly hashed using `bcrypt` with unique salts before storage.
* **Token Authentication**: Signed JWT tokens (`HS256`) containing sub, role, and expiration timestamp.
* **Role Enforcement**: Critical endpoints enforce `require_admin` or `require_mentor` dependencies.
* **Database Protection**: All SQL queries execute via parameterized placeholders (`%s`) preventing SQL injection vulnerabilities.
* **Connection Protection**: Strict transaction rollbacks prevent database connection corruption.

---

## Troubleshooting & Common Issues

| Issue / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| `DATABASE_URL not set or psycopg2 not installed` | Missing `.env` file or missing `psycopg2-binary`. | Ensure `DATABASE_URL` is set in `.env` and run `pip install psycopg2-binary`. |
| `307 Temporary Redirect` on POST `/api/students` | Calling `/students` without trailing slash in older client. | Updated `api.js` to call `/students/` and added `@router.post("")` decorator. |
| `401 Unauthorized` on Admin operation | Expired token or logged in as Student. | Log out and re-login using Admin credentials (`admin` / `admin123`). |
| `ERR_MODULE_NOT_FOUND` during frontend build | `node_modules` missing or unlinked. | Run `npm install` in `student-dropout-prediction/frontend/`. |

---

## Current Project Status & Roadmap

### Current Status: Production-Ready MVP (v2.0.0)
* Full-stack integration complete with PostgreSQL database connection pooling.
* Admin **Add Student** and **Assign Mentor** workflows verified end-to-end.
* Explainable AI (SHAP) and intervention tracking active.

### Future Roadmap
* [ ] Real-time WebSocket notifications for high-risk student alerts.
* [ ] Bulk CSV import for cohort-wide student creation.
* [ ] Multi-tenant organization support for university departments.

---

## License & Acknowledgments

* **License**: MIT License
* **Dataset Attribution**: UCI Machine Learning Repository - "Predict Students' Dropout and Academic Success" dataset.
