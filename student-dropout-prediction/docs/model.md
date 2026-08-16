# Machine Learning Model Documentation

This document describes the ML pipeline and models used for dropout early warning.

## Pipeline Architecture
1. **Preprocessing:** Handles missing values and basic scaling.
2. **Feature Engineering:** Computes semester-over-semester differences and academic success ratios.
3. **Model:** Gradient Boosted Classifier (e.g., XGBoost, LightGBM) optimized for high Recall.
4. **Explainability:** SHAP values generated to highlight the features driving each prediction.
