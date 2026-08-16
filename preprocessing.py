# %% [markdown]
# # Student Dropout Prediction — Data Preprocessing
#
# Owner: Data Preprocessing (1 of 4 project components — Model Training,
# Backend, Frontend are separate).
#
# Source data: UCI ML Repository — "Predict Students' Dropout and Academic
# Success" (https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success),
# 4,424 records, 36 raw features, semicolon-delimited, 3-class target.
#
# Target handling: collapsed to binary — Dropout = 1, (Enrolled + Graduate) = 0,
# because the project optimizes for dropout recall rather than 3-class
# distinction.
#
# Methodological grounding: the qualification re-grouping and de-correlation
# approach follows Romero & Liao (2025, PLOS ONE), "Statistical and machine
# learning models for predicting university dropout and scholarship impact"
# (https://doi.org/10.1371/journal.pone.0325047), which uses this exact
# dataset. That paper (a) collapses the 44 raw qualification codes into a
# small number of ordered education-level groups because "quite a few levels
# are missing... the ordering of the levels seems unclear", (b) merges
# mother's + father's qualification into a single "parents' qualification"
# feature to reduce multicollinearity, and (c) drops one member of each
# highly-correlated 1st/2nd-semester academic feature pair (Pearson r > 0.8).
# We follow the same logic below, adapted to our own 5-tier scheme (see
# Section 3) and applied to both semesters via delta features (Section 5)
# rather than dropping semester 1 outright, since Model Training wants the
# trajectory signal. The paper reports XGBoost F1 = 0.907 and Random Forest
# AUC = 0.935 on this dataset as eventual benchmarks — for Model Training's
# reference, not relevant to this preprocessing step.
#
# Pipeline order (fixed — do not reorder, especially steps 8-9):
# 1. Load & inspect  2. EDA  3. Qualification re-grouping  4. Parents' qual
# merge  5. Feature engineering (deltas)  6. Statistical screening
# 7. Encoding  8. Scaling  9. Train/test split  10. Imbalance handling
# (SMOTE + class-weight variant, both post-split)  11. Save handoff artifacts

# %%
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import chi2_contingency, ttest_ind, mannwhitneyu, shapiro
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from imblearn.over_sampling import SMOTE

RANDOM_STATE = 42
sns.set_style("whitegrid")

# In Colab: upload data.csv via the Files pane, or mount Drive and point
# DATA_PATH at it. utf-8-sig strips the BOM the UCI export ships with.
DATA_PATH = "data.csv"

# %% [markdown]
# ## 1. Load & inspect

# %%
df = pd.read_csv(DATA_PATH, sep=";", encoding="utf-8-sig")
df.columns = [c.strip() for c in df.columns]  # strips stray "\t" in the
                                                # "Daytime/evening attendance" header

print("Shape:", df.shape)
print("\nDtypes:\n", df.dtypes)
print("\nNulls per column:\n", df.isnull().sum()[df.isnull().sum() > 0])
print("\nTarget distribution (raw 3-class):\n", df["Target"].value_counts())
print("\nDuplicate rows:", df.duplicated().sum())

# %%
# Binary target: Dropout = 1, {Enrolled, Graduate} = 0
df["target_binary"] = (df["Target"] == "Dropout").astype(int)
print(df["target_binary"].value_counts(normalize=True).rename("proportion"))

# %% [markdown]
# ## 2. EDA

# %%
# 2a. Class balance
fig, ax = plt.subplots(1, 2, figsize=(11, 4))
df["Target"].value_counts().plot(kind="bar", ax=ax[0], color="#4C72B0")
ax[0].set_title("Raw 3-class target")
df["target_binary"].value_counts().rename({0: "Not Dropout", 1: "Dropout"}).plot(
    kind="bar", ax=ax[1], color="#DD8452"
)
ax[1].set_title("Binary target")
plt.tight_layout()
plt.show()

