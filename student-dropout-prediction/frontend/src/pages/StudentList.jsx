import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, UserPlus } from "lucide-react";
import StudentTable from "../components/StudentTable";
import AddStudentModal from "../components/AddStudentModal";
import { useAuth } from "../context/AuthContext";

export default function StudentList({ students = [], onAssignMentor, onStudentAdded }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "admin";

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [mentorFilter, setMentorFilter] = useState("All");
  const [sortDesc, setSortDesc] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const departments = useMemo(
    () => ["All", ...new Set(students.map((s) => s.department).filter(Boolean))],
    [students]
  );

  const mentorsList = useMemo(() => {
    const names = new Set(
      students
        .map((s) => s.assigned_mentor)
        .filter((m) => m && m !== "Unassigned")
    );
    return Array.from(names);
  }, [students]);

  const filtered = useMemo(() => {
    return students
      .filter((s) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (s.student_name || "").toLowerCase().includes(q) ||
          (s.student_id || "").toLowerCase().includes(q)
        );
      })
      .filter((s) => riskFilter === "All" || s.risk_category === riskFilter)
      .filter((s) => deptFilter === "All" || s.department === deptFilter)
      .filter((s) => {
        if (mentorFilter === "All") return true;
        if (mentorFilter === "Unassigned") {
          return !s.assigned_mentor || s.assigned_mentor === "Unassigned";
        }
        return s.assigned_mentor === mentorFilter;
      })
      .sort((a, b) =>
        sortDesc
          ? (b.dropout_probability || 0) - (a.dropout_probability || 0)
          : (a.dropout_probability || 0) - (b.dropout_probability || 0)
      );
  }, [students, search, riskFilter, deptFilter, mentorFilter, sortDesc]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Student List</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {students.length} students shown
          </p>
        </div>
        {isAdmin && (
          <button
            id="add-student-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors shadow-sm flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add Student
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
          />
        </div>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          <option value="All">All Risk Bands</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          {departments.map((d) => (
            <option key={d} value={d}>
              {d === "All" ? "All Departments" : d}
            </option>
          ))}
        </select>

        {isAdmin && (
          <select
            value={mentorFilter}
            onChange={(e) => setMentorFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="All">All Mentors</option>
            <option value="Unassigned">Mentor: Unassigned</option>
            {mentorsList.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Risk {sortDesc ? "High to Low" : "Low to High"}
        </button>
      </div>

      <StudentTable
        students={filtered}
        onSelect={(id) => navigate(/students/)}
        onAssignMentor={onAssignMentor}
      />

      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onStudentAdded={(newStudent) => {
          setShowAddModal(false);
          if (onStudentAdded) onStudentAdded(newStudent);
        }}
      />
    </div>
  );
}
