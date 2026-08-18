# Frontend Spec — Student Dropout Prediction System

Four pages. Intervention tracking lives inside Student Details, not standalone.

---

## Navigation Structure

```
Login
 └─ Dashboard (home after login)
     ├─ Student List
     │   └─ Student Details (per student)
     │        ├─ Tab: Overview (profile, academic, attendance, backlogs)
     │        ├─ Tab: Why is this student at risk? (explanation)
     │        └─ Tab: Interventions (history + add new)
     └─ (Dashboard at-risk table rows link directly into Student Details too)
```

Top-level nav bar: **Dashboard | Student List**. Student Details is always reached by clicking a student, never a nav-bar item.

---

## 1. Login

**Purpose:** Authenticate mentor/admin.

**UI components:** Email/username input, password input, login button, error text slot.

**Information displayed:** None (pre-auth).

**User actions:** Enter credentials, submit.

**States:** Default, submitting (button disabled + spinner), error (invalid credentials).

**Data required:** None from dataset. Auth handled separately (mock auth acceptable for hackathon).

---

## 2. Dashboard

**Purpose:** Cohort-wide risk overview; entry point for finding who needs attention.

**UI components:**
- KPI cards: total students, % High/Medium/Low risk, open interventions count
- Risk distribution chart (bar or pie: Low/Medium/High)
- Risk by department/program chart *(only if department field is used — mark as simulated)*
- Top recurring risk factors chart (aggregated across at-risk students)
- Filters: risk band, department (if used)
- At-risk student table (top N by probability), each row links to Student Details

**Information displayed:** Aggregated stats, chart data, ranked student list (name, risk %, risk band).

**User actions:** Apply filters, click a student row → Student Details.

**States:**
- Loading: skeleton cards/chart placeholders
- Empty: "No students found" if filters return nothing
- Error: fetch-failed message with retry button

**Data required:** All students' risk_category, dropout_probability, department (if used), risk_factors (for aggregation).

---

## 3. Student List

**Purpose:** Browse, search, and filter the full monitored student roster.

**UI components:**
- Search bar (by name or ID)
- Filters: risk band, department/program (if used)
- Sort control (by risk % descending default)
- Table: student name, ID, department, risk band, risk %, last intervention date
- Pagination (if list is long; not needed for mock data size)

**Information displayed:** One row per student with the fields above.

**User actions:** Search, filter, sort, click row → Student Details.

**States:** Loading (skeleton rows), empty (no match for search/filter), error (retry).

**Data required:** student_id, student_name (simulated), department (if used, simulated), risk_category, dropout_probability, last intervention date.

---

## 4. Student Details

**Purpose:** Full single-student view — profile, risk, plain-language explanation, and intervention log.

Structured as **three tabs** within one page (all data required loads together on page open).

### Tab: Overview
- **UI components:** Profile card (name, ID, department, semester), academic summary (admission grade, units enrolled/approved/failed per semester), attendance % *(clearly labeled "simulated" in UI)*, backlogs count
- **Information displayed:** Static student record data
- **User actions:** None (read-only)

### Tab: Why is this student at risk?
- **UI components:** Risk badge (Low/Medium/High) + probability display, e.g. "Predicted risk: 78%" with a small "estimated, not guaranteed" note; ranked list of factors, each labeled by strength — *Major risk factor*, *Moderate risk factor*, *Protective factor* — in plain language (e.g. "High number of failed curricular units — Major risk factor"). Raw SHAP values NOT shown here.
- **Information displayed:** Plain-language risk factor breakdown, derived from SHAP but translated to human wording and impact tier
- **User actions:** None (read-only). *(Optional admin toggle to reveal raw SHAP values — Nice to Have, not MVP)*

### Tab: Interventions
- **UI components:** "Add Intervention" button/form (type dropdown, date, notes), intervention timeline/list, status control per entry (Open / In Progress / Resolved)
- **Information displayed:** Chronological intervention history
- **User actions:** Add new intervention, update status of an existing one

**States (whole page):** Loading (skeleton), not-found (invalid student ID), error (retry), empty intervention list ("No interventions logged yet").

**Data required:** Full student object — profile, academic fields, attendance (simulated), dropout_probability, risk_category, risk_factors (with tier + direction), interventions array.

---

## Notes for Build

- Build against `MOCK_DATA.json` first; treat it as the API response shape.
- Any field sourced from simulated/mock data should carry a visual indicator (e.g. small "simulated" tag or tooltip) wherever shown — see `DATA_DICTIONARY.md` for which fields those are.
- Dropout probability should always display with the word "predicted" or "estimated" attached — never as a bare, authoritative percentage.