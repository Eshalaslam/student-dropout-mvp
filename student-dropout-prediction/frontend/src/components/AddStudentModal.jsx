import { useState, useEffect } from "react";
import { X, UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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

const MARITAL_STATUS_OPTIONS = [
  { value: 1, label: "Single" },
  { value: 2, label: "Married" },
  { value: 3, label: "Widower" },
  { value: 4, label: "Divorced" },
  { value: 5, label: "Facto Union" },
  { value: 6, label: "Legally Separated" },
];

const APPLICATION_MODE_OPTIONS = [
  { value: 1, label: "1st phase - general contingent" },
  { value: 2, label: "Ordinance No. 612/93" },
  { value: 5, label: "1st phase - special contingent (Azores Island)" },
  { value: 7, label: "Holders of other higher courses" },
  { value: 10, label: "Ordinance No. 854-B/99" },
  { value: 15, label: "International student (bachelor)" },
  { value: 16, label: "1st phase - special contingent (Madeira Island)" },
  { value: 17, label: "2nd phase - general contingent" },
  { value: 18, label: "3rd phase - general contingent" },
  { value: 26, label: "Ordinance No. 533-A/99, item b2 (Different Plan)" },
  { value: 27, label: "Ordinance No. 533-A/99, item b3 (Other Institution)" },
  { value: 39, label: "Over 23 years old" },
  { value: 42, label: "Transfer" },
  { value: 43, label: "Change of course" },
  { value: 44, label: "Technological specialization diploma holders" },
  { value: 51, label: "Change of institution/course" },
  { value: 53, label: "Short cycle diploma holders" },
  { value: 57, label: "Change of institution/course (International)" },
];

const COURSE_OPTIONS = [
  { value: 33, label: "Biofuel Production Technologies" },
  { value: 171, label: "Animation and Multimedia Design" },
  { value: 8014, label: "Social Service (evening attendance)" },
  { value: 9003, label: "Agronomy" },
  { value: 9070, label: "Communication Design" },
  { value: 9085, label: "Veterinary Nursing" },
  { value: 9119, label: "Informatics Engineering" },
  { value: 9130, label: "Equinculture" },
  { value: 9147, label: "Management" },
  { value: 9238, label: "Social Service" },
  { value: 9254, label: "Tourism" },
  { value: 9500, label: "Nursing" },
  { value: 9556, label: "Oral Hygiene" },
  { value: 9670, label: "Advertising and Marketing Management" },
  { value: 9773, label: "Journalism and Communication" },
  { value: 9853, label: "Basic Education" },
  { value: 9991, label: "Management (evening attendance)" },
];

const MOTHERS_QUALIFICATION_OPTIONS = [
  { value: 1, label: "Secondary Education - 12th Year" },
  { value: 2, label: "Higher Ed - Bachelor's Degree" },
  { value: 3, label: "Higher Ed - Degree" },
  { value: 4, label: "Higher Ed - Master's" },
  { value: 5, label: "Higher Ed - Doctorate" },
  { value: 6, label: "Frequency of Higher Education" },
  { value: 9, label: "12th Year - Not Completed" },
  { value: 10, label: "11th Year - Not Completed" },
  { value: 11, label: "7th Year (Old)" },
  { value: 12, label: "Other - 11th Year Schooling" },
  { value: 14, label: "10th Year of Schooling" },
  { value: 18, label: "General commerce course" },
  { value: 19, label: "Basic Ed 3rd Cycle (9th-11th Year)" },
  { value: 22, label: "Technical-professional course" },
  { value: 26, label: "7th year of schooling" },
  { value: 27, label: "2nd cycle general high school" },
  { value: 29, label: "9th Year - Not Completed" },
  { value: 30, label: "8th year of schooling" },
  { value: 34, label: "Unknown" },
  { value: 35, label: "Can't read or write" },
  { value: 36, label: "Can read without 4th year schooling" },
  { value: 37, label: "Basic Ed 1st Cycle (4th/5th Year)" },
  { value: 38, label: "Basic Ed 2nd Cycle (6th-8th Year)" },
  { value: 39, label: "Technological specialization course" },
  { value: 40, label: "Higher Ed - Degree (1st Cycle)" },
  { value: 41, label: "Specialized higher studies course" },
  { value: 42, label: "Professional higher technical course" },
  { value: 43, label: "Higher Ed - Master (2nd Cycle)" },
  { value: 44, label: "Higher Ed - Doctorate (3rd Cycle)" },
];

const FATHERS_QUALIFICATION_OPTIONS = [
  { value: 1, label: "Secondary Education - 12th Year" },
  { value: 2, label: "Higher Ed - Bachelor's Degree" },
  { value: 3, label: "Higher Ed - Degree" },
  { value: 4, label: "Higher Ed - Master's" },
  { value: 5, label: "Higher Ed - Doctorate" },
  { value: 6, label: "Frequency of Higher Education" },
  { value: 9, label: "12th Year - Not Completed" },
  { value: 10, label: "11th Year - Not Completed" },
  { value: 11, label: "7th Year (Old)" },
  { value: 12, label: "Other - 11th Year Schooling" },
  { value: 13, label: "2nd year complementary high school" },
  { value: 14, label: "10th Year of Schooling" },
  { value: 18, label: "General commerce course" },
  { value: 19, label: "Basic Ed 3rd Cycle (9th-11th Year)" },
  { value: 20, label: "Complementary High School Course" },
  { value: 22, label: "Technical-professional course" },
  { value: 25, label: "Complementary High School - not concluded" },
  { value: 26, label: "7th year of schooling" },
  { value: 27, label: "2nd cycle general high school" },
  { value: 29, label: "9th Year - Not Completed" },
  { value: 30, label: "8th year of schooling" },
  { value: 31, label: "General Course Admin and Commerce" },
  { value: 33, label: "Supplementary Accounting/Admin" },
  { value: 34, label: "Unknown" },
  { value: 35, label: "Can't read or write" },
  { value: 36, label: "Can read without 4th year schooling" },
  { value: 37, label: "Basic Ed 1st Cycle (4th/5th Year)" },
  { value: 38, label: "Basic Ed 2nd Cycle (6th-8th Year)" },
  { value: 39, label: "Technological specialization course" },
  { value: 40, label: "Higher Ed - Degree (1st Cycle)" },
  { value: 41, label: "Specialized higher studies course" },
  { value: 42, label: "Professional higher technical course" },
  { value: 43, label: "Higher Ed - Master (2nd Cycle)" },
  { value: 44, label: "Higher Ed - Doctorate (3rd Cycle)" },
];

const PREVIOUS_QUALIFICATION_OPTIONS = [
  { value: 1, label: "Secondary education" },
  { value: 2, label: "Higher education - bachelor's degree" },
  { value: 3, label: "Higher education - degree" },
  { value: 4, label: "Higher education - master's" },
  { value: 5, label: "Higher education - doctorate" },
  { value: 6, label: "Frequency of higher education" },
  { value: 9, label: "12th year of schooling - not completed" },
  { value: 10, label: "11th year of schooling - not completed" },
  { value: 12, label: "Other - 11th year of schooling" },
  { value: 14, label: "10th year of schooling" },
  { value: 15, label: "10th year of schooling - not completed" },
  { value: 19, label: "Basic education 3rd cycle (9th-11th year)" },
  { value: 38, label: "Basic education 2nd cycle (6th-8th year)" },
  { value: 39, label: "Technological specialization course" },
  { value: 40, label: "Higher education - degree (1st cycle)" },
  { value: 42, label: "Professional higher technical course" },
  { value: 43, label: "Higher education - master (2nd cycle)" },
];

const MOTHERS_OCCUPATION_OPTIONS = [
  { value: 0, label: "Student" },
  { value: 1, label: "Legislative/Executive Bodies, Directors" },
  { value: 2, label: "Intellectual & Scientific Activities" },
  { value: 3, label: "Intermediate Level Tech & Professions" },
  { value: 4, label: "Administrative staff" },
  { value: 5, label: "Personal Services, Security, Sellers" },
  { value: 6, label: "Agriculture, Fisheries and Forestry" },
  { value: 7, label: "Industry, Construction, Craftsmen" },
  { value: 8, label: "Machine Operators and Assembly" },
  { value: 9, label: "Unskilled Workers" },
  { value: 10, label: "Armed Forces Professions" },
  { value: 90, label: "Other Situation" },
  { value: 99, label: "(blank)" },
  { value: 122, label: "Health professionals" },
  { value: 123, label: "Teachers" },
  { value: 125, label: "ICT Specialists" },
  { value: 131, label: "Intermediate Science/Engineering Tech" },
  { value: 132, label: "Intermediate Health Tech & Professionals" },
  { value: 134, label: "Intermediate Legal/Social/Cultural Tech" },
  { value: 141, label: "Office workers, secretaries, data processing" },
  { value: 143, label: "Data, accounting, statistical operators" },
  { value: 144, label: "Other administrative support staff" },
  { value: 151, label: "Personal service workers" },
  { value: 152, label: "Sellers" },
  { value: 153, label: "Personal care workers" },
  { value: 171, label: "Skilled construction workers" },
  { value: 173, label: "Skilled in printing, precision instruments" },
  { value: 175, label: "Food processing, woodworking, clothing workers" },
  { value: 191, label: "Cleaning workers" },
  { value: 192, label: "Unskilled in agriculture/forestry/fishery" },
  { value: 193, label: "Unskilled in construction/manufacturing" },
  { value: 194, label: "Meal preparation assistants" },
];

const FATHERS_OCCUPATION_OPTIONS = [
  { value: 0, label: "Student" },
  { value: 1, label: "Legislative/Executive Bodies, Directors" },
  { value: 2, label: "Intellectual & Scientific Activities" },
  { value: 3, label: "Intermediate Level Tech & Professions" },
  { value: 4, label: "Administrative staff" },
  { value: 5, label: "Personal Services, Security, Sellers" },
  { value: 6, label: "Agriculture, Fisheries and Forestry" },
  { value: 7, label: "Industry, Construction, Craftsmen" },
  { value: 8, label: "Machine Operators and Assembly" },
  { value: 9, label: "Unskilled Workers" },
  { value: 10, label: "Armed Forces Professions" },
  { value: 90, label: "Other Situation" },
  { value: 99, label: "(blank)" },
  { value: 101, label: "Armed Forces Officers" },
  { value: 102, label: "Armed Forces Sergeants" },
  { value: 103, label: "Other Armed Forces personnel" },
  { value: 112, label: "Directors of admin/commercial services" },
  { value: 114, label: "Hotel/trade/services directors" },
  { value: 121, label: "Physical sciences, math, engineering" },
  { value: 122, label: "Health professionals" },
  { value: 123, label: "Teachers" },
  { value: 124, label: "Finance, accounting, admin organization" },
  { value: 131, label: "Intermediate Science/Engineering Tech" },
  { value: 132, label: "Intermediate Health Tech & Professionals" },
  { value: 134, label: "Intermediate Legal/Social/Cultural Tech" },
  { value: 135, label: "Information and communication tech techs" },
  { value: 141, label: "Office workers, secretaries, data processing" },
  { value: 143, label: "Data, accounting, statistical operators" },
  { value: 144, label: "Other administrative support staff" },
  { value: 151, label: "Personal service workers" },
  { value: 152, label: "Sellers" },
  { value: 153, label: "Personal care workers" },
  { value: 154, label: "Protection and security services" },
  { value: 161, label: "Market-oriented farmers" },
  { value: 163, label: "Subsistence farmers/fishermen" },
  { value: 171, label: "Skilled construction workers" },
  { value: 172, label: "Skilled in metallurgy/metalworking" },
  { value: 174, label: "Skilled in electricity and electronics" },
  { value: 175, label: "Food processing, woodworking, clothing workers" },
  { value: 181, label: "Fixed plant and machine operators" },
  { value: 182, label: "Assembly workers" },
  { value: 183, label: "Vehicle drivers and mobile equipment" },
  { value: 192, label: "Unskilled in agriculture/forestry/fishery" },
  { value: 193, label: "Unskilled in construction/manufacturing" },
  { value: 194, label: "Meal preparation assistants" },
  { value: 195, label: "Street vendors and street service providers" },
];

const DEFAULT_FORM = {
  full_name: "",
  email: "",
  student_id: "",
  password: "student123",
  department: "",
  semester: 1,
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
  admission_grade: 125.0,
  displaced: 0,
  special_needs: 0,
  debtor: 0,
  tuition_fees_current: 1,
  gender: 1,
  scholarship_holder: 0,
  age_at_enrollment: 20,
  attendance_percentage: "",
  units_credited_sem1: 0,
  units_enrolled_sem1: 6,
  evaluations_sem1: 6,
  units_approved_sem1: 6,
  grade_sem1: 13.5,
  no_evaluations_sem1: 0,
  units_credited_sem2: 0,
  units_enrolled_sem2: 6,
  evaluations_sem2: 6,
  units_approved_sem2: 6,
  grade_sem2: 14.0,
  no_evaluations_sem2: 0,
  unemployment_rate: 10.8,
  inflation_rate: 1.4,
  gdp: 1.74,
  mentor_id: "",
};

function SelectField({ name, label, value, onChange, options, required, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
        {hint && <span className="text-slate-400 font-normal ml-1">{hint}</span>}
      </label>
      <select name={name} value={value} onChange={onChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400">
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberField({ name, label, value, onChange, min, max, step, required, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
        {hint && <span className="text-slate-400 font-normal ml-1">{hint}</span>}
      </label>
      <input
        name={name}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
      />
    </div>
  );
}

function BinaryField({ name, label, value, onChange, yesLabel, noLabel }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select name={name} value={value} onChange={onChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400">
        <option value={0}>{noLabel || "No"}</option>
        <option value={1}>{yesLabel || "Yes"}</option>
      </select>
    </div>
  );
}

export default function AddStudentModal({ isOpen, onClose, onStudentAdded }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

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
      setCollapsedSections({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const NUMERIC_FIELDS = new Set([
    "marital_status", "application_mode", "application_order", "course",
    "daytime_attendance", "previous_qualification", "mothers_qualification",
    "fathers_qualification", "mothers_occupation", "fathers_occupation",
    "displaced", "special_needs", "debtor", "tuition_fees_current",
    "gender", "scholarship_holder", "age_at_enrollment", "semester",
    "units_credited_sem1", "units_enrolled_sem1", "evaluations_sem1",
    "units_approved_sem1", "no_evaluations_sem1",
    "units_credited_sem2", "units_enrolled_sem2", "evaluations_sem2",
    "units_approved_sem2", "no_evaluations_sem2",
  ]);

  function handleChange(e) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: (type === "number" || NUMERIC_FIELDS.has(name))
        ? (value === "" ? "" : Number(value))
        : value,
    }));
  }

  function toggleSection(key) {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function validate() {
    if (!form.full_name.trim()) return "Full name is required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "A valid email address is required.";
    if (form.age_at_enrollment < 15 || form.age_at_enrollment > 80)
      return "Age at enrollment must be between 15 and 80.";
    if (form.admission_grade < 0 || form.admission_grade > 200)
      return "Admission grade must be between 0 and 200.";
    if (form.previous_qualification_grade < 0 || form.previous_qualification_grade > 200)
      return "Previous qualification grade must be between 0 and 200.";
    if (form.grade_sem1 < 0 || form.grade_sem1 > 20)
      return "Semester 1 grade must be between 0 and 20.";
    if (form.grade_sem2 < 0 || form.grade_sem2 > 20)
      return "Semester 2 grade must be between 0 and 20.";
    if (form.attendance_percentage !== "" && (form.attendance_percentage < 0 || form.attendance_percentage > 100))
      return "Attendance percentage must be between 0 and 100.";
    if (form.unemployment_rate < 0) return "Unemployment rate cannot be negative.";
    if (form.inflation_rate < -50 || form.inflation_rate > 50)
      return "Inflation rate must be between -50 and 50.";
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

  const sectionStyle = (key) =>
    `text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 cursor-pointer select-none hover:text-slate-500 transition-colors`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Add New Student</h2>
              <p className="text-xs text-slate-500 mt-0.5">Admin only - creates a student account and dataset record</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /><span>Student added successfully! Updating list...</span>
            </div>
          )}

          {/* Account Setup */}
          <fieldset className="mb-5">
            <legend className={sectionStyle("account")} onClick={() => toggleSection("account")}>
              <span className="text-teal-500">&#9660;</span> Account Setup
            </legend>
            {!collapsedSections.account && (
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
            )}
          </fieldset>

          {/* Personal & Application Details */}
          <fieldset className="mb-5">
            <legend className={sectionStyle("personal")} onClick={() => toggleSection("personal")}>
              <span className="text-teal-500">&#9660;</span> Personal & Application Details
            </legend>
            {!collapsedSections.personal && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <SelectField name="marital_status" label="Marital Status" value={form.marital_status} onChange={handleChange} options={MARITAL_STATUS_OPTIONS} />
                <BinaryField name="gender" label="Gender" value={form.gender} onChange={handleChange} yesLabel="Male" noLabel="Female" />
                <NumberField name="age_at_enrollment" label="Age at Enrollment" value={form.age_at_enrollment} onChange={handleChange} min={15} max={80} />
                <BinaryField name="daytime_attendance" label="Attendance Mode" value={form.daytime_attendance} onChange={handleChange} yesLabel="Daytime" noLabel="Evening" />
                <SelectField name="course" label="Course / Degree" value={form.course} onChange={handleChange} options={COURSE_OPTIONS} />
                <SelectField name="application_mode" label="Application Mode" value={form.application_mode} onChange={handleChange} options={APPLICATION_MODE_OPTIONS} />
                <NumberField name="application_order" label="Application Order" value={form.application_order} onChange={handleChange} min={0} max={9} hint="(0-9)" />
                <SelectField name="previous_qualification" label="Previous Qualification" value={form.previous_qualification} onChange={handleChange} options={PREVIOUS_QUALIFICATION_OPTIONS} />
                <NumberField name="previous_qualification_grade" label="Prev. Qualification Grade" value={form.previous_qualification_grade} onChange={handleChange} min={0} max={200} step={0.1} hint="(0-200)" />
              </div>
            )}
          </fieldset>

          {/* Family Background */}
          <fieldset className="mb-5">
            <legend className={sectionStyle("family")} onClick={() => toggleSection("family")}>
              <span className="text-teal-500">&#9660;</span> Family Background
            </legend>
            {!collapsedSections.family && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SelectField name="mothers_qualification" label="Mother's Qualification" value={form.mothers_qualification} onChange={handleChange} options={MOTHERS_QUALIFICATION_OPTIONS} />
                <SelectField name="fathers_qualification" label="Father's Qualification" value={form.fathers_qualification} onChange={handleChange} options={FATHERS_QUALIFICATION_OPTIONS} />
                <SelectField name="mothers_occupation" label="Mother's Occupation" value={form.mothers_occupation} onChange={handleChange} options={MOTHERS_OCCUPATION_OPTIONS} />
                <SelectField name="fathers_occupation" label="Father's Occupation" value={form.fathers_occupation} onChange={handleChange} options={FATHERS_OCCUPATION_OPTIONS} />
              </div>
            )}
          </fieldset>

          {/* Enrollment & Financial Status */}
          <fieldset className="mb-5">
            <legend className={sectionStyle("enrollment")} onClick={() => toggleSection("enrollment")}>
              <span className="text-teal-500">&#9660;</span> Enrollment & Financial Status
            </legend>
            {!collapsedSections.enrollment && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                  <select name="department" value={form.department} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200">
                    <option value="">Select...</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <NumberField name="semester" label="Semester" value={form.semester} onChange={handleChange} min={1} max={8} />
                <NumberField name="admission_grade" label="Admission Grade" value={form.admission_grade} onChange={handleChange} min={0} max={200} step={0.1} hint="(0-200)" />
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Attendance % <span className="text-slate-400">(opt)</span></label>
                  <input name="attendance_percentage" type="number" step="0.1" min={0} max={100} value={form.attendance_percentage} onChange={handleChange} placeholder="e.g. 85" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200" />
                </div>
                <BinaryField name="scholarship_holder" label="Scholarship Holder" value={form.scholarship_holder} onChange={handleChange} />
                <BinaryField name="tuition_fees_current" label="Tuition Fees Status" value={form.tuition_fees_current} onChange={handleChange} yesLabel="Up to Date" noLabel="Overdue" />
                <BinaryField name="displaced" label="Displaced Student" value={form.displaced} onChange={handleChange} />
                <BinaryField name="special_needs" label="Special Needs" value={form.special_needs} onChange={handleChange} />
                <BinaryField name="debtor" label="Debtor Status" value={form.debtor} onChange={handleChange} />
              </div>
            )}
          </fieldset>

          {/* Semester 1 Academic Performance */}
          <fieldset className="mb-5">
            <legend className={sectionStyle("sem1")} onClick={() => toggleSection("sem1")}>
              <span className="text-teal-500">&#9660;</span> Semester 1 - Academic Performance
            </legend>
            {!collapsedSections.sem1 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <NumberField name="units_credited_sem1" label="Units Credited" value={form.units_credited_sem1} onChange={handleChange} min={0} />
                <NumberField name="units_enrolled_sem1" label="Units Enrolled" value={form.units_enrolled_sem1} onChange={handleChange} min={0} />
                <NumberField name="evaluations_sem1" label="Units Evaluated" value={form.evaluations_sem1} onChange={handleChange} min={0} />
                <NumberField name="units_approved_sem1" label="Units Approved" value={form.units_approved_sem1} onChange={handleChange} min={0} />
                <NumberField name="grade_sem1" label="Average Grade (0-20)" value={form.grade_sem1} onChange={handleChange} min={0} max={20} step={0.1} />
                <NumberField name="no_evaluations_sem1" label="Units w/o Evaluations" value={form.no_evaluations_sem1} onChange={handleChange} min={0} />
              </div>
            )}
          </fieldset>

          {/* Semester 2 Academic Performance */}
          <fieldset className="mb-5">
            <legend className={sectionStyle("sem2")} onClick={() => toggleSection("sem2")}>
              <span className="text-teal-500">&#9660;</span> Semester 2 - Academic Performance
            </legend>
            {!collapsedSections.sem2 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <NumberField name="units_credited_sem2" label="Units Credited" value={form.units_credited_sem2} onChange={handleChange} min={0} />
                <NumberField name="units_enrolled_sem2" label="Units Enrolled" value={form.units_enrolled_sem2} onChange={handleChange} min={0} />
                <NumberField name="evaluations_sem2" label="Units Evaluated" value={form.evaluations_sem2} onChange={handleChange} min={0} />
                <NumberField name="units_approved_sem2" label="Units Approved" value={form.units_approved_sem2} onChange={handleChange} min={0} />
                <NumberField name="grade_sem2" label="Average Grade (0-20)" value={form.grade_sem2} onChange={handleChange} min={0} max={20} step={0.1} />
                <NumberField name="no_evaluations_sem2" label="Units w/o Evaluations" value={form.no_evaluations_sem2} onChange={handleChange} min={0} />
              </div>
            )}
          </fieldset>

          {/* Macroeconomic Context */}
          <fieldset className="mb-2">
            <legend className={sectionStyle("macro")} onClick={() => toggleSection("macro")}>
              <span className="text-teal-500">&#9660;</span> Macroeconomic Context
            </legend>
            {!collapsedSections.macro && (
              <div className="grid grid-cols-3 gap-4">
                <NumberField name="unemployment_rate" label="Unemployment Rate (%)" value={form.unemployment_rate} onChange={handleChange} min={0} step={0.1} />
                <NumberField name="inflation_rate" label="Inflation Rate (%)" value={form.inflation_rate} onChange={handleChange} step={0.1} />
                <NumberField name="gdp" label="GDP Growth (%)" value={form.gdp} onChange={handleChange} step={0.01} />
              </div>
            )}
          </fieldset>
        </form>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 gap-3">
          <p className="text-xs text-slate-400">Fields marked <span className="text-rose-500 font-semibold">*</span> are required. All 34 prediction features are included.</p>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" onClick={handleSubmit} disabled={loading || success} className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors disabled:opacity-60 flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {success ? "Added!" : loading ? "Adding..." : "Add Student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
