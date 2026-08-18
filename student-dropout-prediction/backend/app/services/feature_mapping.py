"""
Feature name mapping between the frontend-friendly schema and the
full ML column names expected by the model and scaler.

The API accepts simplified names; this module translates them to the
exact column names the trained model was fitted on, and computes the
5 engineered features the model also expects.
"""
import pandas as pd

# Mapping: simplified API name → full ML column name (as the scaler/model expect)
FEATURE_NAME_MAP = {
    "marital_status": "marital_status",
    "application_mode": "application_mode",
    "application_order": "application_order",
    "course": "course",
    "daytime_attendance": "daytime/evening_attendance",
    "age_at_enrollment": "age_at_enrollment",
    "previous_qualification": "previous_qualification",
    "previous_qualification_grade": "previous_qualification_grade",
    "mothers_qualification": "mother's_qualification",
    "fathers_qualification": "father's_qualification",
    "mothers_occupation": "mother's_occupation",
    "fathers_occupation": "father's_occupation",
    "admission_grade": "admission_grade",
    "displaced": "displaced",
    "special_needs": "educational_special_needs",
    "debtor": "debtor",
    "tuition_fees_current": "tuition_fees_up_to_date",
    "gender": "gender",
    "scholarship_holder": "scholarship_holder",
    "units_credited_sem1": "curricular_units_1st_sem_credited",
    "units_enrolled_sem1": "curricular_units_1st_sem_enrolled",
    "evaluations_sem1": "curricular_units_1st_sem_evaluations",
    "units_approved_sem1": "curricular_units_1st_sem_approved",
    "grade_sem1": "curricular_units_1st_sem_grade",
    "no_evaluations_sem1": "curricular_units_1st_sem_without_evaluations",
    "units_credited_sem2": "curricular_units_2nd_sem_credited",
    "units_enrolled_sem2": "curricular_units_2nd_sem_enrolled",
    "evaluations_sem2": "curricular_units_2nd_sem_evaluations",
    "units_approved_sem2": "curricular_units_2nd_sem_approved",
    "grade_sem2": "curricular_units_2nd_sem_grade",
    "no_evaluations_sem2": "curricular_units_2nd_sem_without_evaluations",
    "unemployment_rate": "unemployment_rate",
    "inflation_rate": "inflation_rate",
    "gdp": "gdp",
}

# Ordered list of all 39 ML column names — must match the order the scaler was fitted on
ML_COLUMN_ORDER = [
    "marital_status",
    "application_mode",
    "application_order",
    "course",
    "daytime/evening_attendance",
    "previous_qualification",
    "previous_qualification_grade",
    "mother's_qualification",
    "father's_qualification",
    "mother's_occupation",
    "father's_occupation",
    "admission_grade",
    "displaced",
    "educational_special_needs",
    "debtor",
    "tuition_fees_up_to_date",
    "gender",
    "scholarship_holder",
    "age_at_enrollment",
    "curricular_units_1st_sem_credited",
    "curricular_units_1st_sem_enrolled",
    "curricular_units_1st_sem_evaluations",
    "curricular_units_1st_sem_approved",
    "curricular_units_1st_sem_grade",
    "curricular_units_1st_sem_without_evaluations",
    "curricular_units_2nd_sem_credited",
    "curricular_units_2nd_sem_enrolled",
    "curricular_units_2nd_sem_evaluations",
    "curricular_units_2nd_sem_approved",
    "curricular_units_2nd_sem_grade",
    "curricular_units_2nd_sem_without_evaluations",
    "unemployment_rate",
    "inflation_rate",
    "gdp",
    # Engineered features
    "grade_change",
    "approval_ratio_sem1",
    "approval_ratio_sem2",
    "approval_rate_change",
    "engagement_score",
]


