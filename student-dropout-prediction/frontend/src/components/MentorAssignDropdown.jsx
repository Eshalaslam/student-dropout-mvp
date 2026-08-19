import { User } from "lucide-react";

/**
 * Shared MentorAssignDropdown component
 * Editable select for Admin, read-only text for Mentor.
 */
export default function MentorAssignDropdown({
  value,
  onChange,
  mentors = [],
  isAdmin = false,
  disabled = false,
}) {
  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md font-medium">
        <User className="w-3.5 h-3.5 text-slate-400" />
        <span>{value || "Unassigned"}</span>
      </div>
    );
  }

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 font-medium disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {mentors.map((m) => {
        const name = m.name || m.full_name || m.username;
        const id = m.mentor_id || m.mentorId || m.id;
        return (
          <option key={id || name} value={name}>
            {name}
          </option>
        );
      })}
    </select>
  );
}
