"""
Main FastAPI entrypoint for Student Dropout Early-Warning System.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routes import auth, prediction, students, dashboard
from backend.app.db.supabase_client import db_service

app = FastAPI(
    title="Student Dropout Prediction & Academic Success API",
    description=(
        "Backend API supporting the Student Dropout Prediction system. "
        "Provides student authentication, UCI dataset details entry, ML inference with SHAP explanations, "
        "tailored recommendations, mentor intervention tracking, and Supabase database persistence."
    ),
    version="1.0.0"
)

# CORS configuration for frontend and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(prediction.router, prefix="/api/prediction", tags=["Prediction"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/", tags=["Health"])
def read_root():
    return {
        "message": "Welcome to the Student Dropout Prediction & Academic Success API",
        "docs_url": "/docs",
        "database_connected": db_service.is_supabase_connected,
        "version": "1.0.0"
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "database_connected": db_service.is_supabase_connected,
        "services": {
            "ml_model": True,
            "shap_explainer": True,
            "recommendation_engine": True
        }
    }