# %%
# 2b. Correlation heatmap — sem1 vs sem2 academic features (known to be
# highly correlated per Romero & Liao 2025, Table 1)
sem_cols = [
    "Curricular units 1st sem (credited)", "Curricular units 1st sem (enrolled)",
    "Curricular units 1st sem (evaluations)", "Curricular units 1st sem (approved)",
    "Curricular units 1st sem (grade)", "Curricular units 1st sem (without evaluations)",
    "Curricular units 2nd sem (credited)", "Curricular units 2nd sem (enrolled)",
    "Curricular units 2nd sem (evaluations)", "Curricular units 2nd sem (approved)",
    "Curricular units 2nd sem (grade)", "Curricular units 2nd sem (without evaluations)",
]
plt.figure(figsize=(10, 8))
sns.heatmap(df[sem_cols].corr(), annot=True, fmt=".2f", cmap="coolwarm", center=0)
plt.title("Semester 1 vs Semester 2 academic feature correlation")
plt.tight_layout()
plt.show()

high_corr_pairs = []
corr_mat = df[sem_cols].corr()
for i in range(len(sem_cols)):
    for j in range(i + 1, len(sem_cols)):
        r = corr_mat.iloc[i, j]
        if abs(r) > 0.8:
            high_corr_pairs.append((sem_cols[i], sem_cols[j], round(r, 3)))
print("Pairs with |r| > 0.8:")
for p in high_corr_pairs:
    print(" ", p)

# %%
# 2c. Distribution of key continuous features by target class
key_continuous = [
    "Admission grade", "Age at enrollment",
    "Curricular units 2nd sem (grade)", "Curricular units 1st sem (grade)",
]
fig, axes = plt.subplots(2, 2, figsize=(12, 8))
for col, ax in zip(key_continuous, axes.ravel()):
    sns.kdeplot(data=df, x=col, hue="target_binary", ax=ax, common_norm=False)
    ax.set_title(col)
plt.tight_layout()
plt.show()

# %%
# 2d. Categorical cardinality check
categorical_candidates = [
    "Marital status", "Application mode", "Application order", "Course",
    "Daytime/evening attendance", "Previous qualification", "Nacionality",
    "Mother's qualification", "Father's qualification", "Mother's occupation",
    "Father's occupation", "Displaced", "Educational special needs", "Debtor",
    "Tuition fees up to date", "Gender", "Scholarship holder", "International",
]
cardinality = df[categorical_candidates].nunique().sort_values(ascending=False)
print("Cardinality per categorical field:\n", cardinality)

# %% [markdown]
# ## 3. Re-group qualification fields into 5 ordered tiers
#
# Codes below are the real UCI codebook values for "Previous qualification",
# "Mother's qualification", and "Father's qualification" (these three share
# one coding scheme; a few codes are specific to only one or two of the
# three columns, which is fine — the map just won't be hit for those).
# Source: UCI dataset variable table
# (https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success).
#
# Tiers (ordinal, low -> high): no_education < basic < secondary < higher_ed
# < postgrad. Code 34 ("Unknown") is mapped to NaN rather than guessed into a
# tier, following Romero & Liao's practice of dropping unclear levels rather
# than forcing them into an ordering that isn't supported by the codebook.

QUALIFICATION_CODEBOOK = {
    1: "Secondary Education - 12th Year of Schooling or Eq.",
    2: "Higher Education - Bachelor's Degree",
    3: "Higher Education - Degree",
    4: "Higher Education - Master's",
    5: "Higher Education - Doctorate",
    6: "Frequency of Higher Education",
    9: "12th Year of Schooling - Not Completed",
    10: "11th Year of Schooling - Not Completed",
    11: "7th Year (Old)",
    12: "Other - 11th Year of Schooling",
    13: "2nd year complementary high school course",
    14: "10th Year of Schooling",
    15: "10th year of schooling - not completed",
    18: "General commerce course",
    19: "Basic Education 3rd Cycle (9th/10th/11th Year) or Equiv.",
    20: "Complementary High School Course",
    22: "Technical-professional course",
    25: "Complementary High School Course - not concluded",
    26: "7th year of schooling",
    27: "2nd cycle of the general high school course",
    29: "9th Year of Schooling - Not Completed",
    30: "8th year of schooling",
    31: "General Course of Administration and Commerce",
    33: "Supplementary Accounting and Administration",
    34: "Unknown",
    35: "Can't read or write",
    36: "Can read without having a 4th year of schooling",
    37: "Basic education 1st cycle (4th/5th year) or equiv.",
    38: "Basic Education 2nd Cycle (6th/7th/8th Year) or Equiv.",
    39: "Technological specialization course",
    40: "Higher education - degree (1st cycle)",
    41: "Specialized higher studies course",
    42: "Professional higher technical course",
    43: "Higher Education - Master (2nd cycle)",
    44: "Higher Education - Doctorate (3rd cycle)",
}

