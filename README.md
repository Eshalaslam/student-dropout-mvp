# Student Dropout Early-Warning System — End-to-End ML Pipeline

**Type:** Supervised Classification (Binary) | **Target metric:** Recall ≥ 0.75 on dropout class
**Dataset:** UCI "Predict Students' Dropout and Academic Success" (~4,400 records, 36 features)

---

## 0. Pipeline Overview

```
┌──────────────┐   ┌──────────────────┐   ┌───────────────┐   ┌────────────────┐   ┌───────────────┐   ┌──────────────────┐
│  Data         │→ │  Feature           │→ │  Model         │→ │  Explainability  │→ │  Serving /     │→ │  Dashboard &      │
│  Ingestion &  │  │  Engineering &     │  │  Training &    │  │  Layer           │  │  API           │  │  Intervention     │
│  Validation   │  │  Preprocessing     │  │  Selection     │  │  (SHAP)          │  │                │  │  Tracking         │
└──────────────┘   └──────────────────┘   └───────────────┘   └────────────────┘   └───────────────┘   └──────────────────┘
       │                    │                     │                    │                    │                     │
   raw CSV            feature_store.pkl     model.pkl +          shap_values.pkl     FastAPI /             Streamlit /
   + schema check      train/val/test        metrics.json        + explainer.pkl     REST endpoint          React UI
                        splits (versioned)
```

Everything below is designed to be reproducible: every stage reads/writes versioned artifacts to disk (or a model registry), so you can re-run any single stage without re-running the whole pipeline.

---

## 1. Repository Structure

```
dropout-prediction/
├── data/
│   ├── raw/                     # original UCI CSV, never modified
│   ├── interim/                 # after cleaning, before feature engineering
│   ├── processed/               # final train/val/test splits
│   └── data_dictionary.md       # column definitions, types, valid ranges
├── src/
│   ├── data/
│   │   ├── load_data.py
│   │   ├── validate_schema.py
│   │   └── make_splits.py
│   ├── features/
│   │   ├── build_features.py    # delta features, ratios, binning
│   │   └── feature_store.py
│   ├── models/
│   │   ├── train.py
│   │   ├── evaluate.py
│   │   ├── threshold_tuning.py
│   │   └── registry.py          # model versioning / promotion logic
│   ├── explainability/
│   │   └── shap_pipeline.py
│   ├── fairness/
│   │   └── subgroup_audit.py
│   ├── serving/
│   │   ├── api.py               # FastAPI inference service
│   │   └── schema.py            # pydantic request/response models
│   └── dashboard/
│       └── app.py               # Streamlit app
├── tests/
│   ├── test_data_validation.py
│   ├── test_features.py
│   └── test_model_contract.py
├── notebooks/                   # EDA only — nothing production runs from here
├── configs/
│   ├── config.yaml              # paths, hyperparameters, thresholds
│   └── logging.yaml
├── artifacts/                   # versioned model + metric outputs (gitignored, DVC/MLflow tracked)
├── Dockerfile
├── docker-compose.yaml
├── requirements.txt
└── README.md
```

---

## 2. Stage 1 — Data Ingestion & Validation

**Goal:** guarantee that garbage data never silently enters the pipeline.

| Step | Detail |
|---|---|
| Load | Pull UCI dataset (36 raw columns, ~4,424 rows) into `data/raw/`. Never edit this file. |
| Schema validation | Use **Pandera** or **Great Expectations** to enforce column types, ranges (e.g., `Age at enrollment` 15–70), and non-null constraints on required columns. Pipeline fails loudly (not silently) on violation. |
| Target encoding | Map `Target` (`Dropout` / `Enrolled` / `Graduate`) → binary `is_dropout` (1/0). Keep the 3-class version too, for the optional "prolonged enrollment" stretch model. |
| Duplicate/leakage check | Confirm no duplicate student rows; confirm no post-outcome features leak into training (e.g., nothing computed *after* the dropout event). |
| Train/val/test split | **Stratified** split (70/15/15) on `is_dropout` to preserve class ratio (~32% dropout) in every split. Fix `random_state` and log the split hash so results are reproducible. |
| Versioning | Track raw + processed data with **DVC** (or MLflow artifacts) so every model run points to an exact data version. |

```python
# src/data/make_splits.py
from sklearn.model_selection import train_test_split

X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.30, stratify=y, random_state=42
)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=42
)
```

**Output artifacts:** `data/processed/{train,val,test}.parquet`, `data_validation_report.html`

---

## 3. Stage 2 — Feature Engineering

This is the stage that differentiates the project from a "load CSV → fit XGBoost" baseline.

