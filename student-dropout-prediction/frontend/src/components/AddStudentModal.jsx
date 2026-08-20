import { useState, useEffect } from "react";
import { X, UserPlus, Loader2, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import api from "../services/api";

const DEPARTMENTS = [
  "Computer Science",
  "Mechanical Engineering",
  "Business Administration",
  "Nursing",
  "Electrical Engineering",
  "Civil Engineering",
  "Information Technology",
  "Mathematics",
  "Physics",
  "Chemistry",
];

const DEFAULT_FORM = {
  full_name: "",
  email: "",
  student_id: "",
  password: "student123",
  department: "",
  semester: 1,
  age_at_enrollment: 20,
  admission_grade: 125.0,
  attendance_percentage: "",
  scholarship_holder: 0,
  tuition_fees_current: 1,
  gender: 1,
  units_enrolled_sem1: 6,
  units_approved_sem1: 6,
  units_enrolled_sem2: 6,
  units_approved_sem2: 6,
  grade_sem1: 13.5,
  grade_sem2: 14.0,
  mentor_id: "",
  marital_status: 1,
  application_mode: 1,
  application_order: 1,
  course: 9254,
  daytime_attendance: 1,
  previous_qualification: 1,
  previous_qualification_grade: 130.0,
  mothers_qualification: 1,
  fathers_qualification: 1,
  mothers_occupation: 5,
  fathers_occupation: 5,
  displaced: 0,
  special_needs: 0,
  debtor: 0,
  units_credited_sem1: 0,
  evaluations_sem1: 6,
  no_evaluations_sem1: 0,
  units_credited_sem2: 0,
  evaluations_sem2: 6,
  no_evaluations_sem2: 0,
  unemployment_rate: 10.8,
  inflation_rate: 1.4,
  gdp: 1.74,
};

export default function AddStudentModal({ isOpen, onClose, onStudentAdded }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getMentors()
        .then((data) => {
          if (Array.isArray(data)) setMentors(data.filter((m) => m.status !== "Inactive"));
        })
        .catch(() => {});
      setForm(DEFAULT_FORM);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleChange(e) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  }

  function handleFillDummy() {
    setForm({
      full_name: "Sophia Martinez",
      email: "sophia.martinez@university.edu",
      student_id: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      password: "student123",
      department: "Computer Science",
      semester: 2,
      attendance_percentage: 88,
      mentor_id: mentors[0]?.id || "",

      marital_status: 1,
      application_mode: 1,
      application_order: 1,
      course: 9254,
      daytime_attendance: 1,
      age_at_enrollment: 21,
      previous_qualification: 1,
      previous_qualification_grade: 145.0,
      mothers_qualification: 1,
      fathers_qualification: 1,
      mothers_occupation: 5,
      fathers_occupation: 5,
      admission_grade: 140.0,
      displaced: 0,
      special_needs: 0,
      debtor: 0,
      tuition_fees_current: 1,
      gender: 0,
      scholarship_holder: 1,
      units_credited_sem1: 0,
      units_enrolled_sem1: 6,
      evaluations_sem1: 6,
      units_approved_sem1: 6,
      grade_sem1: 15.2,
      no_evaluations_sem1: 0,
      units_credited_sem2: 0,
      units_enrolled_sem2: 6,
      evaluations_sem2: 6,
      units_approved_sem2: 5,
      grade_sem2: 14.8,
      no_evaluations_sem2: 0,
      unemployment_rate: 10.8,
      inflation_rate: 1.4,
      gdp: 1.74,
    });
    setError(null);
  }

  function validate() {
    if (!form.full_name.trim()) return "Full name is required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "A valid email address is required.";
    if (form.age_at_enrollment < 15 || form.age_at_enrollment > 80)
      return "Age at enrollment must be between 15 and 80.";
    if (form.admission_grade < 0 || form.admission_grade > 200)
      return "Admission grade must be between 0 and 200.";
    if (form.attendance_percentage !== "" && (form.attendance_percentage < 0 || form.attendance_percentage > 100))
      return "Attendance percentage must be between 0 and 100.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      attendance_percentage: form.attendance_percentage === "" ? null : Number(form.attendance_percentage),
      student_id: form.student_id.trim() || null,
      mentor_id: form.mentor_id || null,
    };

    try {
      const newStudent = await api.createStudent(payload);
      setSuccess(true);
      setTimeout(() => {
        onStudentAdded(newStudent);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to create student. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Add New Student</h2>
              <p className="text-xs text-slate-500 mt-0.5">Admin only — creates a student account and dataset record</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillDummy}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Fill Demo Data
            </button>
            <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /><span>Student added successfully! Updating list…</span>
            </div>
          )}

          <fieldset className="mb-5">
            <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identity</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name <span className="text-rose-500">*</span></label>
                <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="e.g. Ana Torres" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email <span className="text-rose-500">*</span></label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="student@campus.edu" required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Student ID <span className="text-slate-400 font-normal">(auto if blank)</span></label>
                <input name="student_id" value={form.student_id} onChange={handleChange} placeholder="e.g. STU-2001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Initial Password</label>
                <input name="password" type="text" value={form.password} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Assign Mentor</label>
                <select name="mentor_id" value={form.mentor_id} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400">
                  <option value="">No mentor assigned</option>
                  {mentors.map((m) => {
                    const mid = m.mentor_id || m.mentorId || m.id;
                    return <option key={mid} value={mid}>{m.name || m.full_name}</option>;
                  })}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="mb-5">
            <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Enrollment</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                <select name="department" value={form.department} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200">
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Semester</label>
                <input name="semester" type="number" min={1} max={8} value={form.semester} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Age at Enrollment</label>
                <input name="age_at_enrollment" type="number" min={15} max={80} value={form.age_at_enrollment} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Admission Grade</label>
                <input name="admission_grade" type="number" step="0.1" min={0} max={200} value={form.admission_grade} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Attendance % <span className="text-slate-400">(opt)</span></label>
                <input name="attendance_percentage" type="number" step="0.1" min={0} max={100} value={form.attendance_percentage} onChange={handleChange} placeholder="e.g. 85" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Scholarship</label>
                <select name="scholarship_holder" value={form.scholarship_holder} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200">
                  <option value={0}>No</option><option value={1}>Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tuition</label>
                <select name="tuition_fees_current" value={form.tuition_fees_current} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200">
                  <option value={1}>Up to date</option><option value={0}>Overdue</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200">
                  <option value={1}>Male</option><option value={0}>Female</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="mb-2">
            <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Academic Performance</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Enrolled Sem 1</label>
                <input name="units_enrolled_sem1" type="number" min={0} value={form.units_enrolled_sem1} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Approved Sem 1</label>
                <input name="units_approved_sem1" type="number" min={0} value={form.units_approved_sem1} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Grade Sem 1 (0–20)</label>
                <input name="grade_sem1" type="number" step="0.1" min={0} max={20} value={form.grade_sem1} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <div></div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Enrolled Sem 2</label>
                <input name="units_enrolled_sem2" type="number" min={0} value={form.units_enrolled_sem2} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Approved Sem 2</label>
                <input name="units_approved_sem2" type="number" min={0} value={form.units_approved_sem2} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Grade Sem 2 (0–20)</label>
                <input name="grade_sem2" type="number" step="0.1" min={0} max={20} value={form.grade_sem2} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>
            </div>
          </fieldset>
        </form>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 gap-3">
          <p className="text-xs text-slate-400">Fields marked <span className="text-rose-500 font-semibold">*</span> are required. Others use UCI dataset defaults.</p>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" onClick={handleSubmit} disabled={loading || success} className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors disabled:opacity-60 flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {success ? "Added!" : loading ? "Adding…" : "Add Student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
