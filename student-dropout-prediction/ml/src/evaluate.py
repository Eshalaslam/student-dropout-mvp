"""
Evaluation module.
Responsible for computing metrics (Recall, Precision, F1, AUC-PR) and bias/fairness checks.
"""
import pandas as pd

def evaluate_model(model, X_test: pd.DataFrame, y_test: pd.Series):
    """
    Evaluate the model performance on test data and print a classification report.
    """
    # TODO: Verify Recall >= 0.75 and perform subgroup bias checks
    pass
