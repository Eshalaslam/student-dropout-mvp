/**
 * DataContext — Single source of truth for shared, session-scoped data.
 *
 * Fetches the following ONCE per login session and shares via context:
 *  - mentors list  (GET /api/mentors/)
 *  - students list (GET /api/students/)
 *  - interventions (GET /api/interventions/)
 *
 * All components that previously fetched these independently now read from
 * this context, eliminating the N×M fetch storm that exhausted the DB pool.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";
import DATA from "../data/mockStudents";
import { USERS } from "../data/mockAuth";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser } = useAuth();

  // ── Mentors ─────────────────────────────────────────────────────────────────
  const [mentors, setMentors] = useState(() =>
    USERS.filter((u) => u.role === "Mentor")
  );
  const [mentorsLoading, setMentorsLoading] = useState(false);

  // ── Students ─────────────────────────────────────────────────────────────────
  const [students, setStudents] = useState(DATA);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // ── Interventions ────────────────────────────────────────────────────────────
  const [interventions, setInterventions] = useState([]);
  const [interventionsLoading, setInterventionsLoading] = useState(false);
  const [interventionsError, setInterventionsError] = useState("");

  // ── Fetch all shared data once when user logs in ─────────────────────────────
  const fetchMentors = useCallback(async () => {
    setMentorsLoading(true);
    try {
      const data = await api.getMentors();
      if (Array.isArray(data) && data.length > 0) {
        setMentors(data);
      }
    } catch {
      // fall back to mock data already in state
    } finally {
      setMentorsLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const data = await api.getStudents();
      if (Array.isArray(data) && data.length > 0) {
        setStudents(data);
      }
    } catch {
      // fall back to mock data already in state
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const fetchInterventions = useCallback(async () => {
    setInterventionsLoading(true);
    setInterventionsError("");
    try {
      const data = await api.getInterventions();
      if (Array.isArray(data)) {
        setInterventions(data);
      }
    } catch (err) {
      setInterventionsError(
        err?.status === 401
          ? "Session expired. Please log out and log back in."
          : `Failed to load interventions: ${err?.message || "Unknown error"}`
      );
    } finally {
      setInterventionsLoading(false);
    }
  }, []);

  // Only fetch when user is authenticated
  useEffect(() => {
    if (!currentUser) return;
    fetchMentors();
    fetchStudents();
    fetchInterventions();
  }, [currentUser, fetchMentors, fetchStudents, fetchInterventions]);

  // ── Mutation helpers (update local state + call API) ────────────────────────

  function updateStudentLocally(studentId, updates) {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, ...updates } : s))
    );
  }

  function handleAssignMentor(studentId, newMentorId, newMentorName) {
    updateStudentLocally(studentId, {
      assigned_mentor: newMentorName || newMentorId,
      assigned_mentor_id: newMentorId,
      assignedMentorId: newMentorId,
      assignedMentor: newMentorName || newMentorId,
    });
    if (newMentorId) {
      api.reassignMentor(studentId, newMentorId).catch(() => {});
    }
  }

  function handleAddIntervention(studentId, intervention) {
    updateStudentLocally(studentId, {
      interventions: [
        ...(students.find((s) => s.student_id === studentId)?.interventions || []),
        intervention,
      ],
    });
    api.addStudentIntervention(studentId, intervention).catch(() => {});
  }

  function handleUpdateInterventionStatus(studentId, index, status) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? {
              ...s,
              interventions: (s.interventions || []).map((iv, i) =>
                i === index ? { ...iv, status } : iv
              ),
            }
          : s
      )
    );
    api.updateInterventionStatus(studentId, status).catch(() => {});
  }

  function handleAddStudent(newStudent) {
    setStudents((prev) => {
      // Avoid duplicates if backend already returned it via a refetch
      if (prev.some((s) => s.student_id === newStudent.student_id)) return prev;
      return [newStudent, ...prev];
    });
    api.addStudent(newStudent).catch(() => {});
  }

  // Refresh functions for pages that need manual re-fetch (e.g., after CRUD)
  const refreshMentors = fetchMentors;
  const refreshInterventions = fetchInterventions;
  const refreshStudents = fetchStudents;

  // Active mentors (for dropdowns)
  const activeMentors = mentors.filter((m) => m.status !== "Inactive");

  return (
    <DataContext.Provider
      value={{
        // Mentors
        mentors,
        activeMentors,
        mentorsLoading,
        refreshMentors,

        // Students
        students,
        studentsLoading,
        refreshStudents,

        // Interventions
        interventions,
        interventionsLoading,
        interventionsError,
        refreshInterventions,

        // Mutation helpers
        handleAddStudent,
        handleAssignMentor,
        handleAddIntervention,
        handleUpdateInterventionStatus,
        updateStudentLocally,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
