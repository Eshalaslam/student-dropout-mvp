import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { USERS } from "../data/mockAuth";

/**
 * Reusable MentorAssignDropdown component.
 *
 * Props:
 *  - studentId: string (optional if just value/onChange)
 *  - currentMentorId: string | null (or value)
 *  - value: string | null (alias for currentMentorId / mentor name)
 *  - onAssign: (studentId, newMentorId, newMentorName) => void
 *  - onChange: (value) => void
 *  - mentors: array (optional override list; if omitted, uses DataContext)
 *  - isAdmin: boolean (optional override; defaults to checking currentUser)
 *  - disabled: boolean
 *  - className: string
 */
export default function MentorAssignDropdown({
  studentId,
  currentMentorId,
  value,
  onAssign,
  onChange,
  mentors: propMentors,
  isAdmin: propIsAdmin,
  disabled = false,
  className = "",
}) {
  const { currentUser } = useAuth();
  const { activeMentors: contextMentors = [] } = useData();

  const isAdmin =
    propIsAdmin !== undefined
      ? propIsAdmin
      : currentUser?.role === "Admin" || currentUser?.role === "admin";

  // Resolve mentor list: explicit prop > context > mock fallback
  const [mentorList, setMentorList] = useState(() => {
    if (Array.isArray(propMentors) && propMentors.length > 0) {
      return propMentors.filter((m) => m.status !== "Inactive");
    }
    if (contextMentors.length > 0) return contextMentors;
    return USERS.filter((u) => u.role === "Mentor" && u.status === "Active");
  });

  // Sync when propMentors or context mentors update
  useEffect(() => {
    if (Array.isArray(propMentors) && propMentors.length > 0) {
      setMentorList(propMentors.filter((m) => m.status !== "Inactive"));
    } else if (contextMentors.length > 0) {
      setMentorList(contextMentors);
    }
  // contextMentors identity is stable (same array ref unless data changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propMentors, contextMentors]);

  // Determine current value / display name
  const currentVal = value ?? currentMentorId ?? "";

  // Helper to find mentor object
  const selectedMentor = mentorList.find(
    (m) =>
      (m.mentor_id && m.mentor_id === currentVal) ||
      (m.mentorId && m.mentorId === currentVal) ||
      (m.name && m.name.toLowerCase() === String(currentVal).toLowerCase()) ||
      (m.full_name && m.full_name.toLowerCase() === String(currentVal).toLowerCase())
  );

  const displayName = selectedMentor
    ? selectedMentor.name || selectedMentor.full_name
    : currentVal || "Unassigned";

  const isUnassigned = !currentVal || currentVal === "Unassigned";

  // Non-Admin: Read-only presentation
  if (!isAdmin) {
    if (isUnassigned) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
          Unassigned
        </span>
      );
    }
    return (
      <span className="text-sm font-medium text-slate-700">
        {displayName}
      </span>
    );
  }

  // Admin: Editable Dropdown
  function handleChange(e) {
    const selectedVal = e.target.value;
    const found = mentorList.find(
      (m) =>
        (m.mentor_id && m.mentor_id === selectedVal) ||
        (m.mentorId && m.mentorId === selectedVal) ||
        (m.name && m.name === selectedVal) ||
        (m.full_name && m.full_name === selectedVal)
    );

    const newMentorId = found
      ? found.mentor_id || found.mentorId || found.id || selectedVal
      : selectedVal;
    const newMentorName = found
      ? found.name || found.full_name
      : selectedVal;

    if (onAssign) {
      onAssign(studentId, newMentorId, newMentorName);
    }
    if (onChange) {
      onChange(newMentorName || newMentorId);
    }
  }

  // Select value matching
  const selectValue = selectedMentor
    ? selectedMentor.name || selectedMentor.full_name || selectedMentor.mentor_id
    : currentVal || "";

  return (
    <select
      value={selectValue}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      disabled={disabled}
      className={`px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 font-medium transition-colors cursor-pointer hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed ${
        isUnassigned ? "text-amber-700 bg-amber-50/50 border-amber-200 font-semibold" : ""
      } ${className}`}
    >
      <option value="">Unassigned</option>
      {mentorList.map((m) => {
        const mName = m.name || m.full_name || m.username;
        const mId = m.mentor_id || m.mentorId || m.id || mName;
        return (
          <option key={mId} value={mName}>
            {mName}
          </option>
        );
      })}
    </select>
  );
}
