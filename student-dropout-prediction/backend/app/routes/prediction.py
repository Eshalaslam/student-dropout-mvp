"""
API routes for model predictions, SHAP explainability, and database persistence.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from backend.app.schemas.student import StudentFeatures, PredictionResponse
from backend.app.services.model_service import ModelService
from backend.app.services.shap_service import ShapService
from backend.app.services.recommendation_service import RecommendationService
from backend.app.services.auth_service import get_current_user
from backend.app.db.supabase_client import db_service

router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
def predict_student_risk(
    features: StudentFeatures,
    student_id: Optional[str] = Query(None, description="Unique student identifier (optional if logged in)"),
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Predict dropout risk for a student based on academic, demographic,
    and socio-economic features from the dataset.
    
    Automatically computes SHAP driver explanations and tailored recommendations,
    and persists both the student details and prediction record in Supabase.
    """
    try:
        # Determine student ID
        resolved_student_id = student_id
        if not resolved_student_id and current_user:
            resolved_student_id = current_user.get("student_id") or current_user.get("sub")
        if not resolved_student_id:
            resolved_student_id = "STU_GUEST"

        feat_dict = features.model_dump()

        # 1. Run ML inference
        model_service = ModelService()
        pred_result = model_service.predict(feat_dict)

        # 2. Run SHAP explainability
        shap_service = ShapService()
        reasons = shap_service.explain(feat_dict, top_n=5)

        # 3. Generate tailored recommendations
        rec_service = RecommendationService()
        recommendations = rec_service.generate_recommendations(feat_dict, pred_result, reasons)

        # 4. Persist student details & prediction result in Supabase
        db_service.save_student_details(resolved_student_id, feat_dict)
        
        saved_record = db_service.save_prediction({
            "student_id": resolved_student_id,
            "risk_score": pred_result["risk_score"],
            "risk_band": pred_result["risk_band"],
            "flagged": pred_result["flagged"],
            "top_reasons": reasons,
            "recommendations": recommendations,
            "features_snapshot": feat_dict
        })

        return {
            "id": saved_record.get("id"),
            "student_id": resolved_student_id,
            "risk_score": pred_result["risk_score"],
            "risk_band": pred_result["risk_band"],
            "flagged": pred_result["flagged"],
            "top_reasons": reasons,
            "recommendations": recommendations,
            "created_at": saved_record.get("created_at")
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
