// Mock data for the Bias & Privacy Audit page.
// All fairness metrics are fabricated for demo purposes.
// Replace with real model-evaluation outputs when the backend is ready.

// ─── Fairness metrics ────────────────────────────────────────────────────────
// Keyed by demographic attribute id. Each entry has an `overall` row plus one
// row per group. Metrics: recall, fnr (false negative rate), fpr (false positive
// rate), selectionRate (% flagged as at-risk).

export const FAIRNESS_ATTRIBUTES = [
  { id: "gender",     label: "Gender" },
  { id: "category",  label: "Category / Reservation" },
  { id: "region",    label: "Region" },
  { id: "age_band",  label: "Age Band at Enrollment" },
];

// threshold: any metric that deviates from the overall by more than this gets flagged
export const FLAG_THRESHOLD = 0.10;

export const FAIRNESS_DATA = {
  gender: {
    overall: { group: "Overall", recall: 0.82, fnr: 0.18, fpr: 0.11, selectionRate: 0.34, n: 10 },
    groups: [
      { group: "Female", recall: 0.85, fnr: 0.15, fpr: 0.09, selectionRate: 0.31, n: 4 },
      { group: "Male",   recall: 0.79, fnr: 0.21, fpr: 0.13, selectionRate: 0.37, n: 6 },
    ],
  },
  category: {
    overall: { group: "Overall", recall: 0.82, fnr: 0.18, fpr: 0.11, selectionRate: 0.34, n: 10 },
    groups: [
      { group: "General",    recall: 0.87, fnr: 0.13, fpr: 0.08, selectionRate: 0.28, n: 5 },
      { group: "Reserved",   recall: 0.74, fnr: 0.26, fpr: 0.16, selectionRate: 0.42, n: 3 },
      { group: "Scholarship",recall: 0.83, fnr: 0.17, fpr: 0.10, selectionRate: 0.33, n: 2 },
    ],
  },
  region: {
    overall: { group: "Overall", recall: 0.82, fnr: 0.18, fpr: 0.11, selectionRate: 0.34, n: 10 },
    groups: [
      { group: "Urban",    recall: 0.86, fnr: 0.14, fpr: 0.09, selectionRate: 0.30, n: 6 },
      { group: "Semi-Urban", recall: 0.78, fnr: 0.22, fpr: 0.14, selectionRate: 0.38, n: 3 },
      { group: "Rural",    recall: 0.70, fnr: 0.30, fpr: 0.18, selectionRate: 0.45, n: 1 },
    ],
  },
  age_band: {
    overall: { group: "Overall", recall: 0.82, fnr: 0.18, fpr: 0.11, selectionRate: 0.34, n: 10 },
    groups: [
      { group: "17-19", recall: 0.84, fnr: 0.16, fpr: 0.10, selectionRate: 0.32, n: 4 },
      { group: "20-22", recall: 0.81, fnr: 0.19, fpr: 0.12, selectionRate: 0.35, n: 4 },
      { group: "23+",   recall: 0.76, fnr: 0.24, fpr: 0.15, selectionRate: 0.40, n: 2 },
    ],
  },
};

// ─── Feature influence ───────────────────────────────────────────────────────
export const FEATURE_INFLUENCE = [
  { feature: "Admission grade",           sensitive: false, usedInModel: true,  auditOnly: false },
  { feature: "Approval rate (sem 1 & 2)", sensitive: false, usedInModel: true,  auditOnly: false },
  { feature: "Failed curricular units",   sensitive: false, usedInModel: true,  auditOnly: false },
  { feature: "Attendance percentage",     sensitive: false, usedInModel: true,  auditOnly: false },
  { feature: "Tuition fees up to date",   sensitive: false, usedInModel: true,  auditOnly: false },
  { feature: "Scholarship holder",        sensitive: true,  usedInModel: false, auditOnly: true  },
  { feature: "Gender",                    sensitive: true,  usedInModel: false, auditOnly: true  },
  { feature: "Category / Reservation",    sensitive: true,  usedInModel: false, auditOnly: true  },
  { feature: "Age at enrollment",         sensitive: true,  usedInModel: false, auditOnly: true  },
  { feature: "Region",                    sensitive: true,  usedInModel: false, auditOnly: true  },
];

