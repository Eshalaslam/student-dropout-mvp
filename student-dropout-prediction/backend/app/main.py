"""
Main FastAPI entrypoint for Student Dropout Early-Warning System.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routes import auth, dashboard, students, interventions, reports, mentors, prediction
from backend.app.db.supabase_client import db_service
import logging

logger = logging.getLogger("dropout-system")

app = FastAPI(
    title="Student Dropout Early-Warning System API",
    description=(
        "Backend API for the Student Dropout Early-Warning System. "
        "Provides authentication, student risk assessment with ML+SHAP explainability, "
        "mentor intervention tracking, reporting, and Supabase database persistence."
    ),
    version="2.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(interventions.router, prefix="/api/interventions", tags=["Interventions"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(mentors.router, prefix="/api/mentors", tags=["Mentor Management"])
app.include_router(prediction.router, prefix="/api/prediction", tags=["Prediction"])
app.include_router(prediction.router, prefix="/api", tags=["Prediction"])


@app.on_event("startup")
def _auto_seed():
    """Seed demo data on startup when running in-memory (Supabase unreachable)."""
    if db_service.is_supabase_connected:
        logger.info("Supabase connected — skipping auto-seed.")
        return
    from backend.seed_data import main as seed
    seed()
    logger.info("In-memory mode: demo data seeded automatically.")


@app.on_event("shutdown")
def _shutdown():
    """Gracefully close the database connection pool on application shutdown."""
    db_service.close_pool()
    logger.info("Database connection pool closed.")


@app.get("/", tags=["Health"])
def read_root():
    return {
        "message": "Welcome to the Student Dropout Early-Warning System API",
        "docs_url": "/docs",
        "database_connected": db_service.is_supabase_connected,
        "version": "2.0.0",
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "database_connected": db_service.is_supabase_connected,
        "services": {
            "ml_model": True,
            "shap_explainer": True,
            "recommendation_engine": True,
        },
    }