### 3.1 Feature groups

| Group | Examples |
|---|---|
| **Raw academic** | admission grade, prior qualification grade, units enrolled/evaluated/approved (sem 1 & 2) |
| **Delta / trajectory features** | `grade_change = grade_sem2 - grade_sem1`, `approval_rate_change = approval_rate_sem2 - approval_rate_sem1` — captures *decline*, not just a snapshot |
| **Risk ratios** | `approval_ratio_sem1 = units_approved_sem1 / units_enrolled_sem1` (same for sem 2); ratio near 0 = strong signal |
| **Composite engagement score** | Weighted combination of approval ratio + evaluation completion rate, normalized 0–1 |
| **Socio-economic bins** | Bin raw income/occupation codes into ordinal risk bands (low/med/high) to reduce noise and improve interpretability |
| **Macro context** | Unemployment rate, inflation, GDP at enrollment year (already provided per record) |
| **Categorical encodings** | One-hot for nominal (course, application mode); ordinal/target encoding for high-cardinality fields |

### 3.2 Preprocessing pipeline (sklearn `ColumnTransformer`)

```python
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer

numeric_features = ["admission_grade", "grade_change", "approval_ratio_sem1",
                     "approval_ratio_sem2", "engagement_score", "age_at_enrollment"]
categorical_features = ["course", "application_mode", "gender", "scholarship_holder"]

preprocessor = ColumnTransformer([
    ("num", Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler())
    ]), numeric_features),
    ("cat", Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore"))
    ]), categorical_features),
])
```

**Important:** fit the preprocessor only on the **training split**, then `.transform()` val/test — never fit on the full dataset (this is a common leakage bug).

**Output artifact:** `artifacts/preprocessor.pkl`, `artifacts/feature_manifest.json` (list of final feature names post-encoding, for SHAP labeling later)

---

## 4. Stage 3 — Model Training & Selection

### 4.1 Baseline → main model progression

| Model | Purpose |
|---|---|
| Logistic Regression (class-weighted) | Interpretable floor — if your fancy model can't beat this, something's wrong |
| Random Forest | Sanity-check nonlinear baseline |
| **XGBoost / LightGBM (main model)** | Handles imbalance + mixed tabular data well, integrates cleanly with SHAP |
| Optional: Neural net on sequential (sem1→sem2) features | If pursuing the trajectory/LSTM innovation |

### 4.2 Class imbalance — run both, don't guess

```python
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier

# Approach A: class weighting
model_weighted = XGBClassifier(
    scale_pos_weight=(len(y_train) - y_train.sum()) / y_train.sum(),
    eval_metric="logloss",
    random_state=42
)

# Approach B: SMOTE oversampling
smote = SMOTE(random_state=42)
X_train_sm, y_train_sm = smote.fit_resample(X_train_transformed, y_train)
model_smote = XGBClassifier(eval_metric="logloss", random_state=42)
```

Run an **ablation study**: train both, compare recall/precision/F1/AUC-PR on the validation set, and report which wins and why. This comparison itself is a legitimate "innovation" bullet in your writeup.

### 4.3 Hyperparameter tuning

- Use **Optuna** or `RandomizedSearchCV` with **stratified k-fold CV** (k=5), optimizing directly for **recall at a fixed precision floor** (or `average_precision`, i.e., area under the PR curve) — not accuracy, not plain ROC-AUC, since the classes are imbalanced.
- Log every trial (params + metrics) to **MLflow** for a full experiment history.

```python
import optuna
from sklearn.model_selection import StratifiedKFold, cross_val_score

def objective(trial):
    params = {
        "max_depth": trial.suggest_int("max_depth", 3, 10),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "n_estimators": trial.suggest_int("n_estimators", 100, 600),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
        "scale_pos_weight": trial.suggest_float("scale_pos_weight", 1.0, 3.0),
    }
    model = XGBClassifier(**params, eval_metric="logloss", random_state=42)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(model, X_train_transformed, y_train, cv=cv, scoring="average_precision")
    return scores.mean()

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=50)
```

### 4.4 Threshold selection (not default 0.5)

```python
from sklearn.metrics import precision_recall_curve

y_probs = best_model.predict_proba(X_val_transformed)[:, 1]
precision, recall, thresholds = precision_recall_curve(y_val, y_probs)

# Pick smallest threshold that still achieves recall >= 0.75
target_recall = 0.75
valid_idx = [i for i, r in enumerate(recall) if r >= target_recall]
chosen_threshold = thresholds[max(valid_idx)] if valid_idx else 0.5
```

