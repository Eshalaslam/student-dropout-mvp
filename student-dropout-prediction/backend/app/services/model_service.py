"""
Model Service.
Loads the fitted ML pipeline artifacts and returns dropout risk predictions.
"""
import os
import joblib
import pandas as pd
from backend.app.services.feature_mapping import convert_to_model_input

MODELS_DIR = os.path.join(os.path.dirname(__file__), "../../models")


class ModelService:
    """Singleton-ish service — artifacts loaded once on first instantiation."""

    _model = None
    _scaler = None
    _threshold = None

    def __init__(self):
        if ModelService._model is None:
            ModelService._model = joblib.load(os.path.join(MODELS_DIR, "dropout_model.pkl"))
            ModelService._scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
            ModelService._threshold = joblib.load(os.path.join(MODELS_DIR, "threshold.pkl"))

    def predict(self, features: dict) -> dict:
        """Run inference and return risk score, band, and flagged status."""
        X = convert_to_model_input(features)
        X_scaled = pd.DataFrame(
            self._scaler.transform(X), columns=X.columns
        )

        prob = float(self._model.predict_proba(X_scaled)[0, 1])

        if prob >= 0.66:
            band = "high"
        elif prob >= self._threshold:
            band = "medium"
        else:
            band = "low"

        return {
            "risk_score": round(prob, 4),
            "risk_band": band,
            "flagged": prob >= self._threshold,
        }

    def get_scaled_input(self, features: dict) -> pd.DataFrame:
        """Return the scaled DataFrame — used by SHAP service."""
        X = convert_to_model_input(features)
        return pd.DataFrame(self._scaler.transform(X), columns=X.columns)
