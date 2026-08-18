# Student Dropout Early-Warning System

A full-stack backend API for predicting and preventing student dropout using machine learning (Gradient Boosting), SHAP explainability, and mentor-driven intervention workflows.

## Tech Stack

- **Backend**: FastAPI (Python 3.10+)
- **Database**: Supabase PostgreSQL (with in-memory fallback)
- **Auth**: JWT (PyJWT + bcrypt)
- **ML**: scikit-learn Gradient Boosting + SHAP explainability
- **Deployment**: Uvicorn ASGI server

## Setup

### 1. Install Dependencies

```bash
cd student-dropout-prediction/backend
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `.env` in the backend directory:

```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
JWT_SECRET=your-jwt-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440
```

### 3. Initialize Database Schema

If using Supabase, run the SQL in `app/db/schema.sql` via the Supabase SQL Editor.

For development, the app runs with an **in-memory fallback** — no database required.

### 4. Seed Demo Data

```bash
cd student-dropout-prediction
python -m backend.seed_data
```

### 5. Start Server

```bash
cd student-dropout-prediction
uvicorn backend.app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

## Seed Credentials

| Role     | Username      | Password   |
|----------|---------------|------------|
| Admin    | admin         | admin123   |
| Mentor   | mentor_james  | mentor123  |
| Mentor   | mentor_sarah  | mentor123  |
| Mentor   | mentor_maria  | mentor123  |

## API Endpoints

### Authentication (`/api/auth`)
| Method | Path           | Description              |
|--------|----------------|--------------------------|
| POST   | /login         | Login (username+password)|
| POST   | /logout        | Logout                   |
| GET    | /me            | Current user profile     |

### Dashboard (`/api/dashboard`)
| Method | Path                   | Description                |
|--------|------------------------|----------------------------|
| GET    | /stats                 | Overview statistics        |
| GET    | /risk-distribution     | Risk band counts           |
| GET    | /department-breakdown  | Risk by department         |
| GET    | /top-risk-drivers      | Top SHAP risk factors      |
| GET    | /priority-outreach     | High-risk student list     |

### Students (`/api/students`)
| Method | Path                | Description                    |
|--------|---------------------|--------------------------------|
| GET    | /                   | List students (with filters)   |
| GET    | /{student_id}       | Student detail with risk       |
| PATCH  | /{student_id}       | Update student (Admin only)    |

### Interventions (`/api/interventions`)
| Method | Path                         | Description                      |
|--------|------------------------------|----------------------------------|
| GET    | /                            | List intervention students       |
| GET    | /{student_id}                | Student intervention detail      |
| PATCH  | /{student_id}/status         | Update intervention status       |
| POST   | /{student_id}/notes          | Add mentor note                  |
| PATCH  | /{student_id}/reassign       | Reassign mentor (Admin)          |

### Reports (`/api/reports`)
| Method | Path               | Description              |
|--------|--------------------|--------------------------|
| GET    | /preview           | Preview report data      |
| POST   | /export            | Export CSV/PDF           |
| GET    | /history           | Report generation history|
| GET    | /schedule          | List report schedules    |
| POST   | /schedule          | Create schedule          |
| DELETE | /schedule/{id}     | Delete schedule          |

### Audit (`/api/audit`) — Admin Only
| Method | Path                 | Description                 |
|--------|----------------------|-----------------------------|
| GET    | /fairness            | Demographic fairness audit  |
| GET    | /feature-disclosure  | Feature influence table     |
| GET    | /access-log          | Access compliance logs      |
| GET    | /privacy-docs        | Privacy documentation       |
| PUT    | /privacy-docs        | Update privacy docs         |
| GET    | /export              | Export full audit as CSV    |

### Mentors (`/api/mentors`) — Admin Only
| Method | Path                  | Description              |
|--------|-----------------------|--------------------------|
| GET    | /                     | List all mentors         |
| POST   | /                     | Register new mentor      |
| PATCH  | /{id}                 | Edit mentor profile      |
| PATCH  | /{id}/deactivate      | Toggle active/inactive   |

## Role-Based Access

| Feature              | Admin | Mentor |
|----------------------|-------|--------|
| Login                | ✅     | ✅      |
| View all students    | ✅     | ❌*     |
| View assigned student| ✅     | ✅      |
| Update student info  | ✅     | ❌      |
| Manage interventions | ✅     | ✅      |
| Reassign mentor      | ✅     | ❌      |
| View reports         | ✅     | ✅      |
| Export reports       | ✅     | ✅      |
| Audit (fairness etc) | ✅     | ❌      |
| Manage mentors       | ✅     | ❌      |

*Mentors can only view students assigned to them.

## File Structure

```
student-dropout-mvp/
├── student-dropout-prediction/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py                  # FastAPI app entry point
│   │   │   ├── routes/
│   │   │   │   ├── auth.py              # Authentication endpoints
│   │   │   │   ├── dashboard.py         # Dashboard statistics
│   │   │   │   ├── students.py          # Student CRUD
│   │   │   │   ├── interventions.py     # Intervention tracking
│   │   │   │   ├── reports.py           # Report generation & scheduling
│   │   │   │   ├── audit.py             # Bias & privacy audit
│   │   │   │   └── mentors.py           # Mentor management
│   │   │   ├── schemas/
│   │   │   │   ├── auth.py              # Auth request/response models
│   │   │   │   ├── student.py           # Student features & profiles
│   │   │   │   ├── intervention.py      # Intervention schemas
│   │   │   │   ├── report.py            # Report schemas
│   │   │   │   ├── audit.py             # Audit schemas
│   │   │   │   ├── mentor.py            # Mentor schemas
│   │   │   │   └── dashboard.py         # Dashboard schemas
│   │   │   ├── services/
│   │   │   │   ├── auth_service.py      # JWT + bcrypt auth
│   │   │   │   ├── model_service.py     # ML model inference
│   │   │   │   ├── shap_service.py      # SHAP explanations
│   │   │   │   ├── recommendation_service.py  # Academic recommendations
│   │   │   │   └── feature_mapping.py   # Feature name translation
│   │   │   └── db/
│   │   │       ├── schema.sql           # Supabase DDL
│   │   │       └── supabase_client.py   # Database service layer
│   │   ├── models/
│   │   │   ├── dropout_model.pkl        # Trained ML model
│   │   │   ├── scaler.pkl               # Feature scaler
│   │   │   ├── threshold.pkl            # Decision threshold
│   │   │   └── explainer.pkl            # SHAP explainer
│   │   ├── seed_data.py                 # Demo data seeder
│   │   ├── requirements.txt             # Python dependencies
│   │   └── .env                         # Environment configuration
│   └── README.md
```

## ML Model

The system uses a **Gradient Boosting classifier** trained on the UCI Student Performance dataset with 34 raw features + 5 engineered features (39 total). The model outputs a dropout probability between 0 and 1.

**Risk Bands:**
- **High**: dropout_probability >= 0.66
- **Medium**: dropout_probability >= threshold (from training)
- **Low**: dropout_probability < threshold

**SHAP Explanability**: Each prediction includes top-5 feature contributions explaining why the model flagged a student, categorized as "risk" (increasing dropout) or "protective" (decreasing dropout).