Document this decision explicitly: the threshold is chosen *because* false negatives (missed dropouts) are more costly than false positives (an unnecessary mentor check-in).

**Output artifacts:** `artifacts/model.pkl`, `artifacts/threshold.json`, `artifacts/metrics.json`, MLflow run ID

---

## 5. Stage 4 — Evaluation

| Metric | Why it's tracked |
|---|---|
| **Recall (dropout class)** | Primary success metric — target ≥ 0.75 |
| Precision (dropout class) | Secondary — tracked so recall gains aren't "free" |
| F1, AUC-PR | Overall balance / imbalance-aware alternative to ROC-AUC |
| Confusion matrix | Sanity check on absolute error counts |
| Calibration curve | Are predicted probabilities trustworthy, or over/under-confident? |
| **Subgroup recall/precision** | Broken out by gender, income bracket, first-gen status — required for the fairness audit (Section 7) |

```python
from sklearn.metrics import classification_report, confusion_matrix, average_precision_score

y_pred = (y_probs >= chosen_threshold).astype(int)
print(classification_report(y_val, y_pred, target_names=["Not Dropout", "Dropout"]))
print(confusion_matrix(y_val, y_pred))
print("AUC-PR:", average_precision_score(y_val, y_probs))
```

Final numbers are only reported once — on the **held-out test set** — after the model and threshold are frozen using train/val only. This avoids test-set leakage into decision-making.

---

## 6. Stage 5 — Explainability Layer (SHAP)

```python
import shap

explainer = shap.TreeExplainer(best_model)
shap_values = explainer.shap_values(X_test_transformed)

# Global: what drives dropout overall
shap.summary_plot(shap_values, X_test_transformed, feature_names=feature_manifest)

# Local: per-student root cause (for dashboard)
def explain_student(idx):
    return shap.force_plot(
        explainer.expected_value, shap_values[idx], X_test_transformed[idx],
        feature_names=feature_manifest
    )
```

