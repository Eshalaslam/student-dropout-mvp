// ─── User registry ────────────────────────────────────────────────────────────
// Each entry is the single source of truth for identity + role.
// `mentorName` must exactly match the `assigned_mentor` / `mentor_name` field
// used in mockInterventions.js so the scoping filter works correctly.

export const USERS = [
  {
    id: "admin1",
    username: "admin",
    password: "admin123",
    name: "Admin User",
    email: "admin@university.edu",
    role: "Admin",
    mentorName: null, // Admins see everything — no scoping
  },
  {
    id: "mentor1",
    username: "priya",
    password: "password",
    name: "Dr. Priya Nair",
    email: "priya@university.edu",
    role: "Mentor",
    mentorName: "Dr. Priya Nair",
  },
  {
    id: "mentor2",
    username: "james",
    password: "password",
    name: "James O'Connor",
    email: "james@university.edu",
    role: "Mentor",
    mentorName: "James O'Connor",
  },
  {
    id: "mentor3",
    username: "sarah",
    password: "password",
    name: "Sarah Kim",
    email: "sarah@university.edu",
    role: "Mentor",
    mentorName: "Sarah Kim",
  },
];

// Legacy single-credential shim (keeps Login.jsx backwards-compatible during transition)
export const DEMO_CREDENTIALS = { email: "admin@university.edu", password: "admin123" };
export const DEMO_MENTOR = USERS[1]; // Dr. Priya Nair

// Look up a user by username + password (case-insensitive username)
export function authenticate(username, password) {
  return USERS.find(
    (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
  ) || null;
}
