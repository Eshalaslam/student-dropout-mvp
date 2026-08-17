// useRbac.js — central RBAC utilities.
// Import getScopedStudents() anywhere student data is consumed to apply
// role-based filtering in one place. To add a new role later, edit only here.

/**
 * Filter a student array to only those assigned to the current user.
 * @param {"Admin"|"Mentor"} role
 * @param {string|null}      mentorName  — the `assigned_mentor` value to match
 * @param {Array}            allStudents — full INTERVENTION_DATA array
 */
export function getScopedStudents(role, mentorName, allStudents) {
  if (role === "Admin" || !mentorName) return allStudents;
  return allStudents.filter((s) => {
    if (s.assigned_mentor) return s.assigned_mentor === mentorName;
    const mentors = s.interventions?.map((iv) => iv.mentor_name).filter(Boolean) || [];
    return mentors.includes(mentorName);
  });
}

/**
 * Returns true if the current user may access the given page id.
 * Centralising this here means a single edit governs all guards.
 */
export function canAccess(role, pageId) {
  if (role === "Admin") return true;
  const MENTOR_ALLOWED = ["dashboard", "list", "details", "interventions", "reports"];
  return MENTOR_ALLOWED.includes(pageId);
}

/** Role badge colour map — used by Sidebar and TopBar. */
export const ROLE_STYLES = {
  Admin:  { badge: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  Mentor: { badge: "bg-teal-100 text-teal-700 border-teal-200",       dot: "bg-teal-500"   },
};