TIER_ORDER = ["no_education", "basic", "secondary", "higher_ed", "postgrad"]
TIER_MAP = {t: i for i, t in enumerate(TIER_ORDER)}  # ordinal encoding, 0-4

CODE_TO_TIER = {
    # no_education
    35: "no_education", 36: "no_education",
    # basic (roughly ISCED 1-2, up to 9th year)
    37: "basic", 38: "basic", 19: "basic", 26: "basic", 27: "basic",
    29: "basic", 30: "basic", 11: "basic", 18: "basic",
    # secondary (12th-year / non-degree secondary equivalents)
    1: "secondary", 9: "secondary", 10: "secondary", 12: "secondary",
    13: "secondary", 14: "secondary", 15: "secondary", 20: "secondary",
    22: "secondary", 25: "secondary", 31: "secondary", 33: "secondary",
    # higher_ed (bachelor's / in-progress / short-cycle tertiary, non-postgrad)
    2: "higher_ed", 3: "higher_ed", 6: "higher_ed", 39: "higher_ed",
    40: "higher_ed", 41: "higher_ed", 42: "higher_ed",
    # postgrad (master's / doctorate)
    4: "postgrad", 5: "postgrad", 43: "postgrad", 44: "postgrad",
    # 34 "Unknown" intentionally NOT mapped -> becomes NaN
}

def regroup_qualification(series: pd.Series) -> pd.Series:
    """Map raw UCI qualification codes to one of 5 ordered tier labels.
    Code 34 (Unknown) and any code missing from CODE_TO_TIER becomes NaN."""
    unmapped = set(series.dropna().unique()) - set(CODE_TO_TIER.keys())
    unmapped_known = {c for c in unmapped if c in QUALIFICATION_CODEBOOK}
    if unmapped_known:
        print(f"  Note: codes mapped to NaN (e.g. Unknown={{34}}): {unmapped_known}")
    return series.map(CODE_TO_TIER)

for col in ["Previous qualification", "Mother's qualification", "Father's qualification"]:
    print(f"Re-grouping: {col}")
    tier_col = regroup_qualification(df[col])
    df[col + "_tier"] = tier_col
    df[col + "_tier_ord"] = tier_col.map(TIER_MAP)  # ordinal 0-4, NaN stays NaN

# Any row where the tier came out NaN (code 34, "Unknown") gets imputed with
# the tier mode of that column — documented in feature_dictionary.md.
for col in ["Previous qualification", "Mother's qualification", "Father's qualification"]:
    ord_col = col + "_tier_ord"
    n_missing = df[ord_col].isna().sum()
    if n_missing:
        mode_val = df[ord_col].mode()[0]
        print(f"  Imputing {n_missing} 'Unknown' values in {ord_col} with mode ({TIER_ORDER[int(mode_val)]})")
        df[ord_col] = df[ord_col].fillna(mode_val)

# %% [markdown]
# ## 4. Merge mother's + father's qualification into one ordinal feature
#
# Per Romero & Liao 2025: mother's and father's qualification are highly
# correlated and largely redundant; they combine them into one "parents'
# qualification" feature. We take the max of the two ordinal tiers (higher
# tier = more educated parent), since the tiers are ordinal.

# %%
df["Parents_qual_tier_ord"] = df[
    ["Mother's qualification_tier_ord", "Father's qualification_tier_ord"]
].max(axis=1)
df["Parents_qual_tier"] = df["Parents_qual_tier_ord"].map(
    {v: k for k, v in TIER_MAP.items()}
)
print(df["Parents_qual_tier"].value_counts())

