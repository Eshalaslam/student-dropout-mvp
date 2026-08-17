"""
SHAP Explainability Service.
Loads the SHAP explainer and produces per-prediction feature explanations.
"""
import os
import joblib
from backend.app.services.model_service import ModelService

MODELS_DIR = os.path.join(os.path.dirname(__file__), "../../models")


class ShapService:
    """Singleton-ish service — explainer loaded once on first instantiation."""

    _explainer = None

    def __init__(self):
        if ShapService._explainer is None:
            path = os.path.join(MODELS_DIR, "explainer.pkl")
            if os.path.exists(path):
                ShapService._explainer = joblib.load(path)

    def explain(self, features: dict, top_n: int = 3) -> list[dict]:
        """Return top-N SHAP contributors as [{"feature": ..., "impact": ...}, ...].

        Positive impact = pushed risk higher.
        Negative impact = pushed risk lower (protective factor).
        """
        if self._explainer is None:
            return []

        model_service = ModelService()
        X_scaled = model_service.get_scaled_input(features)

        shap_values = self._explainer.shap_values(X_scaled)

        # shap_values shape: (n_samples, n_features) — take the first (only) sample
        values = shap_values[0]

        from backend.app.services.feature_mapping import ML_COLUMN_ORDER

        indexed = sorted(
            zip(ML_COLUMN_ORDER, values), key=lambda x: abs(x[1]), reverse=True
        )

        return [
            {"feature": name, "impact": round(float(impact), 4)}
            for name, impact in indexed[:top_n]
        ]
