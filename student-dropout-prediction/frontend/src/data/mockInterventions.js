// Mock data for Mentor Intervention Tracking.
// Extends the student records with:
//   intervention_status : "Not Started" | "In Progress" | "Resolved" | "Escalated"
//   assigned_mentor     : string
//   mentor_notes        : { id, author, timestamp, text }[]   -- timeline of mentor notes

import BASE_STUDENTS from "./mockStudents";

export const MENTORS = ["Dr. Priya Nair", "James O'Connor", "Sarah Kim", "Unassigned"];

const INTERVENTION_STATUSES = ["Not Started", "In Progress", "Resolved", "Escalated"];

// Derive an intervention_status from the student's interventions array
function deriveStatus(student) {
  if (student.interventions.length === 0) return "Not Started";
  const statuses = student.interventions.map((iv) => iv.status);
  if (statuses.includes("Open") && student.risk_category === "High") return "Escalated";
  if (statuses.some((s) => s === "Open" || s === "In Progress")) return "In Progress";
  if (statuses.every((s) => s === "Resolved")) return "Resolved";
  return "In Progress";
}

function deriveMentor(student) {
  const mentors = student.interventions.map((iv) => iv.mentor_name).filter(Boolean);
  return mentors.length > 0 ? mentors[mentors.length - 1] : "Unassigned";
}

const SEED_NOTES = {
  "STU-1002": [
    { id: "n1", author: "Dr. Priya Nair", timestamp: "2026-06-02T09:15:00", text: "Referred to peer tutoring. Will check back in 2 weeks." },
    { id: "n2", author: "Dr. Priya Nair", timestamp: "2026-07-10T14:30:00", text: "Called student. Cited workload stress. Scheduled follow-up counseling session." },
  ],
  "STU-1003": [
    { id: "n3", author: "James O'\''Connor", timestamp: "2026-05-20T11:00:00", text: "Emergency bursary application submitted and approved. Financial stress resolved." },
  ],
  "STU-1004": [
    { id: "n4", author: "Dr. Priya Nair", timestamp: "2026-04-15T10:00:00", text: "Initial check-in. Student cited financial stress as primary concern." },
    { id: "n5", author: "Dr. Priya Nair", timestamp: "2026-05-01T09:00:00", text: "Referred to bursary office. Application in progress." },
    { id: "n6", author: "James O'\''Connor", timestamp: "2026-07-22T15:00:00", text: "Enrolled in supplemental classes. Attendance improving." },
  ],
  "STU-1006": [
    { id: "n7", author: "James O'\''Connor", timestamp: "2026-06-18T13:00:00", text: "Started weekly study group. Student showing gradual improvement." },
  ],
  "STU-1008": [
    { id: "n8", author: "Dr. Priya Nair", timestamp: "2026-03-11T09:30:00", text: "Student did not respond to first outreach attempt. Will escalate next week." },
    { id: "n9", author: "Sarah Kim", timestamp: "2026-04-01T10:00:00", text: "Second attempt via email no response. Flagged for escalation to academic dean." },
  ],
  "STU-1009": [
    { id: "n10", author: "James O'\''Connor", timestamp: "2026-07-02T11:00:00", text: "Preventive tutoring referral completed. Student performing within safe zone now." },
  ],
  "STU-1010": [
    { id: "n11", author: "Dr. Priya Nair", timestamp: "2026-08-01T14:00:00", text: "First check-in scheduled for next week. Student aware of appointment." },
  ],
};

export const INTERVENTION_DATA = BASE_STUDENTS.map((s) => ({
  ...s,
  intervention_status: deriveStatus(s),
  assigned_mentor: deriveMentor(s),
  mentor_notes: SEED_NOTES[s.student_id] || [],
  last_updated: s.interventions.length
    ? s.interventions[s.interventions.length - 1].date
    : null,
}));