corr_before = df[["Mother's qualification_tier_ord", "Father's qualification_tier_ord"]].corr().iloc[0, 1]
print(f"\nMother/Father qualification tier correlation (justifies merge): {corr_before:.3f}")

# %% [markdown]
# ## 5. Feature engineering — trajectory / delta features
#
# Divide-by-zero handling: approval_rate = approved / enrolled. If enrolled
# == 0 (student registered for zero units that semester), the rate is
# undefined rather than 0 — set to NaN, then flag with a companion
# "no_units_enrolled" indicator and impute the rate to 0 (a student with no
# enrolled units trivially "approved" none of them, which is meaningfully
# different from a student who enrolled and failed everything, hence the
# indicator column preserves that distinction for the model).

# %%
df["grade_change"] = (
    df["Curricular units 2nd sem (grade)"] - df["Curricular units 1st sem (grade)"]
)

def safe_approval_rate(approved: pd.Series, enrolled: pd.Series) -> pd.Series:
    rate = approved / enrolled.replace(0, np.nan)
    return rate

df["approval_rate_sem1"] = safe_approval_rate(
    df["Curricular units 1st sem (approved)"], df["Curricular units 1st sem (enrolled)"]
)
df["approval_rate_sem2"] = safe_approval_rate(
    df["Curricular units 2nd sem (approved)"], df["Curricular units 2nd sem (enrolled)"]
)

df["sem1_zero_enrolled"] = (df["Curricular units 1st sem (enrolled)"] == 0).astype(int)
df["sem2_zero_enrolled"] = (df["Curricular units 2nd sem (enrolled)"] == 0).astype(int)

df["approval_rate_sem1"] = df["approval_rate_sem1"].fillna(0)
df["approval_rate_sem2"] = df["approval_rate_sem2"].fillna(0)

df["approval_rate_change"] = df["approval_rate_sem2"] - df["approval_rate_sem1"]

print(df[[
    "grade_change", "approval_rate_sem1", "approval_rate_sem2",
    "approval_rate_change", "sem1_zero_enrolled", "sem2_zero_enrolled"
]].describe())
print("\nRows with sem1 zero-enrolled:", df["sem1_zero_enrolled"].sum())
print("Rows with sem2 zero-enrolled:", df["sem2_zero_enrolled"].sum())

# %% [markdown]
# ## 6. Statistical feature screening
#
# Chi-squared test for categorical features vs target; t-test (Mann-Whitney U
# fallback if a feature fails a Shapiro normality check) for continuous
# features vs target; Bonferroni correction across all tests run. Features
# with strong prior literature support (e.g. debtor status — Romero & Liao
# 2025 report debtor status raises dropout odds ~6x) are flagged for manual
# review rather than auto-dropped even if borderline after correction.

# %%
LITERATURE_PROTECTED = {"Debtor", "Tuition fees up to date", "Scholarship holder"}

categorical_features = [
    "Marital status", "Application mode", "Application order", "Course",
    "Daytime/evening attendance", "Nacionality", "Mother's occupation",
    "Father's occupation", "Displaced", "Educational special needs", "Debtor",
    "Tuition fees up to date", "Gender", "Scholarship holder", "International",
]
continuous_features = [
    "Previous qualification (grade)", "Admission grade", "Age at enrollment",
    "Curricular units 1st sem (credited)", "Curricular units 1st sem (enrolled)",
    "Curricular units 1st sem (evaluations)", "Curricular units 1st sem (approved)",
    "Curricular units 1st sem (grade)", "Curricular units 1st sem (without evaluations)",
    "Curricular units 2nd sem (credited)", "Curricular units 2nd sem (enrolled)",
    "Curricular units 2nd sem (evaluations)", "Curricular units 2nd sem (approved)",
    "Curricular units 2nd sem (grade)", "Curricular units 2nd sem (without evaluations)",
    "Unemployment rate", "Inflation rate", "GDP",
    "grade_change", "approval_rate_sem1", "approval_rate_sem2", "approval_rate_change",
]

