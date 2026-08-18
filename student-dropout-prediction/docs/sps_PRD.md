# Final PRD — Student Dropout Early-Warning System
**Cognizant Hackathon**

*Note: no README/PRD source files were pasted in — this document is built from the technical plan and prior PRD content already established earlier in this conversation. Flag anything below that doesn't match your actual README so it can be corrected.*

---

## 1. Product Overview

An early-warning system that predicts which students are likely to drop out, explains *why* in plain language, and lets mentors track what they do about it. Built on the UCI "Predict Students' Dropout and Academic Success" dataset. For mentors and department staff, not students (MVP).

## 2. Problem Statement

Academic performance, enrollment, and engagement data live in separate systems, so colleges typically notice a student is struggling only after they've already disengaged or withdrawn. A single combined risk score — paired with a plain-language reason and a way to act on it — lets mentors intervene earlier instead of reactively.

## 3. Goals

- Identify at-risk students early, before disengagement is visible through normal channels
- Make every prediction explainable to a non-technical mentor
- Let mentors log and track interventions against real students
- Hit a reliable ML bar (recall ≥ 0.75 for the dropout class) so the tool is worth trusting
- Keep predictions responsible — fairness-checked, and framed as decision support, not verdicts

## 4. Target Users

| User | Need |
|---|---|
| Mentor / Academic Advisor | Find who needs attention, understand why, log interventions |
| Department Head / Academic Administrator | Cohort-level risk overview, trends by department |
| *(Technical/Admin view)* | Optional, only if raw SHAP/model diagnostics are needed — not a core persona |

## 5. Core Features

- **Student Risk Prediction** — classification model outputs a predicted dropout probability
- **Risk Categorization** — Low / Medium / High bands
- **At-Risk Student Identification** — ranked, searchable, filterable, sortable list
- **Student Risk Profile** — academic info + predicted risk in one view
- **Explainability** — SHAP-derived, plain-language "why" per student
- **Dashboard** — cohort-level analytics for mentors/admins
- **Intervention Tracking** — log and update actions per student, inside the student's profile
- **Responsible AI** — subgroup performance checks, limitation warnings surfaced where relevant

## 6. User Flows

**Mentor Flow**
```
Login → Dashboard → Find at-risk student → Open profile
→ Understand risk ("Why is this student at risk?")
→ Record intervention → Track intervention status
```

**ML / Data Flow**
```
UCI Dataset → Validation → Preprocessing → Feature Engineering
→ Model Training → Evaluation → SHAP → Prediction API → Dashboard
```

## 7. Machine Learning Requirements

*(Product-level summary — implementation lives in the technical README, not here.)*

- **Dataset:** UCI Predict Students' Dropout and Academic Success
- **Prediction target:** binary — Dropout vs. Not-Dropout (Enrolled/Graduate collapsed into "not dropout")
- **Approach:** supervised classification
- **Key feature groups:** admission/demographic data, per-semester curricular unit performance (enrolled/approved/grades)
- **Feature engineering:** derived indicators such as approval rate and failed-unit counts
- **Class imbalance handling:** SMOTE or class weighting (dropout is the minority class)
- **Candidate models:** compare a few standard classifiers (e.g. logistic regression, random forest, gradient boosting); pick the best on validation performance
- **Threshold selection:** tuned to hit the recall target for the dropout class, not just default 0.5
- **Evaluation metrics:** recall, precision, F1, AUC-PR, confusion matrix, subgroup breakdowns
- **Primary target metric: Recall ≥ 0.75 for the dropout class**

## 8. Explainability Requirements

- SHAP used for both global feature importance (what drives risk across the cohort) and per-student explanations
- Each student profile shows top contributing factors, translated to plain language and tiered as **major** / **moderate**, with a **risk** or **protective** direction
- Protective factors (e.g. strong admission grade, high approval rate) shown alongside risk factors — not just negatives
- Raw SHAP values are **not** exposed in the default mentor view; reserved for an optional admin/technical view if built

## 9. Responsible AI / Fairness

- Evaluate model performance (recall/precision) across relevant subgroups (e.g. by gender, scholarship status, age group) where the dataset supports it
- Flag meaningful performance gaps between subgroups rather than reporting only an aggregate score
- Document known limitations plainly (see Risks section)
- Predictions are framed throughout the product as **decision support**, not a guaranteed outcome — UI copy uses "predicted risk," never "will drop out"

## 10. Frontend Requirements

Four screens, consistent with the existing frontend spec:

