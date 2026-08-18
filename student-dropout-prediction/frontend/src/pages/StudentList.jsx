import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import StudentTable from "../components/StudentTable";

export default function StudentList({ students }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [sortDesc, setSortDesc] = useState(true);

  const departments = ["All", ...new Set(students.map((s) => s.department))];

  const filtered = students
    .filter(
      (s) =>
        search === "" ||
        s.student_name.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id.toLowerCase().includes(search.toLowerCase())
    )
    .filter((s) => riskFilter === "All" || s.risk_category === riskFilter)
    .filter((s) => deptFilter === "All" || s.department === deptFilter)
    .sort((a, b) => (sortDesc ? b.dropout_probability - a.dropout_probability : a.dropout_probability - b.dropout_probability));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Student List</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {filtered.length} of {students.length} students shown
        </p>
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
          className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700"
        >
          <option>All</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700"
        >
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Risk {sortDesc ? "High → Low" : "Low → High"}
        </button>
      </div>

      <StudentTable students={filtered} onSelect={(id) => navigate(`/students/${id}`)} />
    </div>
  );
}
