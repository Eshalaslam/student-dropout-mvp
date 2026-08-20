-- ==============================================================================
-- Supabase PostgreSQL Schema for Student Dropout Early-Warning System
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Users Table (Students, Mentors & Admins)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    student_id TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'mentor', 'admin')),
    username TEXT UNIQUE,
    mentor_id TEXT,
    mentor_name TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Student Details Table (Features from UCI dataset + extra metadata)
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
    department TEXT,
    semester INT,
    attendance_percentage NUMERIC,
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
    status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Resolved', 'Escalated')),
    assigned_mentor TEXT,
    last_updated DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Mentors Table (Dedicated mentor profiles)
CREATE TABLE IF NOT EXISTS public.mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'Mentor',
    mentor_id TEXT UNIQUE,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Mentor Assignments Table
CREATE TABLE IF NOT EXISTS public.mentor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Mentor Notes Table
CREATE TABLE IF NOT EXISTS public.mentor_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 8. Intervention Notes Table
CREATE TABLE IF NOT EXISTS public.intervention_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 9. Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    generated_by TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    size TEXT,
    filters JSONB DEFAULT '{}'::jsonb
);

-- 10. Report Schedules Table
CREATE TABLE IF NOT EXISTS public.report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    frequency TEXT NOT NULL,
    email TEXT NOT NULL,
    active BOOLEAN DEFAULT true
);

-- 11. Access Logs Table
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT now(),
    user_name TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    student_id TEXT
);

-- 12. Privacy Documents Table
CREATE TABLE IF NOT EXISTS public.privacy_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Fairness Results Table
CREATE TABLE IF NOT EXISTS public.fairness_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribute TEXT NOT NULL,
    threshold NUMERIC,
    overall JSONB DEFAULT '{}'::jsonb,
    groups JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Feature Influence Table
CREATE TABLE IF NOT EXISTS public.feature_influence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature TEXT NOT NULL,
    sensitive BOOLEAN DEFAULT false,
    used_in_model BOOLEAN DEFAULT true,
    audit_only BOOLEAN DEFAULT false
);

-- 15. Predictions Table (ML inference history & risk tracking)
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    risk_score DOUBLE PRECISION NOT NULL,
    risk_band TEXT NOT NULL,
    flagged BOOLEAN DEFAULT FALSE,
    top_reasons JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    features_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users (student_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);
CREATE INDEX IF NOT EXISTS idx_predictions_student_id ON public.predictions (student_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_student_id ON public.interventions (student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor_id ON public.mentor_assignments (mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_student_id ON public.mentor_assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_student_id ON public.mentor_notes (student_id);
CREATE INDEX IF NOT EXISTS idx_intervention_notes_student_id ON public.intervention_notes (student_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON public.reports (date DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON public.access_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fairness_results_attribute ON public.fairness_results (attribute);
