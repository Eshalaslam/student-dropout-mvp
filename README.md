
# Student Dropout Prediction — Model Artifacts

Binary classifier (Dropout vs Not Dropout) built on the UCI "Predict Students'
Dropout and Academic Success" dataset, with engineered trajectory features and
fairness mitigation for the scholarship-holder subgroup.

## Model summary

- **Algorithm:** Logistic Regression, class-weighted + targeted sample reweighing
- **Recall (dropout class):** ~0.85 (priority metric — catching at-risk students)
- **Precision (dropout class):** ~0.70–0.75
- **Fairness:** scholarship-holder recall gap closed from 21.7pp to ~9pp below
  the non-scholarship-holder group (see `fairness_audit.csv`)

## Files in this repo

| File | What it is |
|---|---|
| `dropout_model.pkl` | Trained Logistic Regression model |
| `scaler.pkl` | Fitted StandardScaler — must be used to transform any new input before prediction |
| `threshold.pkl` | Decision threshold (float) — apply to `predict_proba()[:,1]`, not the default 0.5 |
| `explainer.pkl` | SHAP explainer for generating per-prediction reasons |
| `fairness_audit.csv` | Recall/precision broken out by subgroup (gender, scholarship status, etc.) |
| `api.py` | Reference implementation showing exact request/response shape and load order |
| `sample_response.json` | Example of what a `/predict` call returns |

## How to use the artifacts (for backend)

```python
import joblib
import pandas as pd

model = joblib.load('dropout_model.pkl')
scaler = joblib.load('scaler.pkl')
threshold = joblib.load('threshold.pkl')
explainer = joblib.load('explainer.pkl')

# Incoming student data must have the same columns as X_train (see api.py
# for the full field list), THEN scaled with scaler.transform() before
# calling model.predict_proba().
X_scaled = pd.DataFrame(scaler.transform(new_student_df), columns=new_student_df.columns)
risk_score = model.predict_proba(X_scaled)[0, 1]
flagged = risk_score >= threshold
```

See `api.py` for the full reference implementation, including SHAP-based
`top_reasons` generation.

## Output shape (for frontend)

See `sample_response.json` for a real example. Fields:
- `risk_score` (float, 0-1)
- `risk_band` ("high" / "medium" / "low")
- `flagged` (bool)
- `top_reasons` (list of `{feature, impact}`, top 3 SHAP contributors)
