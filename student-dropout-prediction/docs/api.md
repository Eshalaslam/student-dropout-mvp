# Backend API Documentation

The Student Dropout Prediction Backend API is powered by FastAPI.

## Endpoints

### 1. Predict Student Risk
- **Endpoint:** `POST /api/prediction/predict`
- **Request Body:** JSON payload representing student academic and demographic features.
- **Response:** Risk score (0.0 to 1.0), risk band (low, medium, high), and top SHAP reasons.

### 2. Get Students List
- **Endpoint:** `GET /api/students`
- **Response:** List of students with their flagged risk statuses.

### 3. Get Student Detail
- **Endpoint:** `GET /api/students/{student_id}`
- **Response:** Profile and full history of a student.

### 4. Get Dashboard Summary
- **Endpoint:** `GET /api/dashboard/summary`
- **Response:** Aggregate numbers for high, medium, and low risk students.
