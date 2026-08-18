# Student Dropout Early-Warning System — Codebase Change Log

> **Purpose**: This document records every change made to the codebase during the migration from mock/seed data to a live PostgreSQL database. It is intended for handoff so the next developer can understand what was changed, why, and what remains.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture After Changes](#architecture-after-changes)
3. [Database (PostgreSQL on Aiven)](#database)
4. [Backend Changes (FastAPI)](#backend-changes)
5. [Frontend Changes (React + Vite)](#frontend-changes)
6. [Bug Fixes & Debugging Notes](#bug-fixes)
7. [Remaining Work / Known Issues](#remaining-work)
8. [Login Credentials](#login-credentials)
9. [How to Run](#how-to-run)

---

## 1. Project Overview

A full-stack Student Dropout Early-Warning System:
- **Backend**: Python FastAPI with ML model (XGBoost + SHAP), JWT authentication, PostgreSQL persistence
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL on Aiven (cloud-hosted)

**Goal of changes**: Eliminate all hardcoded/mock data. Every page now reads from and writes to the real PostgreSQL database.

---

## 2. Architecture After Changes

```
┌──────────────────────────────────────────────────────┐
│  React Frontend (Vite, port 5173)                    │
│  - All data fetched via api.js → /api/* endpoints    │
│  - JWT token stored in localStorage                  │
│  - No mock data imports for core features            │
└──────────────────┬───────────────────────────────────┘
                   │ proxy /api → localhost:8000
┌──────────────────▼───────────────────────────────────┐
│  FastAPI Backend (port 8000)                         │
│  - JWT auth with bcrypt password hashing             │
│  - Role-based access: Admin, Mentor                  │
│  - Routes: auth, mentors, students, interventions,   │
│            dashboard, reports, audit, prediction      │
└──────────────────┬───────────────────────────────────┘
                   │ psycopg2 connection
┌──────────────────▼───────────────────────────────────┐
│  PostgreSQL (Aiven cloud)                            │
│  - 14 tables (users, mentors, student_details,       │
│    interventions, mentor_assignments, etc.)           │
│  - 1 admin, 3 mentors, 10 students pre-populated    │
└──────────────────────────────────────────────────────┘
```

---

## 3. Database (PostgreSQL on Aiven)

### Connection
- **File**: `backend/.env`
- **Variable**: `DATABASE_URL`
- **Driver**: `psycopg2-binary` (required for Python 3.11)
- **SSL**: Required (`?sslmode=require`)

### Tables (defined in `backend/app/db/schema.sql`)
| Table | Purpose |
|-------|---------|
| `users` | Admin, mentor, and student login accounts |
| `student_details` | ML feature data for each student (35+ fields) |
| `predictions` | Model inference results + SHAP explanations |
| `interventions` | Mentor intervention records per student |
| `mentors` | Dedicated mentor profiles (separate from users) |
| `mentor_assignments` | Maps mentors → students |
| `mentor_notes` | Free-text notes by mentors on students |
| `intervention_notes` | Notes on intervention progress |
| `reports` | Generated report metadata |
| `report_schedules` | Scheduled report configs |
| `access_logs` | Audit trail of all data access |
| `privacy_docs` | Privacy policy document storage |
| `fairness_results` | Bias audit results |
| `feature_influence` | Feature sensitivity audit |

### Pre-populated Data
- **10 students** (STU-1001 through STU-1010) with full ML features
- **3 mentors** (MNT-001, MNT-002, MNT-003)
- **1 admin** (username: `admin`)
- **8 interventions** with statuses and assigned mentors
- **10 mentor assignments** linking mentors to students
- **Mentor notes** for several students

---

## 4. Backend Changes

### 4.1 `backend/app/routes/auth.py` — Login & Accounts

**Changes:**
- Added `GET /api/auth/accounts` — public endpoint returning all admin/mentor usernames and names (no passwords) for the login page demo pills. No auth required.
- Fixed role normalization in login response: lowercase `"admin"` → `"Admin"`, `"mentor"` → `"Mentor"` (line 112-123)
- Same normalization applied to `GET /api/auth/me` endpoint (line 158, 170)
- Login accepts `username`, `email`, or `student_id` as identifier

### 4.2 `backend/app/services/auth_service.py` — Auth Service & Dependencies

**Changes (already existed, documented for clarity):**
- `get_current_user()` — Returns user dict if token present, `None` if not (optional auth)
- `require_auth()` — Raises 401 if no token (mandatory auth)
- `require_admin()` — Raises 403 if role is not `"admin"` (case-insensitive check)
- `require_mentor()` — Raises 403 if role is not `"mentor"` or `"admin"`
- `authenticate_user()` — Checks `users` table first, then `mentors` table

### 4.3 `backend/app/routes/mentors.py` — Mentor CRUD (Admin Only)

**Changes:**
- `GET /api/mentors/` — Lists all mentors with `assigned_students_count` (computed from `mentor_assignments` table)
- `POST /api/mentors/` — Creates new mentor account (hashes password, stores in `mentors` table)
- `PATCH /api/mentors/{mentor_id}` — Updates mentor name/email
- `PATCH /api/mentors/{mentor_id}/deactivate` — Toggles Active/Inactive status
- All endpoints require `require_admin` dependency

### 4.4 `backend/app/routes/interventions.py` — Intervention Tracking

**Changes:**
- Replaced `Depends(get_current_user)` with `Depends(require_auth)` on `list_interventions`, `get_intervention_detail`, and `create_intervention` (previously caused `AttributeError: 'NoneType' object has no attribute 'get'`)
- `list_interventions` returns `assigned_mentor` as the **mentor name** (not ID) and adds `assigned_mentor_id` as a separate field (line 96-97)
- Removed unused `get_current_user` import

### 4.5 `backend/app/db/supabase_client.py` — Database Client

**Note:** Despite the filename, this connects to PostgreSQL via `psycopg2`, NOT Supabase client.

**Key methods used by the changed routes:**
- `get_all_mentors()`, `get_mentor_by_username()`, `get_mentor_by_id()`
- `create_mentor()`, `update_mentor()`, `toggle_mentor_status()`
- `get_students_by_mentor(mentor_id)` — returns assignment records
- `get_all_users()`, `get_user_by_username()`, `get_user_by_student_id()`
- `get_interventions(student_id)`, `update_intervention()`, `create_intervention()`
- `is_supabase_connected` flag — when `True`, reads from PostgreSQL; when `False`, uses `InMemoryStore` fallback

### 4.6 `backend/app/main.py` — App Startup

**Key behavior:**
- On startup, checks `db_service.is_supabase_connected`
- If `True` (PostgreSQL connected) → skips seeding, uses real data
- If `False` → runs `seed_data.py` to populate in-memory mock data
- Mentors router mounted at `/api/mentors` with tags `["Mentor Management"]`

### 4.7 `backend/requirements.txt`

Added `psycopg2-binary>=2.9.9` and `python-dotenv>=1.0.0` (were in `backend/requirements.txt` but missing from root).

---

## 5. Frontend Changes

### 5.1 `frontend/src/context/AuthContext.jsx` — Authentication State

**Changes (completely rewritten):**
- **Removed** all `mockAuth.js` imports, `authenticate` function, mock USERS array, and `users` state
- **Added** `authLoading` state — `true` while verifying JWT token on page load, prevents flash of protected content
- **Token-gated localStorage restore**: On init, checks for `dropout_auth_token` in localStorage; if missing, clears stale `dropout_auth_user` data (fixes phantom login bug)
- **Session verification**: On mount with existing token, calls `GET /api/auth/me` to verify; clears user on failure
- **Exposes**: `currentUser`, `authLoading`, `accounts` (from DB), `login()`, `logout()`
- `login()` calls `api.login()` → stores JWT token + user object in localStorage
- `logout()` clears token, user object, and calls backend logout

### 5.2 `frontend/src/services/api.js` — API Service Layer

**Changes:**
- Added `getAccounts()` — calls `GET /api/auth/accounts` (public, no auth)
- Fixed trailing slashes on `getMentors()` → `/mentors/` and `createMentor()` → `/mentors/` to match backend routes
- All authenticated requests include `Authorization: Bearer <token>` header automatically
- Token stored/removed from localStorage under key `dropout_auth_token`

### 5.3 `frontend/src/pages/Login.jsx` — Login Page

**Changes:**
- Fetches available accounts from `useAuth().accounts` (populated from `GET /api/auth/accounts`)
- Removed `"Frontend demo auth only"` text and mock auth references
- Demo pills show real DB accounts (admin + 3 mentors) with autofill on click
- Only calls `useAuth().login()` (backend JWT auth), no mock fallback

### 5.4 `frontend/src/pages/ManageMentors.jsx` — Mentor Management

**Changes:**
- Fetches mentors from `api.getMentors()` via `useEffect` on mount
- Added `loadError` state — shows error banner with retry button if API fails
- Added `editError` state — shows error in edit modal if update fails
- Added `assignedCount = m.assigned_students_count` (from backend) instead of computing from prop
- CRUD operations all call backend API: `api.createMentor()`, `api.updateMentor()`, `api.toggleMentorStatus()`
- Deactivation dialog shows assigned student count from `m.assigned_students_count`

### 5.5 `frontend/src/pages/MentorInterventionTracking.jsx` — Intervention Tracking

**Changes:**
- Fetches mentors from `api.getMentors()` for filter dropdown
- Status update, reassignment, and note addition all call backend API:
  - `api.updateInterventionStatus()`
  - `api.reassignMentor()`
  - `api.addInterventionNote()`

### 5.6 `frontend/src/components/PrivateRoute.jsx` — Route Guard

**Changes:**
- Added `authLoading` check from `useAuth()` — shows "Verifying session..." spinner while JWT is being validated
- Prevents flash-redirect to login during token verification

### 5.7 `frontend/src/App.jsx` — App Router

**Still uses mock data as initial state** (see Remaining Work):
- `DATA` from `mockStudents.js` used as initial `students` state
- `INTERVENTION_DATA` from `mockInterventions.js` used as initial `interventions` state
- These are overwritten by `api.getStudents()` and `api.getInterventions()` calls in `useEffect` when `currentUser` is set
- Behavior: shows mock data briefly, then replaces with DB data once API responds

### 5.8 `frontend/vite.config.js` — Dev Proxy

```js
proxy: {
  "/api": {
    target: "http://127.0.0.1:8000",
    changeOrigin: true,
    secure: false,
  },
}
```
All `/api/*` requests during development are forwarded to the FastAPI backend.

---

## 6. Bug Fixes & Debugging Notes

### Bug 1: `assignedCounts` ReferenceError (ManageMentors)
- **Symptom**: ManageMentors page blank, no mentors shown
- **Cause**: Two leftover references to undefined `assignedCounts` variable at lines 301 and 629 (from removed mock data)
- **Fix**: Replaced with `m.assigned_students_count` (line 301) and `deactivateTarget.assigned_students_count` (line 629)

### Bug 2: Stale localStorage Session (Auth)
- **Symptom**: "Not authenticated" error on API calls despite appearing logged in
- **Cause**: Old mock-auth user data persisted in `localStorage` (`dropout_auth_user`), but no JWT token (`dropout_auth_token`). User appeared authenticated but all API calls sent no Bearer token → 401.
- **Fix**: AuthContext now checks for token existence before restoring user from localStorage. If no token, clears stale user data.

### Bug 3: Silent API Failures
- **Symptom**: Pages load blank with no error message
- **Cause**: All `.catch(() => {})` blocks silently swallowed 401/500 errors
- **Fix**: Added error state variables and error banners with retry buttons in ManageMentors. Similar pattern should be applied to other pages.

### Bug 4: `require_auth` vs `get_current_user` (Interventions)
- **Symptom**: `AttributeError: 'NoneType' object has no attribute 'get'` when accessing interventions
- **Cause**: Intervention routes used `Depends(get_current_user)` which returns `None` for unauthenticated requests, causing `.get()` calls on `None`
- **Fix**: Changed to `Depends(require_auth)` which raises 401 instead of returning None

### Bug 5: Role Case Sensitivity
- **Symptom**: Admin appears as "admin" in JWT but frontend expects "Admin" for route guards
- **Fix**: Backend login and `/me` endpoints now normalize roles: `"admin"` → `"Admin"`, `"mentor"` → `"Mentor"`

### Bug 6: Trailing Slash Routing
- **Symptom**: `GET /api/mentors` returns 307 redirect instead of 200
- **Cause**: Backend route is `@router.get("/")` (trailing slash), frontend called without slash
- **Fix**: Frontend API calls now use `/mentors/` (with trailing slash)

---

## 7. Remaining Work / Known Issues

### High Priority
- [ ] **`App.jsx` still imports mock data** (`mockStudents.js`, `mockInterventions.js`) as initial state. Should be replaced with empty arrays and loaded entirely from API.
- [ ] **`Reports.jsx`** still uses `mockStudents.js` and `mockInterventions.js` directly instead of API data.
- [ ] **`BiasPrivacyAudit.jsx`** still uses mock data imports.
- [ ] **No delete mentor endpoint** — test mentor accounts created during debugging remain in DB.

### Medium Priority
- [ ] Add loading/error states to all pages (Dashboard, StudentList, StudentDetails, Reports, Audit) — currently only ManageMentors has proper error handling.
- [ ] Add `require_admin` to the `DELETE /api/mentors/{id}` route if needed.
- [ ] Implement token refresh / expiration handling in the frontend (tokens expire after 24 hours).

### Low Priority
- [ ] The `supabase_client.py` filename is misleading — it connects to PostgreSQL, not Supabase. Consider renaming to `db_client.py`.
- [ ] The `seed_data.py` file still exists but only runs when DB is unreachable.
- [ ] Mock data files (`mockStudents.js`, `mockInterventions.js`, `mockAuth.js`) can be removed once all pages use API data.

---

## 8. Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Mentor | `mentor_james` | `mentor123` |
| Mentor | `mentor_sarah` | `mentor123` |
| Mentor | `mentor_maria` | `mentor123` |

**Database**: PostgreSQL on Aiven (connection string in `backend/.env`)

---

## 9. How to Run

### Prerequisites
- Python 3.11 (with packages from `requirements.txt`)
- Node.js 18+ (with packages from `frontend/package.json`)

### Backend
```bash
cd student-dropout-prediction
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```
Backend runs at `http://localhost:8000`, API docs at `http://localhost:8000/docs`

### Frontend
```bash
cd student-dropout-prediction/frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`, proxies `/api` to backend.

### Important Notes
- Python must be invoked as `python` from Python 3.11 — not 3.13
- If PostgreSQL is unreachable, backend falls back to in-memory mode automatically
- Clear browser localStorage if you see phantom login issues after code changes

---

## File Change Summary

| File | Type | Description |
|------|------|-------------|
| `backend/.env` | Config | DB connection string, JWT settings |
| `backend/requirements.txt` | Config | Added psycopg2-binary, python-dotenv |
| `backend/app/routes/auth.py` | Modified | Added `/accounts` endpoint, role normalization |
| `backend/app/routes/interventions.py` | Modified | Fixed auth dependency, mentor name in response |
| `backend/app/routes/mentors.py` | Existing | Admin CRUD (unchanged, was already correct) |
| `backend/app/services/auth_service.py` | Existing | Auth service + dependencies (unchanged) |
| `backend/app/db/supabase_client.py` | Existing | PostgreSQL client (unchanged) |
| `backend/app/db/schema.sql` | Existing | 14-table schema (unchanged) |
| `frontend/src/context/AuthContext.jsx` | Rewritten | Removed mock auth, added authLoading, token-gated restore |
| `frontend/src/components/PrivateRoute.jsx` | Modified | Added authLoading spinner |
| `frontend/src/services/api.js` | Modified | Added getAccounts, fixed trailing slashes |
| `frontend/src/pages/Login.jsx` | Rewritten | Uses DB accounts, removed mock auth |
| `frontend/src/pages/ManageMentors.jsx` | Rewritten | API-driven CRUD, error handling |
| `frontend/src/pages/MentorInterventionTracking.jsx` | Modified | API-driven filters and mutations |
| `frontend/src/App.jsx` | Minor | Still uses mock data as initial state |