- **Login**
- **Dashboard** — KPIs, risk distribution, risk by department (if used), top risk factors, at-risk list, filters
- **Student List** — search, filter, sort, risk info per row
- **Student Details** — profile, academic info, risk score/category, "Why is this student at risk?" panel, protective factors, intervention history and add/update action

Intervention tracking stays inside Student Details as a tab/section — not a separate page. No React code specified here (see `FRONTEND_SPEC.md`).

## 11. Backend / API Requirements

High level only. Backend (FastAPI, per the technical plan) should expose APIs to serve:

- Student records
- Risk predictions per student
- Risk explanations (translated SHAP output)
- Intervention records (create/update/list)
- Dashboard/aggregate statistics

Endpoint design and request/response schemas are an implementation detail for the backend team, not specified here.

## 12. Data Requirements

**UCI Data** (real, from source dataset): admission grade, demographic/socioeconomic fields, per-semester curricular unit enrollment/approval/grades, dropout/enrolled/graduate label.

**Derived Data** (calculated): failed units, approval rate, dropout probability (model output), risk category, translated risk/protective factors.

**Application/Demo Data** (not from UCI, must be simulated or app-generated): student display names, student IDs, department/program labels (if used), attendance percentage, mentor info, intervention records.

Simulated data must be visibly labeled in the UI and never presented as real institutional data.

## 13. System Architecture

```
UCI Dataset
    ↓
Data Processing
    ↓
Feature Engineering
    ↓
ML Model
    ↓
SHAP Explainability
    ↓
FastAPI Backend  ←→  Intervention Database
    ↓
React Frontend
    ↓
Mentor / Administrator
```

No additional infrastructure beyond what's already in the technical plan.

## 14. Intervention Tracking

- **Create:** type, date, mentor, notes
- **Status:** Open → In Progress → Resolved
- **History:** chronological list per student, visible in Student Details
- **Dashboard aggregation:** count of open interventions cohort-wide

## 15. Non-Functional Requirements

- **Performance:** dashboard and student views should load without noticeable lag for a small-to-mid-size demo dataset
- **Security:** basic auth for mentor/admin login; no public access to student data
- **Data privacy:** student data treated as sensitive even in demo form; no real institutional data used
- **Reliability:** end-to-end flow (login → prediction → explanation → intervention) must work reliably for the demo
- **Explainability:** every prediction shown to a mentor must come with a plain-language reason
- **Fairness:** subgroup performance checked, not just aggregate accuracy
- **Usability:** a non-technical mentor should understand risk and reasoning without help

## 16. MVP Scope

**Must Have**
- Login
- Dashboard (KPIs, risk chart, at-risk list)
- Student List (search/filter/sort)
- Student Details (risk score, category, plain-language explanation)
- Intervention logging + status, inside Student Details
- Trained model meeting recall ≥ 0.75 for dropout class
- Basic SHAP-based explanation pipeline feeding the "why" panel

**Nice to Have**
- Admin/technical view showing raw SHAP values
- CSV export of at-risk list
- Subgroup fairness report as a visible artifact (not just internal check)

**Future (explicitly out of scope)**
- Cohort what-if simulation
- Automated mentor alerts/notifications
- Student-facing portal
- Live attendance/college system integration
- Continuous model retraining pipeline

## 17. Success Metrics

**ML**
- Recall ≥ 0.75 for dropout class (primary target)
- Precision, F1, AUC-PR reported alongside recall
- Confusion matrix reviewed
- Subgroup performance checked for major gaps

**Product**
- Mentor can find high-risk students in a couple of clicks
- Mentor can understand why a student is flagged without ML background
- Mentor can record an intervention
- Full flow (login → find student → explanation → intervention) works end-to-end for the demo

## 18. Risks and Limitations

- UCI dataset is from a specific institution — factors may not generalize elsewhere without retraining
- No real attendance data in UCI; attendance is simulated and should be treated as illustrative only
- Simulated fields (names, IDs, departments, interventions) are demo constructs, not real records
- False positives/negatives are expected — predictions are probabilistic, not certain
- Dropout probability should not be read as a calibrated real-world likelihood unless the model is explicitly calibrated
- Small demo dataset used for UI development is not statistically representative
- Fairness checks are limited to what the UCI dataset's fields allow — not a full bias audit

---

## PRD → Development Ownership

| Area | Main Responsibility |
|---|---|
| Data Pipeline | ML/Data team |
| Feature Engineering | ML team |
| Model Training | ML team |
| SHAP | ML team |
| Fairness | ML team |
| FastAPI | Backend team |
| React Frontend | Frontend team |
| Intervention Tracking | Backend + Frontend |
| Database | Backend team |
| Testing | Entire team |