n_tests = len(categorical_features) + len(continuous_features)
bonferroni_alpha = 0.05 / n_tests
print(f"Bonferroni-corrected alpha ({n_tests} tests): {bonferroni_alpha:.6f}")

results = []

for col in categorical_features:
    contingency = pd.crosstab(df[col], df["target_binary"])
    chi2, p, dof, _ = chi2_contingency(contingency)
    results.append({"feature": col, "test": "chi2", "statistic": chi2, "p_value": p})

for col in continuous_features:
    group0 = df.loc[df["target_binary"] == 0, col].dropna()
    group1 = df.loc[df["target_binary"] == 1, col].dropna()
    # Normality check (subsample for Shapiro since it's sensitive to n > ~5000)
    _, p_norm0 = shapiro(group0.sample(min(len(group0), 500), random_state=RANDOM_STATE))
    _, p_norm1 = shapiro(group1.sample(min(len(group1), 500), random_state=RANDOM_STATE))
    if p_norm0 > 0.05 and p_norm1 > 0.05:
        stat, p = ttest_ind(group0, group1, equal_var=False)
        test_used = "t-test"
    else:
        stat, p = mannwhitneyu(group0, group1, alternative="two-sided")
        test_used = "mann-whitney"
    results.append({"feature": col, "test": test_used, "statistic": stat, "p_value": p})

screening_df = pd.DataFrame(results).sort_values("p_value")
screening_df["significant_bonferroni"] = screening_df["p_value"] < bonferroni_alpha
screening_df["literature_protected"] = screening_df["feature"].isin(LITERATURE_PROTECTED)
screening_df["action"] = np.where(
    screening_df["significant_bonferroni"], "keep",
    np.where(screening_df["literature_protected"], "flag_for_manual_review", "candidate_drop")
)

print(screening_df.to_string(index=False))

candidate_drops = screening_df.loc[screening_df["action"] == "candidate_drop", "feature"].tolist()
flagged = screening_df.loc[screening_df["action"] == "flag_for_manual_review", "feature"].tolist()
print("\nCandidate drops (not significant, no literature protection):", candidate_drops)
print("Flagged for manual review (not significant but literature-supported):", flagged)

# NOTE: we do not auto-drop here. Model Training gets the full screening
# table in feature_dictionary.md and decides together with the team whether
# to drop `candidate_drops`. `flagged` features are kept in the dataset with
# a note.

# %% [markdown]
# ## 7. Encoding
#
# One-hot encode nominal categoricals (drop first level to avoid the dummy
# trap). Qualification tiers stay ordinal-encoded (already done in Section
# 3/4 as *_tier_ord columns, 0-4) since their order is meaningful.

# %%
nominal_categoricals = [
    "Marital status", "Application mode", "Application order", "Course",
    "Daytime/evening attendance", "Nacionality", "Mother's occupation",
    "Father's occupation", "Displaced", "Educational special needs", "Debtor",
    "Tuition fees up to date", "Gender", "Scholarship holder", "International",
]

ordinal_already_encoded = [
    "Previous qualification_tier_ord",
    "Parents_qual_tier_ord",
]

continuous_to_scale = [
    "Previous qualification (grade)", "Admission grade", "Age at enrollment",
    "Curricular units 1st sem (credited)", "Curricular units 1st sem (enrolled)",
    "Curricular units 1st sem (evaluations)", "Curricular units 1st sem (approved)",
    "Curricular units 1st sem (grade)", "Curricular units 1st sem (without evaluations)",
    "Curricular units 2nd sem (credited)", "Curricular units 2nd sem (enrolled)",
    "Curricular units 2nd sem (evaluations)", "Curricular units 2nd sem (approved)",
    "Curricular units 2nd sem (grade)", "Curricular units 2nd sem (without evaluations)",
    "Unemployment rate", "Inflation rate", "GDP",
    "grade_change", "approval_rate_sem1", "approval_rate_sem2", "approval_rate_change",
]

passthrough_binary = ["sem1_zero_enrolled", "sem2_zero_enrolled"]

