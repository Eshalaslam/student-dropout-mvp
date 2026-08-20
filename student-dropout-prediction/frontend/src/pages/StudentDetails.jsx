import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, AlertTriangle, Lock, Loader2, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import RiskBadge from "../components/RiskBadge";
import StatusPill from "../components/StatusPill";
import FactorBar from "../components/FactorBar";
import SimTag from "../components/SimTag";
import ProgressBar from "../components/ProgressBar";
import MentorAssignDropdown from "../components/MentorAssignDropdown";
import DATA from "../data/mockStudents";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { getScopedStudents } from "../utils/useRbac";
import api from "../services/api";

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}

function BooleanBadge({ value, trueLabel, falseLabel }) {
  if (value === null || value === undefined) {
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">—</span>;
  }
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${value ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
        }`}
    >
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function approvalRateColor(rate) {
  if (rate >= 0.7) return "bg-emerald-500";
  if (rate >= 0.4) return "bg-amber-500";
  return "bg-rose-500";
}

function attendanceColor(pct) {
  if (pct >= 85) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

export default function StudentDetails({
  students = DATA,
  onAddIntervention,
  onUpdateInterventionStatus,
  onAssignMentor,
}) {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { updateStudentLocally } = useData();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "admin";

  const [tab, setTab] = useState("overview");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    type: "",
    priority: "High",
    description: "",
    status: "Not Started",
    followUpRequired: false,
    followUpDate: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fetchedStudent, setFetchedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [saveError, setSaveError] = useState("");

  // 1. Flexible student matching in prop array
  const studentInProp = useMemo(() => {
    if (!studentId || !Array.isArray(students)) return null;
    const cleanId = String(studentId).trim().toLowerCase();
    const rawId = cleanId.replace(/^stu-/i, "");
    return students.find((s) => {
      if (!s || !s.student_id) return false;
      const sClean = String(s.student_id).trim().toLowerCase();
      const sRaw = sClean.replace(/^stu-/i, "");
      return sClean === cleanId || sRaw === rawId;
    });
  }, [students, studentId]);

  // 2. Fetch from backend API if student not found in prop array
  useEffect(() => {
    if (!studentInProp && studentId) {
      setLoading(true);
      api
        .getStudent(studentId)
        .then((data) => {
          if (data && (data.student_id || data.id)) {
            setFetchedStudent(data);
          } else {
            setFetchedStudent(null);
          }
        })
        .catch(() => {
          setFetchedStudent(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setFetchedStudent(null);
      setLoading(false);
    }
  }, [studentInProp, studentId]);

  const student = studentInProp || fetchedStudent;

  // 3. Fetch prediction risk history for this student
  const fetchPredictionHistory = () => {
    const sId = student?.student_id || studentId;
    if (sId) {
      setLoadingHistory(true);
      api
        .getStudentPredictions(sId)
        .then((res) => {
          const items = Array.isArray(res) ? res : res?.predictions || res?.history || [];
          setPredictionHistory(items);
        })
        .catch(() => setPredictionHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  };

  useEffect(() => {
    fetchPredictionHistory();
  }, [student?.student_id, studentId, historyVersion]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm text-slate-500">Loading student details…</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Student Not Found</h2>
        <p className="text-sm text-slate-500 mb-4">No student with ID "{studentId}" was found in the cohort.</p>
        <button
          onClick={() => navigate("/students")}
          className="text-sm bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-800 transition-colors"
        >
          Back to Student List
        </button>
      </div>
    );
  }

  // RBAC check: Mentors can only view assigned students
  if (
    currentUser?.role === "Mentor" &&
    !getScopedStudents(currentUser, [student]).length
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-rose-600" />
        </div>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Student Profile Restricted</h2>
        <p className="text-sm text-slate-500 mb-4 max-w-xs">
          You are only authorized to view and manage students assigned to your mentorship.
        </p>
        <button
          onClick={() => navigate("/students")}
          className="text-sm bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-800 transition-colors"
        >
          Back to Student List
        </button>
      </div>
    );
  }

  const interventionsList = student.interventions || [];
  const interventionCount = interventionsList.length;
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "risk", label: "Why is this student at risk?" },
    { id: "history", label: "Risk History" },
    { id: "interventions", label: `Interventions (${interventionCount})` },
  ];

  const dropoutProbability = typeof student.dropout_probability === "number" ? student.dropout_probability : 0;
  const approvalRate = typeof student.approval_rate === "number" ? student.approval_rate : 0;
  const attendancePercentage = typeof student.attendance_percentage === "number" ? student.attendance_percentage : (student.attendance || 0);
  const riskFactors = Array.isArray(student.risk_factors) ? student.risk_factors : [];

  function inputClass(isInvalid) {
    return `w-full px-3 py-2 text-sm border rounded-md bg-white ${isInvalid ? "border-rose-400 bg-rose-50 focus:ring-rose-500" : "border-slate-200"}`;
  }

  function startEditing() {
    setEditForm({
      admission_grade: student.admission_grade ?? "",
      curricular_units_1st_sem_enrolled: student.curricular_units_1st_sem_enrolled ?? "",
      curricular_units_1st_sem_approved: student.curricular_units_1st_sem_approved ?? "",
      curricular_units_1st_sem_grade: student.curricular_units_1st_sem_grade ?? "",
      curricular_units_2nd_sem_enrolled: student.curricular_units_2nd_sem_enrolled ?? "",
      curricular_units_2nd_sem_approved: student.curricular_units_2nd_sem_approved ?? "",
      curricular_units_2nd_sem_grade: student.curricular_units_2nd_sem_grade ?? "",
      scholarship_holder: student.scholarship_holder ?? 0,
      tuition_fees_up_to_date: student.tuition_fees_up_to_date ?? 1,
      attendance_percentage: student.attendance_percentage ?? student.attendance ?? "",
    });
    setEditing(true);
    setSaveError("");
  }

  function validateForm() {
    const errors = [];
    const ag = Number(editForm.admission_grade);
    if (isNaN(ag) || ag < 0 || ag > 200) errors.push("Admission Grade must be between 0 and 200.");
    const s1e = Number(editForm.curricular_units_1st_sem_enrolled);
    if (isNaN(s1e) || s1e < 0 || s1e > 20) errors.push("Sem 1 Enrolled Units must be between 0 and 20.");
    const s1a = Number(editForm.curricular_units_1st_sem_approved);
    if (isNaN(s1a) || s1a < 0 || s1a > s1e) errors.push("Sem 1 Approved Units cannot exceed Enrolled Units.");
    const s1g = Number(editForm.curricular_units_1st_sem_grade);
    if (isNaN(s1g) || s1g < 0 || s1g > 20) errors.push("Sem 1 Grade must be between 0 and 20.");
    const s2e = Number(editForm.curricular_units_2nd_sem_enrolled);
    if (isNaN(s2e) || s2e < 0 || s2e > 20) errors.push("Sem 2 Enrolled Units must be between 0 and 20.");
    const s2a = Number(editForm.curricular_units_2nd_sem_approved);
    if (isNaN(s2a) || s2a < 0 || s2a > s2e) errors.push("Sem 2 Approved Units cannot exceed Enrolled Units.");
    const s2g = Number(editForm.curricular_units_2nd_sem_grade);
    if (isNaN(s2g) || s2g < 0 || s2g > 20) errors.push("Sem 2 Grade must be between 0 and 20.");
    const att = Number(editForm.attendance_percentage);
    if (isNaN(att) || att < 0 || att > 100) errors.push("Attendance must be between 0 and 100.");
    return errors;
  }

  async function saveDetails() {
    const errors = validateForm();
    if (errors.length > 0) {
      setSaveError(errors.join(" "));
      return;
    }
    setSavingDetails(true);
    setSaveError("");
    try {
      const payload = {
        ...editForm,
        admission_grade: Math.min(200, Math.max(0, Number(editForm.admission_grade))),
        curricular_units_1st_sem_enrolled: Math.min(20, Math.max(0, Math.round(Number(editForm.curricular_units_1st_sem_enrolled)))),
        curricular_units_1st_sem_approved: Math.min(Number(editForm.curricular_units_1st_sem_enrolled), Math.max(0, Math.round(Number(editForm.curricular_units_1st_sem_approved)))),
        curricular_units_1st_sem_grade: Math.min(20, Math.max(0, Number(editForm.curricular_units_1st_sem_grade))),
        curricular_units_2nd_sem_enrolled: Math.min(20, Math.max(0, Math.round(Number(editForm.curricular_units_2nd_sem_enrolled)))),
        curricular_units_2nd_sem_approved: Math.min(Number(editForm.curricular_units_2nd_sem_enrolled), Math.max(0, Math.round(Number(editForm.curricular_units_2nd_sem_approved)))),
        curricular_units_2nd_sem_grade: Math.min(20, Math.max(0, Number(editForm.curricular_units_2nd_sem_grade))),
        scholarship_holder: editForm.scholarship_holder ? 1 : 0,
        tuition_fees_up_to_date: editForm.tuition_fees_up_to_date ? 1 : 0,
        attendance_percentage: Math.min(100, Math.max(0, Number(editForm.attendance_percentage))),
      };
      await api.saveStudentDetails(student.student_id, payload);
      updateStudentLocally(student.student_id, payload);
      if (fetchedStudent) {
        setFetchedStudent((prev) => ({ ...prev, ...payload }));
      }
      setEditing(false);
      setHistoryVersion((v) => v + 1);
    } catch (err) {
      setSaveError(err.message || "Failed to save details.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function submitIntervention() {
    setSubmitting(true);
    setSubmitError("");
    const parts = [];
    if (form.description) parts.push(form.description);
    if (form.notes) parts.push(`Notes: ${form.notes}`);
    if (form.followUpRequired && form.followUpDate) parts.push(`Follow-up: ${form.followUpDate}`);
    const combinedNotes = parts.join("\n") || "";
    const interventionData = {
      type: form.type,
      notes: combinedNotes,
      date: new Date().toISOString().slice(0, 10),
      status: form.status,
      mentor_name: currentUser?.name || "Mentor",
      priority: form.priority,
      follow_up_required: form.followUpRequired,
      follow_up_date: form.followUpDate || null,
    };
    try {
      await api.addStudentIntervention(student.student_id, interventionData);
      if (onAddIntervention) {
        onAddIntervention(student.student_id, interventionData);
      }
      if (fetchedStudent) {
        setFetchedStudent((prev) => ({
          ...prev,
          interventions: [...(prev.interventions || []), interventionData],
        }));
      }
      setForm({
        type: "",
        priority: "High",
        description: "",
        status: "Not Started",
        followUpRequired: false,
        followUpDate: "",
        notes: "",
      });
      setShowAddForm(false);
      setHistoryVersion((v) => v + 1);
    } catch (err) {
      setSubmitError(err.message || "Failed to save intervention.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to previous page
      </button>

      {/* Profile header */}
      <div
        className={`bg-white border border-slate-200 rounded-md p-5 flex items-start justify-between flex-wrap gap-4 border-l-2 ${student.risk_category === "High" ? "border-l-rose-400" : "border-l-transparent"
          }`}
      >
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{student.student_name || `Student ${student.student_id}`}</h1>
            <SimTag />
          </div>
          <div className="text-sm text-slate-500 font-mono mt-0.5">
            {student.student_id} · {student.department || "General"} · Semester {student.semester || 1}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-400">Predicted risk</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900">
              {Math.round(dropoutProbability * 100)}%
            </div>
          </div>
          <RiskBadge level={student.risk_category || "Low"} probability={dropoutProbability} />
        </div>
      </div>
      <div className="text-xs text-slate-400 -mt-3">Estimated by the model, not a guaranteed outcome.</div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.id ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          {!editing && (
            <div className="flex justify-end">
              <button
                onClick={startEditing}
                className="text-sm bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
              >
                Edit Details
              </button>
            </div>
          )}

          {editing && (
            <div className="bg-white border border-slate-200 rounded-md p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-800">Edit Student Details</h3>
                <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-3">Academic performance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Admission Grade (0–200)</label>
                    <input type="number" step="0.1" min="0" max="200" value={editForm.admission_grade} onChange={(e) => setEditForm({ ...editForm, admission_grade: e.target.value })} className={inputClass(Number(editForm.admission_grade) > 200 || Number(editForm.admission_grade) < 0)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sem 1 — Enrolled Units</label>
                    <input type="number" min="0" max="20" value={editForm.curricular_units_1st_sem_enrolled} onChange={(e) => setEditForm({ ...editForm, curricular_units_1st_sem_enrolled: e.target.value })} className={inputClass(Number(editForm.curricular_units_1st_sem_enrolled) > 20 || Number(editForm.curricular_units_1st_sem_enrolled) < 0)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sem 1 — Approved Units</label>
                    <input type="number" min="0" max={editForm.curricular_units_1st_sem_enrolled || 20} value={editForm.curricular_units_1st_sem_approved} onChange={(e) => setEditForm({ ...editForm, curricular_units_1st_sem_approved: e.target.value })} className={inputClass(Number(editForm.curricular_units_1st_sem_approved) > Number(editForm.curricular_units_1st_sem_enrolled) || Number(editForm.curricular_units_1st_sem_approved) < 0)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sem 1 — Grade (0–20)</label>
                    <input type="number" step="0.1" min="0" max="20" value={editForm.curricular_units_1st_sem_grade} onChange={(e) => setEditForm({ ...editForm, curricular_units_1st_sem_grade: e.target.value })} className={inputClass(Number(editForm.curricular_units_1st_sem_grade) > 20 || Number(editForm.curricular_units_1st_sem_grade) < 0)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sem 2 — Enrolled Units</label>
                    <input type="number" min="0" max="20" value={editForm.curricular_units_2nd_sem_enrolled} onChange={(e) => setEditForm({ ...editForm, curricular_units_2nd_sem_enrolled: e.target.value })} className={inputClass(Number(editForm.curricular_units_2nd_sem_enrolled) > 20 || Number(editForm.curricular_units_2nd_sem_enrolled) < 0)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sem 2 — Approved Units</label>
                    <input type="number" min="0" max={editForm.curricular_units_2nd_sem_enrolled || 20} value={editForm.curricular_units_2nd_sem_approved} onChange={(e) => setEditForm({ ...editForm, curricular_units_2nd_sem_approved: e.target.value })} className={inputClass(Number(editForm.curricular_units_2nd_sem_approved) > Number(editForm.curricular_units_2nd_sem_enrolled) || Number(editForm.curricular_units_2nd_sem_approved) < 0)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sem 2 — Grade (0–20)</label>
                    <input type="number" step="0.1" min="0" max="20" value={editForm.curricular_units_2nd_sem_grade} onChange={(e) => setEditForm({ ...editForm, curricular_units_2nd_sem_grade: e.target.value })} className={inputClass(Number(editForm.curricular_units_2nd_sem_grade) > 20 || Number(editForm.curricular_units_2nd_sem_grade) < 0)} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-3">Attendance</h4>
                <div className="max-w-xs">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Attendance %</label>
                  <input type="number" min="0" max="100" value={editForm.attendance_percentage} onChange={(e) => setEditForm({ ...editForm, attendance_percentage: e.target.value })} className={inputClass(Number(editForm.attendance_percentage) > 100 || Number(editForm.attendance_percentage) < 0)} />
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-3">Student profile</h4>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                    <input type="checkbox" checked={!!editForm.scholarship_holder} onChange={(e) => setEditForm({ ...editForm, scholarship_holder: e.target.checked ? 1 : 0 })} className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                    Scholarship Holder
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                    <input type="checkbox" checked={!!editForm.tuition_fees_up_to_date} onChange={(e) => setEditForm({ ...editForm, tuition_fees_up_to_date: e.target.checked ? 1 : 0 })} className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                    Tuition Fees Up to Date
                  </label>
                </div>
              </div>

              {saveError && <p className="text-xs text-rose-600">{saveError}</p>}

              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                <button onClick={() => setEditing(false)} className="text-sm text-slate-500 px-4 py-2 rounded-md hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button onClick={saveDetails} disabled={savingDetails} className="flex items-center gap-1.5 text-sm bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-800 transition-colors disabled:opacity-60">
                  {savingDetails ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : "Save Details"}
                </button>
              </div>
            </div>
          )}

          {!editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-md p-4">
                <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-3">Academic performance</h3>
                <dl className="space-y-3">
                  <Row label="Admission grade" value={student.admission_grade} />
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <dt className="text-slate-500">Approval rate</dt>
                      <dd className="font-mono text-slate-800">{Math.round(approvalRate * 100)}%</dd>
                    </div>
                    <ProgressBar value={approvalRate * 100} color={approvalRateColor(approvalRate)} />
                  </div>
                  <Row
                    label="Sem 1 approved / enrolled"
                    value={`${student.curricular_units_1st_sem_approved ?? 0} / ${student.curricular_units_1st_sem_enrolled ?? 0}`}
                  />
                  <Row
                    label="Sem 2 approved / enrolled"
                    value={`${student.curricular_units_2nd_sem_approved ?? 0} / ${student.curricular_units_2nd_sem_enrolled ?? 0}`}
                  />
                  <Row label="Failed units" value={student.curricular_units_failed ?? 0} />
                </dl>
              </div>

              <div className="bg-white border border-slate-200 rounded-md p-4">
                <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-3 flex items-center">
                  Attendance <SimTag />
                </h3>
                <div className="text-3xl font-mono font-semibold text-slate-900">{attendancePercentage}%</div>
                <div className="mt-3">
                  <ProgressBar value={attendancePercentage} color={attendanceColor(attendancePercentage)} />
                </div>
                <p className="text-xs text-slate-400 mt-3">Simulated for this demo — not part of the UCI dataset.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-md p-4">
                <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-3">Student profile</h3>
                <dl className="space-y-2.5">
                  <Row label="Age at enrollment" value={student.age_at_enrollment} />
                  <div className="flex justify-between items-center text-sm">
                    <dt className="text-slate-500">Scholarship holder</dt>
                    <dd>
                      <BooleanBadge value={student.scholarship_holder} trueLabel="Yes" falseLabel="No" />
                    </dd>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <dt className="text-slate-500">Tuition fees</dt>
                    <dd>
                      <BooleanBadge value={student.tuition_fees_up_to_date} trueLabel="Up to date" falseLabel="Overdue" />
                    </dd>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-1 border-t border-slate-100">
                    <dt className="text-slate-500 font-medium">Assigned Mentor</dt>
                    <dd>
                      <MentorAssignDropdown
                        studentId={student.student_id}
                        value={student.assigned_mentor || student.assigned_mentor_id}
                        onAssign={onAssignMentor}
                        isAdmin={isAdmin}
                      />
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk explanation tab */}
      {tab === "risk" && (
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-medium text-slate-800">Factors influencing this prediction</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Plain-language explanation derived from the model — no raw scores shown here.
          </p>
          {riskFactors.length > 0 ? (
            <div>
              {riskFactors.map((f, i) => (
                <FactorBar key={i} factor={f} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-4">No specific risk factors identified for this student.</p>
          )}
        </div>
      )}

      {/* Risk History tab */}
      {tab === "history" && (
        <div className="bg-white border border-slate-200 rounded-md p-5 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-slate-800 tracking-tight">Dropout Risk Trend</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical risk assessment progression recorded whenever student details are updated.
            </p>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center h-48 text-slate-400 space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span className="text-sm">Loading risk history…</span>
            </div>
          ) : predictionHistory.length <= 1 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-6 text-center">
              <p className="text-sm font-medium text-slate-600">
                Not enough history yet — risk trend will appear as more assessments are recorded
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Updating and saving student academic details will automatically trigger and log new risk assessments.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={predictionHistory.map((p, idx) => {
                    const d = p.created_at ? new Date(p.created_at) : new Date();
                    const dateLabel = isNaN(d.getTime())
                      ? `Assessment ${idx + 1}`
                      : d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                    const pctVal = typeof p.risk_score === "number"
                      ? Math.round(p.risk_score * 100)
                      : Math.round((p.dropout_probability || 0) * 100);
                    return {
                      date: dateLabel,
                      probability: pctVal,
                      band: p.risk_band || (pctVal >= 66 ? "High" : pctVal >= 35 ? "Medium" : "Low"),
                    };
                  })}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Dropout Probability"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "6px", borderColor: "#cbd5e1", fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="probability"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#0d9488" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* History Table below chart: Date | Probability | Risk Band */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-3 font-medium">Assessment Log</h4>
            {predictionHistory.length === 0 ? (
              <p className="text-sm text-slate-400 py-3 text-center">No prediction records available.</p>
            ) : (
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-2.5 font-medium text-left">Date</th>
                      <th className="px-4 py-2.5 font-medium text-left">Probability</th>
                      <th className="px-4 py-2.5 font-medium text-right">Risk Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...predictionHistory]
                      .reverse()
                      .map((p, idx) => {
                        const d = p.created_at ? new Date(p.created_at) : null;
                        const formattedDate = d && !isNaN(d.getTime())
                          ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : (p.created_at || "—");
                        const pctVal = typeof p.risk_score === "number"
                          ? Math.round(p.risk_score * 100)
                          : Math.round((p.dropout_probability || 0) * 100);
                        const rawBand = p.risk_band || (pctVal >= 66 ? "High" : pctVal >= 35 ? "Medium" : "Low");
                        const bandVal = rawBand.charAt(0).toUpperCase() + rawBand.slice(1).toLowerCase();
                        return (
                          <tr key={p.id || idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">{formattedDate}</td>
                            <td className="px-4 py-2.5 font-mono text-xs font-semibold tabular-nums text-slate-800">{pctVal}%</td>
                            <td className="px-4 py-2.5 text-right">
                              <RiskBadge level={bandVal} probability={pctVal / 100} />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interventions tab */}
      {tab === "interventions" && (
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="text-sm font-medium text-slate-800">Intervention history</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 text-sm bg-teal-700 text-white px-3 py-1.5 rounded-md hover:bg-teal-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add intervention
            </button>
          </div>

          {showAddForm && (
            <div className="border border-slate-200 rounded-md p-5 mb-4 bg-slate-50 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Student</label>
                <div className="text-sm font-medium text-slate-800">{student.student_name || student.student_id}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Intervention Type</label>
                  <input
                    type="text"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    placeholder="e.g. Academic Counselling"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the intervention purpose..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                  >
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Escalated</option>
                  </select>
                </div>
                <div className="flex items-end gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none pb-2">
                    <input
                      type="checkbox"
                      checked={form.followUpRequired}
                      onChange={(e) => setForm({ ...form, followUpRequired: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Follow-up Required
                  </label>
                  {form.followUpRequired && (
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Follow-up Date</label>
                      <input
                        type="date"
                        value={form.followUpDate}
                        onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                />
              </div>

              {submitError && (
                <p className="text-xs text-rose-600">{submitError}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowAddForm(false)} className="text-sm text-slate-500 px-4 py-2 rounded-md hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={submitIntervention}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-sm bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-800 transition-colors disabled:opacity-60"
                >
                  {submitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          )}

          {interventionsList.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No interventions logged yet.</p>
          ) : (
            <div className="space-y-3">
              {interventionsList
                .map((iv, idx) => ({ ...iv, __idx: idx }))
                .reverse()
                .map((iv) => (
                  <div key={iv.__idx} className="flex items-start gap-3 border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800">{iv.type}</span>
                        <StatusPill
                          status={iv.status}
                          onChange={(status) => onUpdateInterventionStatus && onUpdateInterventionStatus(student.student_id, iv.__idx, status)}
                        />
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {iv.date} · {iv.mentor_name}
                      </div>
                      {iv.notes && <p className="text-sm text-slate-600 mt-1">{iv.notes}</p>}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

