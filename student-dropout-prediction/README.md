# Student Dropout Early-Warning & Prediction System

A complete FastAPI backend and machine learning inference service for predicting student dropout risk using the UCI "Predict Students' Dropout and Academic Success" dataset, with SHAP explainability, targeted recommendations, student authentication, and Supabase PostgreSQL persistence.

## Features
- **Student & Mentor Authentication**: Secure registration and login (`/api/auth/register`, `/api/auth/login`) with password hashing and JWT token issuance.
- **Dataset Details Entry**: Students can enter and manage their academic, socio-economic, and demographic parameters (`/api/students/{id}/details`).
- **Real-Time ML Prediction**: Trained logistic regression model with engineered trajectory features (`/api/prediction/predict`) returning risk score (0.0–1.0), risk category (High/Medium/Low), and flagged status.
- **SHAP Explainability**: Returns the top contributing risk drivers and protective factors with plain-language explanations.
- **Tailored Recommendations**: Dynamic academic, financial, and advisor recommendations based on identified risk factors.
- **Supabase DB Persistence**: Stores users, feature profiles, prediction history, and mentor interventions directly in Supabase PostgreSQL (with automatic local fallback store for immediate local development).
- **Mentor Dashboard & Intervention Tracking**: Summary risk counts, student list, and intervention CRUD logs.

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment & Supabase (Optional)
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-or-service-role-key
JWT_SECRET=your-secret-key
```
Execute the SQL statements in `backend/app/db/schema.sql` within your Supabase SQL Editor to create the tables.

*(If credentials are not set, the system seamlessly operates in local in-memory mode for development and testing).*

### 3. Run the Backend Server
```bash
uvicorn backend.app.main:app --reload --port 8000
```
Visit the interactive Swagger API documentation at:
**http://localhost:8000/docs**

### 4. Run Automated Tests
```bash
pytest backend/tests/test_backend.py -v
```
