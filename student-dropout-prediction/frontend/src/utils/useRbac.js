// useRbac.js — central RBAC utilities.
// Import getScopedStudents() anywhere student data is consumed to apply
// role-based filtering in one place. To add a new role later, edit only here.

/**
 * Filter a student array to only those assigned to the current user.
 * Supports:
 *   getScopedStudents(currentUser, allStudents)
 *   getScopedStudents(role, mentorName, allStudents)
 */
export function getScopedStudents(roleOrUser, mentorNameOrStudents, maybeStudents) {
  let role, mentorName, mentorId, allStudents;

  if (typeof roleOrUser === "object" && roleOrUser !== null) {
    const user = roleOrUser;
    role = user.role;
    mentorName = user.mentorName || user.name;
    mentorId = user.mentorId;
    allStudents = Array.isArray(mentorNameOrStudents) ? mentorNameOrStudents : [];
  } else {
    role = roleOrUser;
    mentorName = mentorNameOrStudents;
    mentorId = null;
    allStudents = Array.isArray(maybeStudents) ? maybeStudents : [];
  }

  if (!role) return allStudents;
  const normalizedRole = String(role).toLowerCase();
  if (normalizedRole === "admin") return allStudents;

  if (normalizedRole !== "mentor") return [];

  return allStudents.filter((s) => {
    const sMentorId = s.assigned_mentor_id || s.assignedMentorId;
    if (mentorId && sMentorId && String(sMentorId).trim() === String(mentorId).trim()) {
      return true;
    }

    const sMentor = s.assigned_mentor || s.assignedMentor;
    if (sMentor) {
      if (mentorName && String(sMentor).trim().toLowerCase() === String(mentorName).trim().toLowerCase()) {
        return true;
      }
      if (mentorId && String(sMentor).trim() === String(mentorId).trim()) {
        return true;
      }
    }

    if (Array.isArray(s.interventions)) {
      const match = s.interventions.some(
        (iv) =>
          (mentorName && iv.mentor_name && String(iv.mentor_name).trim().toLowerCase() === String(mentorName).trim().toLowerCase()) ||
          (mentorId && (iv.assigned_mentor === mentorId || iv.mentor_id === mentorId))
      );
      if (match) return true;
    }

    return false;
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
