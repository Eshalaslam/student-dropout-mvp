# AGENTS.md

> **Temporary working guidelines:** This file is a development guide, not a
> permanent specification. Requirements, APIs, architecture, and implementation
> details may change during the hackathon. Always inspect the current code and
> latest project decisions before making major changes.

## Role

You are a coding agent working primarily on the **Backend and Frontend** of the
Student Dropout Early-Warning System.

Prioritize:

1. Working end-to-end functionality
2. Simple, maintainable code
3. Stable frontend/backend contracts
4. Minimal unnecessary changes
5. Fast iteration suitable for a hackathon

Do not over-engineer.

---

## General Rules

- Read this file before making changes.
- Inspect existing code before creating or modifying files.
- Reuse existing components, services, utilities, and patterns where possible.
- Make the smallest reasonable change required.
- Do not modify unrelated code.
- Do not introduce a new framework or major dependency without a clear reason.
- Do not create duplicate APIs, services, components, or utilities.
- Keep functions and components focused.
- Prefer readable code over clever code.
- Use meaningful names.
- Add comments only when they provide useful context.
- Do not hardcode secrets, API keys, passwords, or tokens.
- Do not commit `.env` files or credentials.

---

# Backend Guidelines

## Framework

Use **FastAPI** for the backend.

Keep the backend organized around:

```text
API Route
   ↓
Service
   ↓
Database / ML Pipeline / External Service
```

Routes should remain thin.

Routes should primarily:

1. Validate input
2. Call a service
3. Return a response

Do not place large business-logic blocks inside route handlers.

---

## Backend Services

Use services for reusable business logic.

### model_service.py

Responsible for:

- Loading the fitted ML pipeline
- Running inference
- Returning dropout probability
- Applying the approved risk categorization

Do not duplicate ML preprocessing in the backend.

The backend should treat the ML pipeline as an artifact supplied by the ML
team.

Do not retrain the model during an API request.

### shap_service.py

Responsible for:

- Obtaining model explanations
- Formatting risk factors
- Formatting protective factors
- Preparing explanations for frontend consumption

SHAP explains model behavior; it must not change the model prediction.

### recommendation_service.py

Responsible for:

- Using prediction results
- Using explanation results
- Generating intervention suggestions
- Calling the GenAI layer when required

GenAI must not independently determine whether a student will drop out.

---

# API Guidelines

Keep the public API small and stable.

The current intended API surface is:

```text
POST  /api/auth/login

POST  /api/predict

GET   /api/students
GET   /api/students/{student_id}
GET   /api/students/{student_id}/analysis

GET   /api/dashboard/summary

GET   /api/students/{student_id}/interventions
POST  /api/students/{student_id}/interventions
PATCH /api/interventions/{intervention_id}

GET   /api/health
```

These are the current reference endpoints, not immutable requirements.

Use Pydantic request/response schemas.

Before changing an API response:

1. Check frontend usage.
2. Check existing backend consumers/tests.
3. Update the schema.
4. Update affected frontend code.
5. Update documentation/tests.

Do not casually break the frontend/backend contract.

---

# API Response Guidelines

Use consistent JSON responses.

Prediction responses should expose the product-level information the frontend
needs, such as:

```json
{
  "dropout_probability": 0.82,
  "risk_category": "High"
}
```

Student analysis may additionally contain:

```json
{
  "dropout_probability": 0.82,
  "risk_category": "High",
  "risk_factors": [],
  "protective_factors": [],
  "recommendations": []
}
```

Do not expose raw implementation details unless the endpoint explicitly
requires them.

Use appropriate HTTP status codes.

Do not return Python stack traces to the frontend.

---

# Database Guidelines

The database stores **application state**, not ML training data.

Application data may include:

- Students
- Display names
- Student IDs
- Department/program
- Mentor/user information
- Intervention records
- Application-level prediction information where needed

Interventions should contain:

- Student
- Mentor
- Type
- Date
- Notes
- Status

Current intervention statuses:

```text
Open
In Progress
Resolved
```

Keep database access out of route handlers when practical; use services/repositories
or the existing project pattern.

---

# Authentication

The MVP requires basic mentor/admin authentication.

