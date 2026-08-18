// ─── User registry ────────────────────────────────────────────────────────────
// Initial list of predefined users with identity, role, mentor ID, and status.
// Used as the baseline seed for AuthContext (which maintains state during runtime).

export const USERS = [
  {
    id: "admin1",
    username: "admin",
    password: "admin123",
    name: "Admin User",
    email: "admin@university.edu",
    role: "Admin",
    mentorId: null,
    mentorName: null,
    status: "Active",
  },
  {
    id: "mentor1",
    username: "priya",
    password: "password",
    name: "Dr. Priya Nair",
    email: "priya@university.edu",
    role: "Mentor",
    mentorId: "M001",
    mentorName: "Dr. Priya Nair",
    status: "Active",
  },
  {
    id: "mentor2",
    username: "james",
    password: "password",
    name: "James O'Connor",
    email: "james@university.edu",
    role: "Mentor",
    mentorId: "M002",
    mentorName: "James O'Connor",
    status: "Active",
  },
  {
    id: "mentor3",
    username: "sarah",
    password: "password",
    name: "Sarah Kim",
    email: "sarah@university.edu",
    role: "Mentor",
    mentorId: "M003",
    mentorName: "Sarah Kim",
    status: "Active",
  },
];

export const DEMO_CREDENTIALS = { email: "admin@university.edu", password: "admin123" };
export const DEMO_MENTOR = USERS[1]; // Dr. Priya Nair

// Look up a user by username + password (case-insensitive username)
export function authenticate(username, password, usersList = USERS) {
  return usersList.find(
    (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
  ) || null;
}
