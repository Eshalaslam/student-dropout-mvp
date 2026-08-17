-- ==============================================================================
-- Supabase PostgreSQL Schema for Student Dropout Prediction System
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Users Table (Students & Mentors/Admins)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    student_id TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'mentor', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Student Details Table (Features from UCI dataset)
CREATE TABLE IF NOT EXISTS public.student_details (
    student_id TEXT PRIMARY KEY,
    marital_status INT NOT NULL,
    application_mode INT NOT NULL,
    application_order INT NOT NULL,
    course INT NOT NULL,
    daytime_attendance INT NOT NULL,
    age_at_enrollment INT NOT NULL,
    previous_qualification INT NOT NULL,
    previous_qualification_grade NUMERIC NOT NULL,
    mothers_qualification INT NOT NULL,
    fathers_qualification INT NOT NULL,
    mothers_occupation INT NOT NULL,
    fathers_occupation INT NOT NULL,
    admission_grade NUMERIC NOT NULL,
    displaced INT NOT NULL,
    special_needs INT NOT NULL,
    debtor INT NOT NULL,
    tuition_fees_current INT NOT NULL,
    gender INT NOT NULL,
    scholarship_holder INT NOT NULL,
    units_credited_sem1 INT NOT NULL,
    units_enrolled_sem1 INT NOT NULL,
    evaluations_sem1 INT NOT NULL,
    units_approved_sem1 INT NOT NULL,
    grade_sem1 NUMERIC NOT NULL,
    no_evaluations_sem1 INT NOT NULL,
    units_credited_sem2 INT NOT NULL,
    units_enrolled_sem2 INT NOT NULL,
    evaluations_sem2 INT NOT NULL,
    units_approved_sem2 INT NOT NULL,
    grade_sem2 NUMERIC NOT NULL,
    no_evaluations_sem2 INT NOT NULL,
    unemployment_rate NUMERIC NOT NULL,
    inflation_rate NUMERIC NOT NULL,
    gdp NUMERIC NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Predictions Table (Model inference & SHAP explainability logs)
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    risk_score NUMERIC NOT NULL,
    risk_band TEXT NOT NULL CHECK (risk_band IN ('high', 'medium', 'low')),
    flagged BOOLEAN NOT NULL,
    top_reasons JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    features_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Interventions Table (Mentor actions & tracking)
CREATE TABLE IF NOT EXISTS public.interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    mentor_name TEXT NOT NULL,
    type TEXT NOT NULL,
    notes TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users (student_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_predictions_student_id ON public.predictions (student_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_student_id ON public.interventions (student_id);
