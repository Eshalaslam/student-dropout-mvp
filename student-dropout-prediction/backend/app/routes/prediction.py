"""
API routes for model predictions and explanations.
"""
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas.student import StudentFeatures, PredictionResponse
from backend.app.services.model_service import ModelService
from backend.app.services.shap_service import ShapService

router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
def predict_student_risk(
    features: StudentFeatures,
    student_id: str = Query(..., description="Unique student identifier"),
):
    """Predict dropout risk for a student."""
    try:
        model_service = ModelService()
        prediction = model_service.predict(features.model_dump())

        shap_service = ShapService()
        reasons = shap_service.explain(features.model_dump())

        prediction["student_id"] = student_id
        prediction["top_reasons"] = reasons
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
