# Backend — Student Dropout Prediction API

FastAPI backend that loads the trained ML model, runs inference, and
returns risk predictions with SHAP-based explanations.

## Setup

```bash
pip install -r ../requirements.txt
uvicorn backend.app.main:app --reload
```

Swagger UI: http://127.0.0.1:8000/docs

## API

### POST /api/prediction/predict

Predicts dropout risk for a student.

**Query parameter:** `student_id` (required)

**Request body:** 34 simplified fields (see schema for full list).

**Response:**

```json
{
  "student_id": "STU001",
  "risk_score": 0.9685,
  "risk_band": "high",
  "flagged": true,
  "top_reasons": [
    {"feature": "tuition_fees_up_to_date", "impact": 1.8313},
    {"feature": "curricular_units_2nd_sem_approved", "impact": 1.2695},
    {"feature": "course", "impact": -2.934}
  ]
}
```

- `risk_score`: 0.0–1.0, raw model probability
- `risk_band`: "high" (>=0.66) / "medium" (>=threshold) / "low"
- `flagged`: true if risk_score >= threshold
- `top_reasons`: top 3 SHAP contributors, positive = pushed risk up

## Files

### app/main.py
FastAPI entry point. Registers routers for prediction, students, and
dashboard under `/api/`.

### app/schemas/student.py
Pydantic models for request/response validation.

- `StudentFeatures` — 34 frontend-friendly fields (simplified names,
  no ML internals exposed)
- `Reason` — single SHAP contributor `{feature, impact}`
- `PredictionResponse` — full prediction output including student_id

### app/services/feature_mapping.py
Translates between frontend and ML naming conventions.

- `FEATURE_NAME_MAP` — dict mapping 34 simplified API names to the
  exact column names the scaler/model expect (e.g. `daytime_attendance`
  -> `daytime/evening_attendance`)
- `ML_COLUMN_ORDER` — ordered list of all 39 columns the model expects
- `compute_engineered_features()` — derives 5 features from raw inputs:
  - `grade_change` = sem2_grade - sem1_grade
  - `approval_ratio_sem1` = approved / enrolled (sem1)
  - `approval_ratio_sem2` = approved / enrolled (sem2)
  - `approval_rate_change` = ratio_sem2 - ratio_sem1
  - `engagement_score` = (evaluations_sem1 + evaluations_sem2) / total_enrolled
- `convert_to_model_input()` — full pipeline: map names -> compute
  engineered features -> order all 39 columns into a DataFrame

### app/services/model_service.py
Loads the fitted ML artifacts and runs inference.

- `dropout_model.pkl` — trained LogisticRegression
- `scaler.pkl` — fitted StandardScaler (39 features)
- `threshold.pkl` — decision threshold for risk band
- `predict()` — mapping -> scaling -> predict_proba -> risk band
- `get_scaled_input()` — returns scaled DataFrame (used by SHAP service)
- Singleton pattern: artifacts loaded once, reused across requests

### app/services/shap_service.py
Generates per-prediction feature explanations.

- `explainer.pkl` — fitted SHAP explainer
- `explain()` — computes SHAP values on scaled input, returns top 3
  features by absolute impact with directional values
- Positive impact = pushed risk higher (risk factor)
- Negative impact = pushed risk lower (protective factor)

### app/routes/prediction.py
Prediction endpoint. Takes `student_id` query param + `StudentFeatures`
body, calls model service for prediction, calls SHAP service for
explanations, returns combined response.

### backend/models/
ML artifacts loaded at runtime:
- `dropout_model.pkl` — trained model
- `scaler.pkl` — fitted scaler
- `threshold.pkl` — decision threshold
- `explainer.pkl` — SHAP explainer