model_df = df[
    nominal_categoricals + ordinal_already_encoded + continuous_to_scale
    + passthrough_binary + ["target_binary"]
].copy()

ohe = OneHotEncoder(drop="first", sparse_output=False, handle_unknown="ignore")
ohe_array = ohe.fit_transform(model_df[nominal_categoricals])
ohe_cols = ohe.get_feature_names_out(nominal_categoricals)
ohe_df = pd.DataFrame(ohe_array, columns=ohe_cols, index=model_df.index)

encoded_df = pd.concat(
    [model_df[ordinal_already_encoded + continuous_to_scale + passthrough_binary], ohe_df],
    axis=1,
)
# Cast to float64 up front so later in-place scaling doesn't hit an int64
# dtype (pandas raises LossySetitemError assigning floats into an int column).
encoded_df[continuous_to_scale] = encoded_df[continuous_to_scale].astype("float64")
y = model_df["target_binary"]

print("Encoded feature matrix shape:", encoded_df.shape)

# %% [markdown]
# ## 8. Scale continuous features (StandardScaler)
#
# Fit only on the training split (Section 9) to avoid leakage — the scaler
# object is created here but `fit` happens after the split below. Ordinal
# and one-hot columns are left unscaled (standard practice; scaling one-hot
# dummies distorts their 0/1 interpretation, and scaling small-range
# ordinals adds no value for tree models and only mild value for linear
# ones — Model Training can rescale ordinals downstream if needed for
# Lasso/Logistic Regression specifically).

# %% [markdown]
# ## 9. Train/test split — BEFORE any imbalance handling
#
# 80/20, stratified on target, random_state=42. This must happen before
# SMOTE: fitting SMOTE on the full dataset and splitting afterward would let
# synthetic training points be interpolated from real test-set neighbors,
# leaking test information into training.

# %%
X_train, X_test, y_train, y_test = train_test_split(
    encoded_df, y, test_size=0.20, stratify=y, random_state=RANDOM_STATE
)
print("X_train:", X_train.shape, " X_test:", X_test.shape)
print("Train target balance:\n", y_train.value_counts(normalize=True))
print("Test target balance:\n", y_test.value_counts(normalize=True))

# %%
# Now fit the scaler on TRAIN ONLY, apply to both.
scaler = StandardScaler()
X_train.loc[:, continuous_to_scale] = scaler.fit_transform(X_train[continuous_to_scale])
X_test.loc[:, continuous_to_scale] = scaler.transform(X_test[continuous_to_scale])

# %% [markdown]
# ## 10. Imbalance handling — two parallel training sets, test set untouched
#
# (a) SMOTE-resampled training set — for models that benefit from balanced
#     classes at training time.
# (b) Original (unresampled) training set — to be used with
#     `class_weight='balanced'` downstream in Model Training.
# Both are produced from the SAME split; the test set is never touched by
# either.

# %%
smote = SMOTE(random_state=RANDOM_STATE)
X_train_smote, y_train_smote = smote.fit_resample(X_train, y_train)

print("Original train balance:\n", y_train.value_counts())
print("\nSMOTE train balance:\n", y_train_smote.value_counts())

# %% [markdown]
# ## 11. Save handoff artifacts

# %%
import os
OUT_DIR = "preprocessed_output"
os.makedirs(OUT_DIR, exist_ok=True)

X_train.to_parquet(f"{OUT_DIR}/X_train.parquet", index=False)
X_train_smote.to_parquet(f"{OUT_DIR}/X_train_smote.parquet", index=False)
X_test.to_parquet(f"{OUT_DIR}/X_test.parquet", index=False)

y_train.to_csv(f"{OUT_DIR}/y_train.csv", index=False)
y_train_smote.to_csv(f"{OUT_DIR}/y_train_smote.csv", index=False)
y_test.to_csv(f"{OUT_DIR}/y_test.csv", index=False)

print("Saved:")
for f in sorted(os.listdir(OUT_DIR)):
    print(" ", f)

