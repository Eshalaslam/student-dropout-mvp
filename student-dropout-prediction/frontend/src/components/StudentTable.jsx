import { ChevronRight } from "lucide-react";
import RiskBadge from "./RiskBadge";
import MentorAssignDropdown from "./MentorAssignDropdown";
import { useAuth } from "../context/AuthContext";

// Shared by Student List and (optionally) Dashboard's at-risk table.
export default function StudentTable({ students, onSelect, onAssignMentor }) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "admin";

  return (
    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Department</th>
            <th className="px-4 py-3 font-medium">Risk</th>
            <th className="px-4 py-3 font-medium">Assigned Mentor</th>
            <th className="px-4 py-3 font-medium">Last intervention</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const isHighRisk = s.risk_category === "High";
            const lastIntervention =
              Array.isArray(s.interventions) && s.interventions.length > 0
                ? s.interventions[s.interventions.length - 1].date ||
                  s.interventions[s.interventions.length - 1].created_at
                : null;

            return (
              <tr
                key={s.student_id}
                onClick={() => onSelect(s.student_id)}
                className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors border-l-2 ${
                  isHighRisk ? "border-l-rose-400 bg-rose-50/30" : "border-l-transparent"
                }`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{s.student_name}</div>
                  <div className="text-xs text-slate-400 font-mono">{s.student_id}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{s.department || "—"}</td>
                <td className="px-4 py-3">
                  <RiskBadge level={s.risk_category} probability={s.dropout_probability} />
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <MentorAssignDropdown
                    studentId={s.student_id}
                    value={s.assigned_mentor || s.assigned_mentor_id}
                    onAssign={onAssignMentor}
                    isAdmin={isAdmin}
                  />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                  {lastIntervention ? String(lastIntervention).slice(0, 10) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {students.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-400">No students match these filters.</div>
      )}
    </div>
  );
}