DEFAULT_FEATURE_VALUES = {
    "marital_status": 1,
    "application_mode": 1,
    "application_order": 1,
    "course": 9254,
    "daytime/evening_attendance": 1,
    "previous_qualification": 1,
    "previous_qualification_grade": 130.0,
    "mother's_qualification": 1,
    "father's_qualification": 1,
    "mother's_occupation": 5,
    "father's_occupation": 5,
    "admission_grade": 125.0,
    "displaced": 0,
    "educational_special_needs": 0,
    "debtor": 0,
    "tuition_fees_up_to_date": 1,
    "gender": 1,
    "scholarship_holder": 0,
    "age_at_enrollment": 20,
    "curricular_units_1st_sem_credited": 0,
    "curricular_units_1st_sem_enrolled": 6,
    "curricular_units_1st_sem_evaluations": 6,
    "curricular_units_1st_sem_approved": 6,
    "curricular_units_1st_sem_grade": 13.5,
    "curricular_units_1st_sem_without_evaluations": 0,
    "curricular_units_2nd_sem_credited": 0,
    "curricular_units_2nd_sem_enrolled": 6,
    "curricular_units_2nd_sem_evaluations": 6,
    "curricular_units_2nd_sem_approved": 6,
    "curricular_units_2nd_sem_grade": 14.0,
    "curricular_units_2nd_sem_without_evaluations": 0,
    "unemployment_rate": 10.8,
    "inflation_rate": 1.4,
    "gdp": 1.74,
}


def _safe_ratio(approved: float, enrolled: float) -> float:
    """approved / enrolled, returning 0.0 when enrolled is 0."""
    if enrolled == 0:
        return 0.0
    return approved / enrolled


def compute_engineered_features(row: dict) -> dict:
    """Compute the 5 engineered features from the raw input values."""
    sem1_grade = float(row.get("curricular_units_1st_sem_grade", 13.5))
    sem2_grade = float(row.get("curricular_units_2nd_sem_grade", 14.0))
    sem1_approved = float(row.get("curricular_units_1st_sem_approved", 6))
    sem1_enrolled = float(row.get("curricular_units_1st_sem_enrolled", 6))
    sem2_approved = float(row.get("curricular_units_2nd_sem_approved", 6))
    sem2_enrolled = float(row.get("curricular_units_2nd_sem_enrolled", 6))
    sem1_evaluations = float(row.get("curricular_units_1st_sem_evaluations", 6))
    sem2_evaluations = float(row.get("curricular_units_2nd_sem_evaluations", 6))

    ratio_sem1 = _safe_ratio(sem1_approved, sem1_enrolled)
    ratio_sem2 = _safe_ratio(sem2_approved, sem2_enrolled)

    total_enrolled = sem1_enrolled + sem2_enrolled
    engagement = (
        (sem1_evaluations + sem2_evaluations) / total_enrolled
        if total_enrolled > 0
        else 0.0
    )

    return {
        "grade_change": sem2_grade - sem1_grade,
        "approval_ratio_sem1": ratio_sem1,
        "approval_ratio_sem2": ratio_sem2,
        "approval_rate_change": ratio_sem2 - ratio_sem1,
        "engagement_score": engagement,
    }


def convert_to_model_input(features: dict) -> pd.DataFrame:
    """Convert simplified API fields to a 39-column DataFrame ready for the scaler.

    Steps:
    1. Map simplified names → ML column names
    2. Fill any missing values with baseline defaults
    3. Compute the 5 engineered features
    4. Return in the exact column order the scaler expects
    """
    mapped = dict(DEFAULT_FEATURE_VALUES)

    # Step 1: rename and set provided features
    for k, v in features.items():
        if k in FEATURE_NAME_MAP:
            mapped[FEATURE_NAME_MAP[k]] = v
        elif k in DEFAULT_FEATURE_VALUES:
            mapped[k] = v

    # Step 2: engineer derived features
    engineered = compute_engineered_features(mapped)
    mapped.update(engineered)

    # Step 3: return in the exact column order the scaler expects
    return pd.DataFrame([mapped], columns=ML_COLUMN_ORDER)