# %%
# feature_dictionary.md — every final feature, its meaning, and any
# transformation applied.
feature_dict_lines = ["# Feature Dictionary — Student Dropout Prediction\n"]
feature_dict_lines.append(
    "Target: `target_binary` — 1 = Dropout, 0 = Enrolled or Graduate "
    "(collapsed from the original 3-class `Target`).\n"
)

feature_dict_lines.append("## Ordinal (qualification tiers, 0-4)\n")
feature_dict_lines.append(
    "- `Previous qualification_tier_ord`: student's own prior qualification, "
    "re-grouped from the raw UCI code (1-44) into one of 5 ordered tiers "
    "(no_education=0, basic=1, secondary=2, higher_ed=3, postgrad=4). "
    "Code 34 ('Unknown') imputed with the column mode.\n"
)
feature_dict_lines.append(
    "- `Parents_qual_tier_ord`: max(Mother's qualification tier, Father's "
    "qualification tier), same 5-tier ordinal scale. Created to reduce "
    "mother/father qualification multicollinearity "
    f"(pairwise tier correlation = {corr_before:.3f}), per Romero & Liao (2025).\n"
)

feature_dict_lines.append("\n## Engineered trajectory features\n")
feature_dict_lines.append("- `grade_change`: 2nd-sem grade minus 1st-sem grade.\n")
feature_dict_lines.append(
    "- `approval_rate_sem1` / `approval_rate_sem2`: units approved / units "
    "enrolled per semester. 0/0 case (zero units enrolled) set to 0 and "
    "flagged separately (see below), rather than left as NaN or forced to 1.\n"
)
feature_dict_lines.append(
    "- `approval_rate_change`: approval_rate_sem2 - approval_rate_sem1.\n"
)
feature_dict_lines.append(
    "- `sem1_zero_enrolled` / `sem2_zero_enrolled`: 1 if the student had 0 "
    "enrolled units that semester (approval rate is not meaningfully 0 in "
    "this case — this flag lets the model distinguish it from a student who "
    "enrolled and failed everything).\n"
)

feature_dict_lines.append("\n## Scaled continuous features (StandardScaler, fit on train only)\n")
for c in continuous_to_scale:
    feature_dict_lines.append(f"- `{c}`\n")

feature_dict_lines.append("\n## One-hot encoded nominal categoricals (first level dropped)\n")
feature_dict_lines.append(
    "Source columns: " + ", ".join(f"`{c}`" for c in nominal_categoricals) + ".\n"
)
feature_dict_lines.append(
    "Resulting dummy columns are named `<source>_<level>`; see the raw UCI "
    "codebook for level meanings (e.g. Course codes, Application mode codes).\n"
)

feature_dict_lines.append("\n## Statistical screening results (Section 6)\n")
feature_dict_lines.append(
    f"Bonferroni-corrected alpha across {n_tests} tests: {bonferroni_alpha:.6f}.\n\n"
)
feature_dict_lines.append(screening_df.to_markdown(index=False))
feature_dict_lines.append("\n\n")
feature_dict_lines.append(
    "`candidate_drop` features were NOT auto-removed from the exported "
    "dataset — flagged here for Model Training to decide on. "
    f"`flag_for_manual_review` features ({', '.join(flagged) if flagged else 'none'}) "
    "are literature-protected (e.g. debtor status has strong prior evidence "
    "of predictive value per Romero & Liao 2025) and are kept regardless of "
    "the raw test outcome.\n"
)

feature_dict_lines.append("\n## Train/test split & imbalance handling\n")
feature_dict_lines.append(
    "80/20 stratified split, random_state=42, performed BEFORE any resampling. "
    "Two parallel training sets are exported:\n"
    "- `X_train.parquet` / `y_train.csv`: original, unresampled — use with "
    "`class_weight='balanced'`.\n"
    "- `X_train_smote.parquet` / `y_train_smote.csv`: SMOTE-resampled "
    "(random_state=42). \n"
    "- `X_test.parquet` / `y_test.csv`: held out untouched by both resampling "
    "approaches.\n"
)

with open(f"{OUT_DIR}/feature_dictionary.md", "w") as f:
    f.writelines(feature_dict_lines)

print(f"Wrote {OUT_DIR}/feature_dictionary.md")