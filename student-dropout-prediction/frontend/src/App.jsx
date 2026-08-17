import { useState } from "react";
import NavBar from "./components/NavBar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentList from "./pages/StudentList";
import StudentDetails from "./pages/StudentDetails";
import DATA from "./data/mockStudents";

// App shell — plain state-based view switching (no router dependency added).
// Swap `mockStudents.js` for a real API call once the backend is ready;
// keep the same student object shape (see DATA_DICTIONARY.md).
export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [students, setStudents] = useState(DATA);
  const [view, setView] = useState("dashboard"); // "dashboard" | "list" | "details"
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
    <div className="min-h-screen bg-slate-50">
      <NavBar active={activeNav} onNavigate={handleNavigate} onLogout={handleLogout} />
      <main className="max-w-6xl mx-auto px-6 py-6">
        {view === "dashboard" && <Dashboard students={students} onSelect={(id) => handleSelect(id, "dashboard")} />}
        {view === "list" && <StudentList students={students} onSelect={(id) => handleSelect(id, "list")} />}
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
  );
}
