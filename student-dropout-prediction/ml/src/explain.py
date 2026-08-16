"""
Explainability module.
Responsible for SHAP global analysis and saving the SHAP explainer for local dashboard use.
"""
import pandas as pd

def generate_shap_values(model, X: pd.DataFrame):
    """
    Generate SHAP values and save the explainer artifact.
    """
    # TODO: Export explainer.pkl for the serving backend to load
    pass
