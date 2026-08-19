import { useState, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PublicRoute from "./components/PublicRoute";
import PrivateRoute from "./components/PrivateRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentList from "./pages/StudentList";
import StudentDetails from "./pages/StudentDetails";
import MentorInterventionTracking from "./pages/MentorInterventionTracking";
import Reports from "./pages/Reports";
import BiasPrivacyAudit from "./pages/BiasPrivacyAudit";
import ManageMentors from "./pages/ManageMentors";

import DATA from "./data/mockStudents";
import { getScopedStudents } from "./utils/useRbac";
import api from "./services/api";

function AppRoutes() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState(DATA);

  // Fetch live student data when logged in
  useEffect(() => {
    if (currentUser) {
      api.getStudents()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setStudents(data);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Scoped student cohort based on role and mentor assignment
  const scopedStudents = useMemo(
    () => getScopedStudents(currentUser?.role, currentUser?.mentorName, students),
    [currentUser, students]
  );

  function handleAddIntervention(id, intervention) {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === id ? { ...s, interventions: [...(s.interventions || []), intervention] } : s))
    );
    api.addStudentIntervention(id, intervention).catch(() => {});
  }

  function handleUpdateInterventionStatus(id, index, status) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === id
          ? { ...s, interventions: (s.interventions || []).map((iv, i) => (i === index ? { ...iv, status } : iv)) }
          : s
      )
    );
    api.updateInterventionStatus(id, status).catch(() => {});
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes inside App Shell Layout */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard students={scopedStudents} />} />
        <Route path="/students" element={<StudentList students={scopedStudents} />} />
        <Route
          path="/students/:studentId"
          element={
            <StudentDetails
              students={students}
              onAddIntervention={handleAddIntervention}
              onUpdateInterventionStatus={handleUpdateInterventionStatus}
            />
          }
        />
        <Route
          path="/interventions"
          element={<MentorInterventionTracking />}
        />
        <Route path="/reports" element={<Reports students={scopedStudents} />} />
        <Route
          path="/mentors"
          element={
            <PrivateRoute allowedRoles={["Admin"]}>
              <ManageMentors students={students} />
            </PrivateRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <PrivateRoute allowedRoles={["Admin"]}>
              <BiasPrivacyAudit />
            </PrivateRoute>
          }
        />
      </Route>

      {/* Redirects & Catch-all */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
