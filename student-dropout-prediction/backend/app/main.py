"""
Main FastAPI entrypoint.
"""
from fastapi import FastAPI
from backend.app.routes import prediction, students, dashboard

app = FastAPI(
    title="Student Dropout Prediction & Academic Success API",
    description="Backend API supporting the Student Dropout Prediction system, providing risk scores, explanations, and dashboard statistics.",
    version="1.0.0"
)

# Include routers
app.include_router(prediction.router, prefix="/api/prediction", tags=["Prediction"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Student Dropout Prediction & Academic Success API"}
