"""
SHAP Explainability Service.
Loads the SHAP explainer and produces per-prediction feature explanations with
human-readable labels and protective vs. risk categorization.
"""
import os
import joblib
from backend.app.services.model_service import ModelService, _resolve_model_path

FEATURE_DESCRIPTIONS = {
    "curricular_units_2nd_sem_approved": "Courses successfully approved in Semester 2",
    "curricular_units_1st_sem_approved": "Courses successfully approved in Semester 1",
    "curricular_units_2nd_sem_enrolled": "Number of credits enrolled in Semester 2",
    "curricular_units_1st_sem_enrolled": "Number of credits enrolled in Semester 1",
    "curricular_units_2nd_sem_grade": "Grade average in Semester 2",
    "curricular_units_1st_sem_grade": "Grade average in Semester 1",
    "curricular_units_2nd_sem_evaluations": "Exam evaluations attended in Semester 2",
    "curricular_units_1st_sem_evaluations": "Exam evaluations attended in Semester 1",
    "curricular_units_2nd_sem_without_evaluations": "Courses without evaluations in Semester 2",
    "curricular_units_1st_sem_without_evaluations": "Courses without evaluations in Semester 1",
    "tuition_fees_up_to_date": "Tuition fee payment status",
    "debtor": "Outstanding institutional debt status",
    "scholarship_holder": "Scholarship financial support status",
    "age_at_enrollment": "Age at university enrollment",
    "admission_grade": "Initial university entrance admission grade",
    "previous_qualification_grade": "Previous secondary school qualification grade",
    "daytime/evening_attendance": "Class attendance schedule (daytime vs evening)",
    "course": "Degree program choice",
    "approval_ratio_sem1": "Course approval pass rate in Semester 1",
    "approval_ratio_sem2": "Course approval pass rate in Semester 2",
    "approval_rate_change": "Trajectory change in approval rate (Sem 2 vs Sem 1)",
    "grade_change": "Grade improvement / drop trajectory",
    "engagement_score": "Overall academic evaluation engagement score",
    "displaced": "Displaced / relocated student status",
    "gender": "Demographic gender indicator",
    "unemployment_rate": "Regional economic unemployment rate",
    "inflation_rate": "Economic inflation rate",
    "gdp": "Regional GDP growth rate"
}


class ShapService:
    """Singleton-ish service — explainer loaded once on first instantiation."""

    _explainer = None

    def __init__(self):
        if ShapService._explainer is None:
            path = _resolve_model_path("explainer.pkl")
            if os.path.exists(path):
                ShapService._explainer = joblib.load(path)

    def explain(self, features: dict, top_n: int = 5) -> list[dict]:
        """Return top-N SHAP contributors with human-readable descriptions and category."""
        if self._explainer is None:
            return []

        model_service = ModelService()
        X_scaled = model_service.get_scaled_input(features)

        shap_values = self._explainer.shap_values(X_scaled)
        values = shap_values[0]

        from backend.app.services.feature_mapping import ML_COLUMN_ORDER

        indexed = sorted(
            zip(ML_COLUMN_ORDER, values), key=lambda x: abs(x[1]), reverse=True
        )

        results = []
        for name, impact in indexed[:top_n]:
            impact_val = round(float(impact), 4)
            cat = "risk" if impact_val > 0 else "protective"
            desc = FEATURE_DESCRIPTIONS.get(name, name.replace("_", " ").title())
            results.append({
                "feature": name,
                "impact": impact_val,
                "description": desc,
                "category": cat
            })

        return results
