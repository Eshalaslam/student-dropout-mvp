import { useState } from "react";
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

// App shell — plain state-based view switching (no router dependency added).
// Swap `mockStudents.js` for a real API call once the backend is ready;
// keep the same student object shape (see DATA_DICTIONARY.md).
export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [students, setStudents] = useState(DATA);
  const [view, setView] = useState("dashboard"); // "dashboard" | "list" | "details" | "interventions" | "reports" | "audit"
  const [returnView, setReturnView] = useState("dashboard"); // where "back" from details goes
  const [selectedId, setSelectedId] = useState(null);

  const selected = students.find((s) => s.student_id === selectedId);

  function handleSelect(id, from) {
    setSelectedId(id);
    setReturnView(from);
    setView("details");
  }
  function handleBack() {
    setView(returnView);
  }
  function handleNavigate(nextView) {
    setView(nextView);
  }
  function handleAddIntervention(id, intervention) {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === id ? { ...s, interventions: [...s.interventions, intervention] } : s))
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
  function handleLogin() {
    setAuthenticated(true);
    setView("dashboard");
  }
  function handleLogout() {
    setAuthenticated(false);
    setView("dashboard");
    setSelectedId(null);
  }

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Highlight the section the user is in — while viewing a student's details,
  // keep whichever nav item they came from (dashboard or list) active.
  const activeNav = view === "details" ? returnView : view;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Fixed left sidebar */}
      <Sidebar active={activeNav} onNavigate={handleNavigate} />

      {/* Main area — offset by sidebar width (w-56 = 224px) */}
      <div className="flex-1 flex flex-col min-h-screen ml-56">
        {/* Sticky top bar */}
        <TopBar view={view} onLogout={handleLogout} />

        {/* Scrollable page content */}
        <main className="flex-1 px-6 py-6 mt-14 overflow-y-auto">
          {view === "dashboard" && <Dashboard students={students} onSelect={(id) => handleSelect(id, "dashboard")} />}
          {view === "list" && <StudentList students={students} onSelect={(id) => handleSelect(id, "list")} />}
          {view === "interventions" && <MentorInterventionTracking students={INTERVENTION_DATA} />}
          {view === "reports" && <Reports students={INTERVENTION_DATA} />}
          {view === "audit" && <BiasPrivacyAudit />}
          {view === "details" && (
            <StudentDetails
              student={selected}
              onBack={handleBack}
              onAddIntervention={handleAddIntervention}
              onUpdateInterventionStatus={handleUpdateInterventionStatus}
            />
          )}
        </main>
      </div>
    </div>
  );
}
