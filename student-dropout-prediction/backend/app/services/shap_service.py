"""
SHAP Explainability Service.
Responsible for loading the SHAP explainer and explaining individual predictions.
"""
import os
import joblib

class ShapService:
    def __init__(self):
        # Load cached SHAP explainer
        self.explainer_path = os.path.join(os.path.dirname(__file__), "../../models/explainer.pkl")
        self.explainer = None
        if os.path.exists(self.explainer_path):
            self.explainer = joblib.load(self.explainer_path)

    def explain(self, features):
        """
        Return the top SHAP features contributing to the risk score.
        """
        return []
