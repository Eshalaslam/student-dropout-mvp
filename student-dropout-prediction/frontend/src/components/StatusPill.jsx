const STATUS_OPTIONS = ["Open", "In Progress", "Resolved"];

const BADGE_STYLES = {
  Open: "bg-slate-100 text-slate-600",
  "In Progress": "bg-sky-50 text-sky-700",
  Resolved: "bg-emerald-50 text-emerald-700",
};

const SELECT_STYLES = {
  Open: "bg-slate-100 text-slate-600 border-slate-200",
  "In Progress": "bg-sky-50 text-sky-700 border-sky-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// Renders a static badge by default. Pass `onChange` to turn it into an
// inline editable status control (used in the interventions tab) — same
// component, same color language, no duplicated status logic elsewhere.
export default function StatusPill({ status, onChange }) {
  if (onChange) {
    return (
      <select
        value={status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
        className={`text-xs font-medium rounded px-2 py-0.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-200 ${SELECT_STYLES[status]}`}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${BADGE_STYLES[status]}`}>{status}</span>;
}