// ─── Data access log ─────────────────────────────────────────────────────────
export const ACCESS_LOG = [
  { id: "al-001", timestamp: "2026-08-17T09:02:11", user: "Dr. Priya Nair",  role: "Mentor", action: "Viewed Student",    studentId: "STU-1002" },
  { id: "al-002", timestamp: "2026-08-17T09:15:44", user: "James O'Connor", role: "Mentor", action: "Added Note",         studentId: "STU-1006" },
  { id: "al-003", timestamp: "2026-08-17T10:31:00", user: "Admin",          role: "Admin",  action: "Exported Report",    studentId: null        },
  { id: "al-004", timestamp: "2026-08-17T11:05:22", user: "Dr. Priya Nair",  role: "Mentor", action: "Viewed Student",    studentId: "STU-1008" },
  { id: "al-005", timestamp: "2026-08-17T11:47:55", user: "Sarah Kim",      role: "Mentor", action: "Updated Status",     studentId: "STU-1003" },
  { id: "al-006", timestamp: "2026-08-17T12:00:03", user: "Admin",          role: "Admin",  action: "Viewed Audit Page",  studentId: null        },
  { id: "al-007", timestamp: "2026-08-17T13:22:41", user: "James O'Connor", role: "Mentor", action: "Viewed Student",    studentId: "STU-1004" },
  { id: "al-008", timestamp: "2026-08-17T14:08:19", user: "Dr. Priya Nair",  role: "Mentor", action: "Added Note",         studentId: "STU-1010" },
  { id: "al-009", timestamp: "2026-08-17T14:55:07", user: "Admin",          role: "Admin",  action: "Exported Report",    studentId: null        },
  { id: "al-010", timestamp: "2026-08-17T15:10:33", user: "Sarah Kim",      role: "Mentor", action: "Viewed Student",    studentId: "STU-1009" },
  { id: "al-011", timestamp: "2026-08-16T08:44:12", user: "Dr. Priya Nair",  role: "Mentor", action: "Viewed Student",    studentId: "STU-1002" },
  { id: "al-012", timestamp: "2026-08-16T09:30:00", user: "Admin",          role: "Admin",  action: "Updated Privacy Doc",studentId: null        },
  { id: "al-013", timestamp: "2026-08-16T10:15:48", user: "James O'Connor", role: "Mentor", action: "Updated Status",     studentId: "STU-1006" },
  { id: "al-014", timestamp: "2026-08-16T11:00:22", user: "Sarah Kim",      role: "Mentor", action: "Added Note",         studentId: "STU-1004" },
  { id: "al-015", timestamp: "2026-08-15T14:22:05", user: "Admin",          role: "Admin",  action: "Exported Report",    studentId: null        },
];

// ─── Privacy documentation (editable placeholder) ────────────────────────────
export const DEFAULT_PRIVACY_DOC = `**What data is collected**
We collect academic performance records (marks, approval rates, unit enrolments), attendance percentages, financial status (tuition fees up-to-date, scholarship holder), and demographic attributes (age at enrolment). Student names and IDs are used internally and never shared externally.

**Why it is collected (Purpose Limitation)**
Data is used solely to identify students at risk of dropping out early enough for timely mentor intervention. It is not used for ranking, grading, disciplinary action, or any purpose beyond early-warning support.

**Who can access it**
- Mentors: can view assigned students, add notes, and update intervention status.
- Admins: full access including audit logs, fairness metrics, and privacy documentation.
- No external parties have access to individual student records.

**Data retention**
Student records are retained for the duration of enrolment plus 2 years post-graduation, in line with institutional data policy. Intervention notes are retained for 5 years. Access logs are retained for 3 years.

**Model transparency**
The dropout probability score is generated by a machine learning model trained on anonymised historical enrolment data. Protected attributes (gender, category, region) are NOT used as model inputs. They are available only to admins for fairness auditing.`;
