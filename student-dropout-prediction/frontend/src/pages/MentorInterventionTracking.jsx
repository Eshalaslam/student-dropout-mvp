import { useState, useMemo } from "react";
import {
  Search,
  LayoutGrid,
  Table2,
  X,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  User,
} from "lucide-react";
import RiskBadge from "../components/RiskBadge";
import KpiCard from "../components/KpiCard";

// ─── constants ──────────────────────────────────────────────────────────────

const STATUSES = ["Not Started", "In Progress", "Resolved", "Escalated"];

const STATUS_STYLES = {
  "Not Started":  { badge: "bg-slate-100 text-slate-600 border-slate-200",   column: "border-t-slate-400",   dot: "bg-slate-400"  },
  "In Progress":  { badge: "bg-sky-50 text-sky-700 border-sky-200",           column: "border-t-sky-500",     dot: "bg-sky-500"    },
  "Resolved":     { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", column: "border-t-emerald-500", dot: "bg-emerald-500" },
  "Escalated":    { badge: "bg-rose-50 text-rose-700 border-rose-200",         column: "border-t-rose-500",    dot: "bg-rose-500"   },
};

const KPI_ACCENTS = {
  Total:        "text-slate-900",
  "Not Started": "text-slate-500",
  "In Progress": "text-sky-700",
  Resolved:     "text-emerald-600",
  Escalated:    "text-rose-600",
};

// ─── small helpers ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES["Not Started"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function fmt(ts) {
  if (!ts) return "—";
  return ts.slice(0, 10);
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// ─── StudentDetailDrawer ────────────────────────────────────────────────────

function StudentDetailDrawer({ student, onClose, onUpdateStatus, onUpdateMentor, onAddNote, mentors, currentUser }) {
  const [noteText, setNoteText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(student.intervention_status);
  const isAdmin = currentUser?.role === "Admin";

  function handleStatusChange(s) {
    setSelectedStatus(s);
    onUpdateStatus(student.student_id, s);
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    onAddNote(student.student_id, noteText.trim());
    setNoteText("");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* drawer panel */}
      <div className="relative w-full max-w-md bg-white border-l border-slate-200 shadow-xl flex flex-col overflow-hidden">
        {/* header */}
        <div
          className={`px-5 pt-5 pb-4 border-b border-slate-100 border-l-2 ${
            student.risk_category === "High" ? "border-l-rose-400" : "border-l-transparent"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{student.student_name}</h2>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {student.student_id} · {student.department} · Sem {student.semester}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <RiskBadge level={student.risk_category} probability={student.dropout_probability} />
            <div className="text-xs text-slate-400">
              Dropout probability:{" "}
              <span className="font-mono font-semibold text-slate-700">
                {Math.round(student.dropout_probability * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* status & mentor */}
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400 mb-1.5 block">
                Intervention Status
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => {
                  const active = selectedStatus === s;
                  const st = STATUS_STYLES[s];
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`px-3 py-1 rounded border text-xs font-medium transition-all ${
                        active
                          ? `${st.badge} ring-2 ring-offset-1 ring-current`
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">
                Assigned Mentor
              </label>
              {isAdmin ? (
                <select
                  value={student.assigned_mentor}
                  onChange={(e) => onUpdateMentor(student.student_id, e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 font-medium"
                >
                  {mentors.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {student.assigned_mentor}
                </div>
              )}
            </div>
          </div>

          {/* action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange("Resolved")}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Resolved
            </button>
            <button
              onClick={() => handleStatusChange("Escalated")}
              className="flex items-center gap-1.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-md hover:bg-rose-100 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Escalate
            </button>
          </div>

          {/* notes timeline */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs uppercase tracking-wide text-slate-400">
                Notes ({student.mentor_notes.length})
              </h3>
            </div>

            {/* add note */}
            <div className="mb-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="mt-1.5 flex items-center gap-1.5 text-xs bg-teal-700 text-white px-3 py-1.5 rounded-md hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" /> Save note
              </button>
            </div>

            {/* timeline */}
            {student.mentor_notes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {[...student.mentor_notes].reverse().map((note) => (
                  <div key={note.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-700">{note.author}</span>
                        <span className="text-xs text-slate-400 font-mono">{fmtTime(note.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{note.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KanbanCard ─────────────────────────────────────────────────────────────

function KanbanCard({ student, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-lg p-3.5 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all space-y-2.5 border-l-2 ${
        student.risk_category === "High" ? "border-l-rose-400 bg-rose-50/20" : "border-l-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-800 leading-tight">{student.student_name}</div>
          <div className="text-xs text-slate-400 font-mono">{student.student_id}</div>
        </div>
        <RiskBadge level={student.risk_category} probability={student.dropout_probability} />
      </div>

      <div className="text-xs text-slate-500">{student.department}</div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" /> {student.assigned_mentor}
        </span>
        <span className="font-mono">{fmt(student.last_updated)}</span>
      </div>
    </div>
  );
}

// ─── KanbanColumn ───────────────────────────────────────────────────────────

function KanbanColumn({ status, students, onCardClick, onStatusChange }) {
  const st = STATUS_STYLES[status];
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col border-t-4 ${st.column}`}>
      <div className="px-4 py-3 border-b border-slate-200/80 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
          <h3 className="text-sm font-semibold text-slate-800">{status}</h3>
        </div>
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {students.length}
        </span>
      </div>

      <div className="p-3 space-y-2.5 flex-1 min-h-[260px] overflow-y-auto">
        {students.map((student) => (
          <KanbanCard
            key={student.student_id}
            student={student}
            onClick={() => onCardClick(student)}
            onStatusChange={onStatusChange}
          />
        ))}
        {students.length === 0 && (
          <div className="h-full flex items-center justify-center py-10 text-xs text-slate-400">
            No students
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TableView ──────────────────────────────────────────────────────────────

function TableView({ students, onRowClick }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3 font-medium text-left">Student</th>
            <th className="px-4 py-3 font-medium text-left">Risk</th>
            <th className="px-4 py-3 font-medium text-left">Mentor</th>
            <th className="px-4 py-3 font-medium text-left">Status</th>
            <th className="px-4 py-3 font-medium text-left">Department</th>
            <th className="px-4 py-3 font-medium text-left">Last Updated</th>
            <th className="px-4 py-3 font-medium text-right">Notes</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr
              key={s.student_id}
              onClick={() => onRowClick(s)}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">{s.student_name}</div>
                <div className="text-xs text-slate-400 font-mono">{s.student_id}</div>
              </td>
              <td className="px-4 py-3">
                <RiskBadge level={s.risk_category} probability={s.dropout_probability} />
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{s.assigned_mentor}</td>
              <td className="px-4 py-3">
                <StatusBadge status={s.intervention_status} />
              </td>
              <td className="px-4 py-3 text-slate-500">{s.department}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">{fmt(s.last_updated)}</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">
                {s.mentor_notes.length}
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                No students match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── MentorInterventionTracking (Main Component) ────────────────────────────

import { useAuth } from "../context/AuthContext";

export default function MentorInterventionTracking({ students: initialStudents, currentUser: propUser }) {
  const { currentUser: authUser } = useAuth();
  const currentUser = propUser || authUser;
  const [students, setStudents] = useState(initialStudents);
  const isAdmin = currentUser?.role === "Admin";

  // Filters
  const [search, setSearch] = useState("");
  const [mentorFilter, setMentorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");

  // View toggle
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "table"

  // Detail drawer
  const [activeStudent, setActiveStudent] = useState(null);

  const { users } = useAuth();
  const allMentors = useMemo(() => {
    const activeNames = users
      .filter((u) => u.role === "Mentor" && u.status !== "Inactive")
      .map((u) => u.name);
    return ["All", ...activeNames, "Unassigned"];
  }, [users]);

  // Computed KPIs
  const kpis = useMemo(() => {
    const counts = { "Not Started": 0, "In Progress": 0, Resolved: 0, Escalated: 0 };
    students.forEach((s) => { counts[s.intervention_status] = (counts[s.intervention_status] || 0) + 1; });
    return counts;
  }, [students]);

  // Filtered list
  const filtered = useMemo(() => {
    return students
      .filter((s) => mentorFilter === "All" || s.assigned_mentor === mentorFilter)
      .filter((s) => statusFilter === "All" || s.intervention_status === statusFilter)
      .filter((s) => riskFilter === "All" || s.risk_category === riskFilter)
      .filter(
        (s) =>
          search === "" ||
          s.student_name.toLowerCase().includes(search.toLowerCase()) ||
          s.student_id.toLowerCase().includes(search.toLowerCase())
      );
  }, [students, mentorFilter, statusFilter, riskFilter, search]);

  // Students by status for Kanban
  const byStatus = useMemo(() => {
    const map = {};
    STATUSES.forEach((st) => { map[st] = []; });
    filtered.forEach((s) => {
      const col = STATUSES.includes(s.intervention_status) ? s.intervention_status : "Not Started";
      map[col].push(s);
    });
    return map;
  }, [filtered]);

  function handleUpdateStatus(studentId, newStatus) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, intervention_status: newStatus, last_updated: new Date().toISOString().slice(0, 10) }
          : s
      )
    );
    setActiveStudent((prev) =>
      prev && prev.student_id === studentId
        ? { ...prev, intervention_status: newStatus, last_updated: new Date().toISOString().slice(0, 10) }
        : prev
    );
  }

  function handleUpdateMentor(studentId, newMentor) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, assigned_mentor: newMentor, last_updated: new Date().toISOString().slice(0, 10) }
          : s
      )
    );
    setActiveStudent((prev) =>
      prev && prev.student_id === studentId
        ? { ...prev, assigned_mentor: newMentor, last_updated: new Date().toISOString().slice(0, 10) }
        : prev
    );
  }

  function handleAddNote(studentId, text) {
    const newNote = {
      id: `note-${Date.now()}`,
      author: currentUser?.name || "Mentor",
      timestamp: new Date().toISOString(),
      text,
    };
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, mentor_notes: [...s.mentor_notes, newNote] } : s
      )
    );
    setActiveStudent((prev) =>
      prev && prev.student_id === studentId
        ? { ...prev, mentor_notes: [...prev.mentor_notes, newNote] }
        : prev
    );
  }

  function openDrawer(student) {
    const live = students.find((s) => s.student_id === student.student_id) || student;
    setActiveStudent(live);
  }

  const selectClass =
    "px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          Mentor Intervention Tracking
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Track and manage follow-up actions for at-risk students.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Assigned" value={students.length} accent={KPI_ACCENTS.Total} />
        {STATUSES.map((st) => (
          <KpiCard
            key={st}
            label={st}
            value={kpis[st] || 0}
            sublabel={`of ${students.length}`}
            accent={KPI_ACCENTS[st]}
          />
        ))}
      </div>

      {/* Filter bar + view toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
          />
        </div>

        {/* mentor filter only shown to Admin */}
        {isAdmin && (
          <select value={mentorFilter} onChange={(e) => setMentorFilter(e.target.value)} className={selectClass}>
            {allMentors.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}

        {/* status filter */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {/* risk filter */}
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className={selectClass}>
          <option value="All">All Risk Bands</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        {/* view toggle */}
        <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("kanban")}
            title="Kanban view"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === "kanban"
                ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Kanban
          </button>
          <button
            onClick={() => setViewMode("table")}
            title="Table view"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === "table"
                ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Table2 className="w-3.5 h-3.5" /> Table
          </button>
        </div>
      </div>

      {/* count label */}
      <p className="text-xs text-slate-400 -mt-3">
        {filtered.length} of {students.length} students shown
      </p>

      {/* Kanban board */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              students={byStatus[status]}
              onCardClick={openDrawer}
              onStatusChange={handleUpdateStatus}
            />
          ))}
        </div>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <TableView students={filtered} onRowClick={openDrawer} />
      )}

      {/* Detail drawer */}
      {activeStudent && (
        <StudentDetailDrawer
          student={activeStudent}
          onClose={() => setActiveStudent(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateMentor={handleUpdateMentor}
          onAddNote={handleAddNote}
          mentors={allMentors.filter((m) => m !== "All")}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