- Never hardcode credentials.
- Never commit passwords.
- Keep authentication logic separate from unrelated business logic.
- Protect student-data endpoints appropriately.
- Do not build a complex authentication system unless required.

---

# Frontend Guidelines

The frontend is responsible for:

- UI
- Navigation
- Forms
- Tables
- Charts
- Risk visualization
- Student profiles
- Intervention UI
- API communication

The frontend must NOT:

- Load the ML pickle
- Run the ML model
- Perform ML preprocessing
- Calculate SHAP
- Directly call the model
- Directly call internal backend services

The frontend communicates through the backend API.

---

# Frontend Screens

The current MVP contains:

1. Login
2. Dashboard
3. Student List
4. Student Details

Intervention tracking belongs inside Student Details.

---

# Frontend Component Guidelines

Prefer reusable components for repeated UI patterns.

Examples:

```text
RiskBadge
RiskCard
StudentTable
StudentSearch
StudentFilters
StudentProfile
RiskFactors
ProtectiveFactors
InterventionList
InterventionForm
DashboardCard
```

Do not create a component for every tiny HTML fragment.

Avoid large components containing unrelated business logic.

Keep API calls in a frontend service/API layer rather than scattering raw
HTTP calls throughout components.

---

# Risk Display

Use:

- Predicted dropout risk
- Elevated predicted risk
- Risk category
- Factors contributing to predicted risk

Do NOT display:

- "Will drop out"
- "Guaranteed dropout"
- "This student will drop out"

The product is decision support.

Risk thresholds should come from the backend/model configuration. Do not
independently invent thresholds in the frontend.

---

# Explainability UI

Student Details should show:

- Risk factors
- Protective factors
- Plain-language explanations
- Direction of influence where useful

Raw SHAP values should not be shown in the normal mentor interface.

SHAP is model explanation, not proof of causation.

Use language such as:

> "This factor contributed to the model's predicted risk."

Avoid:

> "This factor caused the student to drop out."

---

# Intervention UI

Intervention tracking stays inside Student Details.

The UI should allow:

- Viewing intervention history
- Creating an intervention
- Updating intervention status
- Viewing mentor/date/type/notes

The frontend should use backend APIs for persistence.

Do not maintain a separate frontend-only source of truth for interventions.

---

# Demo / Dummy Model

The backend and frontend may use dummy/simulated data while the ML team is
working.

Dummy artifacts are temporary.

The final ML team pipeline may change preprocessing, features, model type, and
thresholds.

The frontend should depend on the **API contract**, not on the pickle structure.

When the ML model changes, the goal should be to replace the backend model
artifact without rewriting the frontend.

---

# Testing

When making backend changes:

- Test affected endpoints.
- Test valid and invalid input.
- Test response structure.
- Test important error cases.

When making frontend changes:

- Test the affected screen.
- Test loading/error/empty states where practical.
- Test API integration.
- Test forms and important interactions.

Do not remove failing tests just to make the test suite pass.

---

# Development Workflow

Before coding:

1. Read `AGENTS.md`.
2. Inspect the relevant files.
3. Identify existing patterns.
4. Determine the smallest change needed.

While coding:

1. Follow the existing architecture.
2. Reuse existing functionality.
3. Keep frontend/backend responsibilities separate.
4. Avoid unrelated refactoring.

After coding:

1. Run relevant tests/checks.
2. Check for obvious integration issues.
3. Confirm existing functionality still works.
4. Summarize the changes.

---

# Hackathon Rule

Prefer a working simple implementation over a theoretically perfect
architecture.

Do NOT introduce:

- Microservices
- Kubernetes
- Complex event systems
- Unnecessary abstractions
- Unnecessary databases
- Complex authentication
- Separate model-serving infrastructure

unless the team explicitly decides they are required.

The priority is:

```text
Frontend
   ↓
Backend API
   ↓
Model / Database / Services
   ↓
Working End-to-End Demo
```

---

# Conflict Handling

This file contains guidelines, not immutable requirements.

If the current code, latest team decision, or latest product specification
conflicts with this document:

1. Inspect the current implementation.
2. Identify the conflict.
3. Follow the latest explicit team decision.
4. Avoid large changes unless necessary.
5. If the conflict cannot be resolved safely, ask for clarification.