- **Global summary plot** → feature importance overall (expect: sem-2 approval rate, tuition-fees-up-to-date, scholarship status to dominate).
- **Local waterfall/force plot per student** → the actionable "why" (e.g., "attendance-adjacent proxy down 20% + 2 backlogs").
- **Dependence plots** → check for non-linear effects (e.g., risk vs. age isn't monotonic).
- Cache SHAP values per student at batch-scoring time so the dashboard doesn't recompute them live (SHAP is expensive at inference time for tree ensembles with many features).

**Output artifact:** `artifacts/shap_values.pkl`, `artifacts/explainer.pkl`

---

## 7. Stage 6 — Bias & Fairness Audit

Not optional — this is written up as a first-class deliverable, not a footnote.

```python
from sklearn.metrics import recall_score

for group_col in ["gender", "scholarship_holder", "displaced", "debtor"]:
    for group_val in X_test[group_col].unique():
        mask = X_test[group_col] == group_val
        r = recall_score(y_test[mask], y_pred[mask])
        print(f"{group_col}={group_val}: recall={r:.3f}, n={mask.sum()}")
```

- Report recall/precision **per protected subgroup**, not just in aggregate.
- Flag any subgroup where recall drops meaningfully below the global 0.75 target — that's a fairness failure worth writing up, not hiding.
- Document in a short **Responsible AI section**: what demographic proxies exist in the model, what the risk of unfair flagging is, and what mitigation was considered (reweighing, adversarial debiasing, or simply excluding a feature if its marginal predictive value is low relative to its fairness risk).

---

## 8. Stage 7 — Serving / Inference API

```python
# src/serving/api.py
from fastapi import FastAPI
from pydantic import BaseModel
import joblib

app = FastAPI(title="Dropout Risk API")
model = joblib.load("artifacts/model.pkl")
preprocessor = joblib.load("artifacts/preprocessor.pkl")
explainer = joblib.load("artifacts/explainer.pkl")
THRESHOLD = json.load(open("artifacts/threshold.json"))["value"]

class StudentFeatures(BaseModel):
    admission_grade: float
    grade_sem1: float
    grade_sem2: float
    units_enrolled_sem1: int
    units_approved_sem1: int
    # ... remaining fields

@app.post("/predict")
def predict(features: StudentFeatures):
    X = preprocessor.transform(pd.DataFrame([features.dict()]))
    prob = model.predict_proba(X)[0, 1]
    shap_vals = explainer.shap_values(X)[0]
    top_reasons = sorted(zip(feature_manifest, shap_vals), key=lambda x: -abs(x[1]))[:3]
    return {
        "risk_score": float(prob),
        "risk_band": "high" if prob >= 0.66 else "medium" if prob >= THRESHOLD else "low",
        "flagged": bool(prob >= THRESHOLD),
        "top_reasons": [{"feature": f, "impact": float(v)} for f, v in top_reasons]
    }
```

- Batch scoring job (e.g., nightly cron / Airflow DAG) scores the whole active student roster and writes results to a database table — the dashboard reads from that table, it doesn't call the model live per page-load.
- Add basic **request validation, rate limiting, and auth** (even simple API-key auth) before calling this "deployed."

---

## 9. Stage 8 — Dashboard & Intervention Tracking

**Recommended stack:** Streamlit (fastest to build) or a React frontend calling the FastAPI service (more portfolio-polished).

| Screen | Contents |
|---|---|
| **Overview** | Total students, count per risk band, trend of flags over time, aggregate risk by course/program |
| **At-risk list** | Sortable/filterable table by risk band, course, mentor assigned |
| **Student detail** | Risk score, SHAP waterfall chart, suggested action (rule-mapped from top SHAP feature: attendance-driven → nudge email; fee-driven → route to financial aid office) |
| **Intervention log** | Status tracker per student: `flagged → contacted → in-progress → resolved`, with timestamps and mentor notes — this is what turns the tool from "a prediction" into "a workflow" |

**Data model for intervention tracking (SQLite/Postgres):**

```sql
CREATE TABLE interventions (
    id SERIAL PRIMARY KEY,
    student_id TEXT NOT NULL,
    risk_score FLOAT,
    risk_band TEXT,
    flagged_at TIMESTAMP,
    mentor_id TEXT,
    status TEXT CHECK (status IN ('flagged','contacted','in_progress','resolved')),
    notes TEXT,
    updated_at TIMESTAMP
);
```

---

## 10. Testing & CI

| Test type | What it checks |
|---|---|
| `test_data_validation.py` | Schema, null rates, class balance haven't silently drifted |
| `test_features.py` | Delta/ratio features compute correctly on known fixtures; no NaNs post-engineering |
| `test_model_contract.py` | Model input/output shape, that `predict_proba` returns values in [0,1], that a known "obviously at-risk" synthetic row scores high risk |
| `test_api.py` | FastAPI endpoint returns correct schema, handles malformed input gracefully (422, not 500) |

Wire these into GitHub Actions (`.github/workflows/ci.yaml`) to run on every PR: lint (ruff/flake8) → unit tests → a smoke-test training run on a tiny data sample.

---

## 11. Deployment & Ops

- **Containerize:** single `Dockerfile` for the API, separate service for the dashboard; orchestrate with `docker-compose` for local dev.
- **Model registry / versioning:** MLflow Model Registry (or a simple versioned S3/local path convention) — every promoted model tagged with its metrics.json, so you can roll back.
- **Monitoring:** log prediction distribution and feature drift weekly (e.g., with `evidently`) — if the incoming student population's feature distribution shifts significantly from training data, that's a retraining trigger.
- **Retraining cadence:** retrain each semester as new outcome labels (actual dropout/graduate) become available; compare new model vs. currently deployed model on the same held-out test set before promoting.

---

## 12. Metrics Summary Table (what you report at the end)

| Metric | Target | Reported on |
|---|---|---|
| Recall (dropout class) | ≥ 0.75 | Held-out test set |
| Precision (dropout class) | reported, not gated | Held-out test set |
| AUC-PR | reported | Held-out test set |
| Subgroup recall gap | flagged if any group < 0.65 | Held-out test set, per protected attribute |
| API p95 latency | < 300ms | Load test |

---

## 13. Suggested Tech Stack Recap

| Layer | Tool |
|---|---|
| Data versioning | DVC |
| Data validation | Pandera / Great Expectations |
| Experiment tracking | MLflow |
| Hyperparameter search | Optuna |
| Imbalance handling | imbalanced-learn (SMOTE) + XGBoost `scale_pos_weight` |
| Modeling | XGBoost / LightGBM |
| Explainability | SHAP |
| Fairness audit | Fairlearn (optional, for reweighing/adversarial debiasing) |
| Serving | FastAPI + Uvicorn |
| Dashboard | Streamlit or React |
| Storage (intervention log) | PostgreSQL / SQLite |
| Containerization | Docker + docker-compose |
| CI | GitHub Actions |
| Drift monitoring | Evidently |

This pipeline gives you a defensible story end-to-end: **reproducible data handling → engineered features that capture trajectory, not just snapshot → an imbalance-aware model tuned on the right metric → explainability that's actionable, not decorative → a documented fairness audit → a real workflow tool, not just a notebook.**
