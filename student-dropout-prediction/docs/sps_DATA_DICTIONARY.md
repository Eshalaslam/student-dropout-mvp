# Data Dictionary — Student Dropout Prediction System

Only fields the frontend actually needs. Not a full column list of the UCI dataset.

---

## UCI Dataset Fields (real, from source data)

| Field | Source | Type | Frontend Usage |
|---|---|---|---|
| admission_grade | UCI | number | Shown in Student Details → Overview |
| age_at_enrollment | UCI | number | Optional profile detail |
| scholarship_holder | UCI | boolean | Optional profile detail |
| tuition_fees_up_to_date | UCI | boolean | Can inform risk factor text |
| curricular_units_1st_sem_enrolled | UCI | number | Academic summary |
| curricular_units_1st_sem_approved | UCI | number | Academic summary |
| curricular_units_1st_sem_grade | UCI | number | Academic summary |
| curricular_units_2nd_sem_enrolled | UCI | number | Academic summary |
| curricular_units_2nd_sem_approved | UCI | number | Academic summary |
| curricular_units_2nd_sem_grade | UCI | number | Academic summary |
| target (Dropout / Enrolled / Graduate) | UCI | string | Used to train/validate model only — not shown directly in UI as a "label"; UI shows predicted probability instead |

## Derived Fields (calculated from UCI data or model output)

| Field | Source | Type | Frontend Usage |
|---|---|---|---|
| curricular_units_failed | derived (enrolled − approved) | number | Student Details → Overview, backlogs count |
| approval_rate | derived (approved / enrolled) | number (%) | Optional chart / risk factor input |
| dropout_probability | model output | number (%) | Displayed as "Predicted risk: X%" — always labeled as an estimate |
| risk_category | derived (thresholded probability) | enum: Low / Medium / High | Risk badge everywhere |
| risk_factors | derived (SHAP → translated) | array of `{ factor, tier, direction }` | "Why is this student at risk?" tab |

`tier`: `"major"` \| `"moderate"`. `direction`: `"risk"` \| `"protective"`.

## Simulated Demo Fields (not in UCI — mocked for the hackathon UI)

| Field | Source | Type | Frontend Usage |
|---|---|---|---|
| student_name | simulated | string | Display name (UCI data is anonymized/numeric) |
| student_id | simulated | string | Display ID / routing key |
| department | simulated | string | Filter, profile, dashboard chart — mark as simulated if not truly derivable from UCI's "course" field |
| attendance_percentage | simulated | number (%) | Student Details → Overview; UI must label as simulated |
| mentor_name | app data | string | Intervention entries |
| interventions | app data | array of `{ type, date, notes, status }` | Interventions tab |

---

**Rule for frontend:** any field marked *simulated* or *app data* above should carry a visible "simulated" indicator wherever it appears in the UI, so no one mistakes it for real institutional data.