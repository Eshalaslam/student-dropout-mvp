import { useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider, useData } from "./context/DataContext";
import { useAuth } from "./context/AuthContext";
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

import { getScopedStudents } from "./utils/useRbac";

function AppRoutes() {
  const { currentUser } = useAuth();
  const {
    students,
    handleAssignMentor,
    handleAddIntervention,
    handleUpdateInterventionStatus,
  } = useData();

  // Scoped student cohort based on role and mentor assignment
  const scopedStudents = useMemo(
    () => getScopedStudents(currentUser?.role, currentUser?.mentorName, students),
    [currentUser, students]
  );

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
        <Route
          path="/students"
          element={<StudentList students={scopedStudents} onAssignMentor={handleAssignMentor} />}
        />
        <Route
          path="/students/:studentId"
          element={
            <StudentDetails
              students={students}
              onAddIntervention={handleAddIntervention}
              onUpdateInterventionStatus={handleUpdateInterventionStatus}
              onAssignMentor={handleAssignMentor}
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
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
