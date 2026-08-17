import { useState, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentList from "./pages/StudentList";
import StudentDetails from "./pages/StudentDetails";
import MentorInterventionTracking from "./pages/MentorInterventionTracking";
import BiasPrivacyAudit from "./pages/BiasPrivacyAudit";
import Reports from "./pages/Reports";
import DATA from "./data/mockStudents";
import { INTERVENTION_DATA } from "./data/mockInterventions";
import { getScopedStudents, canAccess } from "./utils/useRbac";

// App shell — state-based view switching, no router dependency.
// currentUser drives all RBAC; swap mockAuth.js for a real API call once ready.
export default function App() {
  const [currentUser, setCurrentUser]   = useState(null);       // null = logged out
  const [students, setStudents]         = useState(DATA);
  const [view, setView]                 = useState("dashboard"); // "dashboard"|"list"|"details"|"interventions"|"reports"|"audit"
  const [returnView, setReturnView]     = useState("dashboard");
  const [selectedId, setSelectedId]     = useState(null);

  const selected = students.find((s) => s.student_id === selectedId);

  // ── Scoped data ───────────────────────────────────────────────────────────
  // All pages receive scopedStudents instead of the raw array.
  // Admin → full list; Mentor → only their assigned students.
  const scopedStudents = useMemo(
    () => getScopedStudents(currentUser?.role, currentUser?.mentorName, students),
    [currentUser, students]
  );

  // Same thing for the intervention-enriched array used by Interventions, Reports.
  const scopedInterventions = useMemo(
    () => getScopedStudents(currentUser?.role, currentUser?.mentorName, INTERVENTION_DATA),
    [currentUser]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSelect(id, from) { setSelectedId(id); setReturnView(from); setView("details"); }
  function handleBack() { setView(returnView); }

  function handleNavigate(nextView) {
    // Route guard — silently redirect unauthorized navigation attempts
    if (!canAccess(currentUser?.role, nextView)) {
      setView("dashboard");
      return;
    }
    setView(nextView);
  }

  function handleAddIntervention(id, intervention) {
    setStudents((prev) =>
      prev.map((s) => s.student_id === id ? { ...s, interventions: [...s.interventions, intervention] } : s)
    );
  }
  function handleUpdateInterventionStatus(id, index, status) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === id
          ? { ...s, interventions: s.interventions.map((iv, i) => (i === index ? { ...iv, status } : iv)) }
          : s
      )
    );
  }

  function handleLogin(user) { setCurrentUser(user); setView("dashboard"); }
  function handleLogout() { setCurrentUser(null); setView("dashboard"); setSelectedId(null); }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!currentUser) return <Login onLogin={handleLogin} />;

  // Hard route guard — if somehow the user lands on a blocked page, show access denied
  const blocked = !canAccess(currentUser.role, view);

  const activeNav = view === "details" ? returnView : view;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar active={activeNav} onNavigate={handleNavigate} currentUser={currentUser} />

      <div className="flex-1 flex flex-col min-h-screen ml-56">
        <TopBar view={view} onLogout={handleLogout} currentUser={currentUser} />

        <main className="flex-1 px-6 py-6 mt-14 overflow-y-auto">
          {blocked ? (
            /* Access denied fallback */
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">Access Restricted</h2>
              <p className="text-sm text-slate-500 mb-4 max-w-xs">
                Your role ({currentUser.role}) does not have permission to view this page.
              </p>
              <button onClick={() => setView("dashboard")}
                className="text-sm bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-800 transition-colors">
                Go to Dashboard
              </button>
            </div>
          ) : (
            <>
              {view === "dashboard" && (
                <Dashboard
                  students={scopedStudents}
                  onSelect={(id) => handleSelect(id, "dashboard")}
                />
              )}
              {view === "list" && (
                <StudentList
                  students={scopedStudents}
                  onSelect={(id) => handleSelect(id, "list")}
                />
              )}
              {view === "interventions" && (
                <MentorInterventionTracking
                  students={scopedInterventions}
                  currentUser={currentUser}
                />
              )}
              {view === "reports" && (
                <Reports
                  students={scopedInterventions}
                  currentUser={currentUser}
                />
              )}
              {view === "audit" && <BiasPrivacyAudit />}
              {view === "details" && (
                !selected || (currentUser.role === "Mentor" && !scopedStudents.some((s) => s.student_id === selected.student_id)) ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
                      <span className="text-2xl">🔒</span>
                    </div>
                    <h2 className="text-base font-semibold text-slate-800 mb-1">Student Profile Restricted</h2>
                    <p className="text-sm text-slate-500 mb-4 max-w-xs">
                      You are only authorized to view and manage students assigned to your mentorship.
                    </p>
                    <button onClick={handleBack}
                      className="text-sm bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-800 transition-colors">
                      Go Back
                    </button>
                  </div>
                ) : (
                  <StudentDetails
                    student={selected}
                    onBack={handleBack}
                    onAddIntervention={handleAddIntervention}
                    onUpdateInterventionStatus={handleUpdateInterventionStatus}
                    currentUser={currentUser}
                  />
                )
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
