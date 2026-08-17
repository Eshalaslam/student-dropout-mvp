"""
Model Service.
Responsible for loading the fitted ML pipeline (preprocessing + model) and returning predictions.
"""
import os
import joblib

class ModelService:
    def __init__(self):
        # The ML team will eventually save a single fitted pipeline pickle here
        self.model_path = os.path.join(os.path.dirname(__file__), "../../models/pipeline.pkl")
        self.model = None
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)

    def predict(self, features):
        """
        Generate prediction score and risk band.
        """
        # Placeholder prediction logic
        return {
            "risk_score": 0.0,
            "risk_band": "low",
            "flagged": False
        }
