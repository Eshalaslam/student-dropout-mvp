const STATUS_OPTIONS = ["Not Started", "In Progress", "Resolved", "Escalated"];

const BADGE_STYLES = {
  "Not Started": "bg-slate-100 text-slate-600 border-slate-200",
  Open: "bg-slate-100 text-slate-600 border-slate-200",
  "In Progress": "bg-sky-50 text-sky-700 border-sky-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Escalated: "bg-rose-50 text-rose-700 border-rose-200",
};

const SELECT_STYLES = {
  "Not Started": "bg-slate-100 text-slate-600 border-slate-200",
  Open: "bg-slate-100 text-slate-600 border-slate-200",
  "In Progress": "bg-sky-50 text-sky-700 border-sky-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Escalated: "bg-rose-50 text-rose-700 border-rose-200",
};

// Renders a static badge by default. Pass `onChange` to turn it into an
// inline editable status control (used in the interventions tab) — same
// component, same color language, no duplicated status logic elsewhere.
export default function StatusPill({ status, onChange }) {
  const currentStatus = status || "Not Started";
  const badgeStyle = BADGE_STYLES[currentStatus] || BADGE_STYLES["Not Started"];
  const selectStyle = SELECT_STYLES[currentStatus] || SELECT_STYLES["Not Started"];

  if (onChange) {
    return (
      <select
        value={currentStatus}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
        className={`text-xs font-medium rounded px-2 py-0.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-200 ${selectStyle}`}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  return <span className={`px-2 py-0.5 rounded border text-xs font-medium ${badgeStyle}`}>{currentStatus}</span>;
}
