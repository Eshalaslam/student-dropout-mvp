import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  LayoutGrid,
  Table2,
  X,
  Plus,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  Loader2,
  Info,
  ArrowRight,
} from "lucide-react";
import RiskBadge from "../components/RiskBadge";
import KpiCard from "../components/KpiCard";
import MentorAssignDropdown from "../components/MentorAssignDropdown";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getScopedStudents } from "../utils/useRbac";

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

function StudentDetailDrawer({
  student,
  onClose,
  onUpdateStatus,
  onUpdateMentor,
  onAddNote,
  mentors,
  currentUser,
  statusUpdating,
  noteAdding,
}) {
  const [noteText, setNoteText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(student.intervention_status || "Not Started");
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "admin";

  // Keep selectedStatus in sync when student changes (drawer reopened)
  useEffect(() => {
    setSelectedStatus(student.intervention_status || "Not Started");
  }, [student.intervention_status, student.student_id]);

  function handleStatusChange(s) {
    setSelectedStatus(s);
    onUpdateStatus(student.student_id, s);
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    await onAddNote(student.student_id, noteText.trim());
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
                {student.student_id}
                {student.department ? ` · ${student.department}` : ""}
                {student.semester ? ` · Sem ${student.semester}` : ""}
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
                {Math.round((student.dropout_probability || 0) * 100)}%
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
                      disabled={statusUpdating}
                      className={`px-3 py-1 rounded border text-xs font-medium transition-all disabled:opacity-60 ${
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
              {statusUpdating && (
                <div className="flex items-center gap-1.5 text-xs text-teal-600 mt-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving status…
                </div>
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400 mb-1 block">
                Assigned Mentor
              </label>
              <MentorAssignDropdown
                studentId={student.student_id}
                value={student.assigned_mentor || student.assigned_mentor_id}
                onAssign={(id, mentorId, mentorName) => onUpdateMentor(id, mentorName)}
                mentors={mentors}
                isAdmin={isAdmin}
                disabled={statusUpdating}
              />
            </div>
          </div>

          {/* action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange("Resolved")}
              disabled={statusUpdating || selectedStatus === "Resolved"}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Resolved
            </button>
            <button
              onClick={() => handleStatusChange("Escalated")}
              disabled={statusUpdating || selectedStatus === "Escalated"}
              className="flex items-center gap-1.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-md hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Escalate
            </button>
          </div>

          {/* notes timeline */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs uppercase tracking-wide text-slate-400">
                Notes ({(student.mentor_notes || []).length})
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
                disabled={!noteText.trim() || noteAdding}
                className="mt-1.5 flex items-center gap-1.5 text-xs bg-teal-700 text-white px-3 py-1.5 rounded-md hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {noteAdding ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                ) : (
                  <><Plus className="w-3.5 h-3.5" /> Save note</>
                )}
              </button>
            </div>

            {/* timeline */}
            {(student.mentor_notes || []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {[...(student.mentor_notes || [])].reverse().map((note, idx) => (
                  <div key={note.id || idx} className="flex gap-3">
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

      <div className="text-xs text-slate-500">{student.department || "—"}</div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          Mentor: <span className="font-medium text-slate-700">{student.assigned_mentor || "Unassigned"}</span>
        </span>
        <span className="font-mono">{fmt(student.last_updated)}</span>
      </div>
    </div>
  );
}

// ─── KanbanColumn ───────────────────────────────────────────────────────────

function KanbanColumn({ status, students, onCardClick }) {
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
              <td className="px-4 py-3 text-sm text-slate-600">{s.assigned_mentor || "Unassigned"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={s.intervention_status || "Not Started"} />
              </td>
              <td className="px-4 py-3 text-slate-500">{s.department || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">{fmt(s.last_updated)}</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">
                {(s.mentor_notes || []).length}
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

export default function MentorInterventionTracking() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "admin";

  // ── State ──────────────────────────────────────────────────────────────────
  const [allStudents, setAllStudents] = useState([]);
  const [dbMentors, setDbMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [noteAdding, setNoteAdding] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [mentorFilter, setMentorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");

  // View toggle
  const [viewMode, setViewMode] = useState("kanban");

  // Detail drawer
  const [activeStudent, setActiveStudent] = useState(null);

  // ── Fetch interventions from backend ───────────────────────────────────────
  const fetchInterventions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getInterventions();
      if (Array.isArray(data)) {
        setAllStudents(data);
      }
    } catch (err) {
      if (err.status === 401) {
        setError("Session expired. Please log out and log back in.");
      } else {
        setError(`Failed to load interventions: ${err.message || err.status || "Unknown error"}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch mentors list (for filter dropdown and reassignment)
  const fetchMentors = useCallback(async () => {
    try {
      const data = await api.getMentors();
      if (Array.isArray(data)) {
        setDbMentors(data.filter((m) => m.status !== "Inactive"));
      }
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchInterventions();
    fetchMentors();
  }, [fetchInterventions, fetchMentors]);

  // ── 1. CENTRALIZED DATA SCOPING ───────────────────────────────────────────
  // Uses getScopedStudents from useRbac.js to enforce role-based access
  const scopedStudents = useMemo(() => {
    return getScopedStudents(currentUser, allStudents);
  }, [currentUser, allStudents]);

  // ── 4. UNASSIGNED STUDENTS COUNT (ADMIN ONLY) ──────────────────────────────
  const unassignedCount = useMemo(() => {
    if (!isAdmin) return 0;
    return allStudents.filter((s) => !s.assigned_mentor && !s.assigned_mentor_id).length;
  }, [isAdmin, allStudents]);

  // ── 6. KPI SUMMARY CARDS (FROM SCOPED DATASET ONLY) ────────────────────────
  const kpis = useMemo(() => {
    const counts = { "Not Started": 0, "In Progress": 0, Resolved: 0, Escalated: 0 };
    scopedStudents.forEach((s) => {
      const st = s.intervention_status || "Not Started";
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [scopedStudents]);

  // ── 2. FILTERED DATASET (BOTH KANBAN AND TABLE USE THIS) ───────────────────
  const filtered = useMemo(() => {
    return scopedStudents
      .filter((s) => mentorFilter === "All" || s.assigned_mentor === mentorFilter)
      .filter((s) => statusFilter === "All" || (s.intervention_status || "Not Started") === statusFilter)
      .filter((s) => riskFilter === "All" || s.risk_category === riskFilter)
      .filter(
        (s) =>
          search === "" ||
          (s.student_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (s.student_id || "").toLowerCase().includes(search.toLowerCase())
      );
  }, [scopedStudents, mentorFilter, statusFilter, riskFilter, search]);

  // ── Kanban groups derived from the scoped & filtered dataset ──────────────
  const byStatus = useMemo(() => {
    const map = {};
    STATUSES.forEach((st) => { map[st] = []; });
    filtered.forEach((s) => {
      const col = STATUSES.includes(s.intervention_status) ? s.intervention_status : "Not Started";
      map[col].push(s);
    });
    return map;
  }, [filtered]);

  // ── Mentor name list for Admin filter ──────────────────────────────────────
  const allMentorNames = useMemo(() => ["All", ...dbMentors.map((m) => m.name || m.full_name)], [dbMentors]);

  // ── 3. DRAWER SCOPING CHECK & OPEN ─────────────────────────────────────────
  function openDrawer(student) {
    // Only open if the student is within current user's authorized scope
    const scopedMatch = scopedStudents.find((s) => s.student_id === student.student_id);
    if (!scopedMatch) {
      setError("You are not authorized to view or manage interventions for this student.");
      setActiveStudent(null);
      return;
    }
    setActiveStudent(scopedMatch);
  }

  // ── Keep drawer in sync with scoped students list ──────────────────────────
  useEffect(() => {
    if (activeStudent) {
      const updated = scopedStudents.find((s) => s.student_id === activeStudent.student_id);
      if (updated) {
        setActiveStudent(updated);
      } else {
        // If student is no longer in scope (e.g. reassigned away from mentor), close drawer
        setActiveStudent(null);
      }
    }
  }, [scopedStudents, activeStudent]);

  // ── Action handlers ────────────────────────────────────────────────────────
  async function handleUpdateStatus(studentId, newStatus) {
    // Optimistic update
    const updateFn = (prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, intervention_status: newStatus, last_updated: new Date().toISOString().slice(0, 10) }
          : s
      );
    setAllStudents(updateFn);

    setStatusUpdating(true);
    try {
      await api.updateInterventionStatus(studentId, newStatus);
    } catch (err) {
      setError(err.message || "Failed to update status.");
      fetchInterventions();
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleUpdateMentor(studentId, mentorName) {
    const mentorObj = dbMentors.find((m) => (m.name || m.full_name) === mentorName);
    const mentorId = mentorObj?.mentor_id || mentorObj?.mentorId || mentorName;

    // Optimistic update
    setAllStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, assigned_mentor: mentorName, assigned_mentor_id: mentorId, last_updated: new Date().toISOString().slice(0, 10) }
          : s
      )
    );

    try {
      await api.reassignMentor(studentId, mentorId);
    } catch (err) {
      setError(err.message || "Failed to reassign mentor.");
      fetchInterventions();
    }
  }

  async function handleAddNote(studentId, text) {
    const authorName = currentUser?.name || currentUser?.full_name || currentUser?.sub || "Mentor";
    setNoteAdding(true);
    try {
      const res = await api.addInterventionNote(studentId, authorName, text);
      const newNote = res?.note || {
        id: `note-${Date.now()}`,
        author: authorName,
        timestamp: new Date().toISOString(),
        text,
      };

      const appendNote = (prev) =>
        prev.map((s) =>
          s.student_id === studentId
            ? { ...s, mentor_notes: [...(s.mentor_notes || []), newNote] }
            : s
        );

      setAllStudents(appendNote);
    } catch (err) {
      setError(err.message || "Failed to save note.");
    } finally {
      setNoteAdding(false);
    }
  }

  const selectClass =
    "px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Mentor Intervention Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Institution-wide intervention management and mentor follow-ups."
              : `Tracking follow-up actions for students assigned to ${currentUser?.mentorName || currentUser?.name || "you"}.`}
          </p>
        </div>
        <button
          onClick={fetchInterventions}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. UNASSIGNED STUDENTS BANNER (ADMIN ONLY) */}
      {isAdmin && unassignedCount > 0 && !loading && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong className="font-semibold">{unassignedCount} student{unassignedCount > 1 ? "s" : ""}</strong> unassigned — assign a mentor to add them to intervention tracking.
            </span>
          </div>
          <Link
            to="/students"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2 flex-shrink-0"
          >
            Assign in Student List <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* 6. KPI SUMMARY CARDS (REFLECT SCOPED NUMBERS ONLY) */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 animate-pulse">
              <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
              <div className="h-7 w-10 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Total Assigned" value={scopedStudents.length} accent={KPI_ACCENTS.Total} />
          {STATUSES.map((st) => (
            <KpiCard
              key={st}
              label={st}
              value={kpis[st] || 0}
              sublabel={`of ${scopedStudents.length}`}
              accent={KPI_ACCENTS[st]}
            />
          ))}
        </div>
      )}

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

        {/* mentor filter — Admin only */}
        {isAdmin && (
          <select value={mentorFilter} onChange={(e) => setMentorFilter(e.target.value)} className={selectClass}>
            {allMentorNames.map((m) => (
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
        {filtered.length} of {scopedStudents.length} students shown
      </p>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((st) => (
            <div key={st} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200/80 bg-white">
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="p-3 space-y-2.5 min-h-[260px]">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-lg p-3.5 animate-pulse space-y-2">
                    <div className="h-3 w-28 bg-slate-100 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. KANBAN BOARD (USES SCOPED & FILTERED DATASET) */}
      {!loading && viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              students={byStatus[status]}
              onCardClick={openDrawer}
            />
          ))}
        </div>
      )}

      {/* 2. TABLE VIEW (USES THE SAME SCOPED & FILTERED DATASET) */}
      {!loading && viewMode === "table" && (
        <TableView students={filtered} onRowClick={openDrawer} />
      )}

      {/* 3. DETAIL DRAWER (WITH REASSIGNMENT DROPDOWN & SCOPE GUARD) */}
      {activeStudent && (
        <StudentDetailDrawer
          student={activeStudent}
          onClose={() => setActiveStudent(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateMentor={handleUpdateMentor}
          onAddNote={handleAddNote}
          mentors={dbMentors}
          currentUser={currentUser}
          statusUpdating={statusUpdating}
          noteAdding={noteAdding}
        />
      )}
    </div>
  );
}
