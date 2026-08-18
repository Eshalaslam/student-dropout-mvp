"""
Model Service.
Loads the fitted ML pipeline artifacts and returns dropout risk predictions.
"""
import os
import joblib
import pandas as pd
from backend.app.services.feature_mapping import convert_to_model_input

MODELS_DIR = os.path.join(os.path.dirname(__file__), "../../models")
FALLBACK_DIR = os.path.join(os.path.dirname(__file__), "../../../../")


def _resolve_model_path(filename: str) -> str:
    candidates = [
        os.path.join(os.path.dirname(__file__), "../../models", filename),
        os.path.join(os.path.dirname(__file__), "../../../models", filename),
        os.path.join(os.path.dirname(__file__), "../../../..", filename),
        os.path.join(os.path.dirname(__file__), "../../..", filename),
        os.path.join(os.getcwd(), filename),
        os.path.join(os.getcwd(), "..", filename),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return candidates[0]


class ModelService:
    """Singleton-ish service — artifacts loaded once on first instantiation."""

    _model = None
    _scaler = None
    _threshold = None

    def __init__(self):
        if ModelService._model is None:
            model_path = _resolve_model_path("dropout_model.pkl")
            scaler_path = _resolve_model_path("scaler.pkl")
            threshold_path = _resolve_model_path("threshold.pkl")

            if os.path.exists(model_path):
                ModelService._model = joblib.load(model_path)
            if os.path.exists(scaler_path):
                ModelService._scaler = joblib.load(scaler_path)
            if os.path.exists(threshold_path):
                ModelService._threshold = float(joblib.load(threshold_path))
            else:
                ModelService._threshold = 0.35

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
            "flagged": bool(prob >= self._threshold),
            "decision_threshold": round(self._threshold, 4)
        }

    def get_scaled_input(self, features: dict) -> pd.DataFrame:
        """Return the scaled DataFrame — used by SHAP service."""
        X = convert_to_model_input(features)
        return pd.DataFrame(self._scaler.transform(X), columns=X.columns)
