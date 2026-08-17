// Mock data for the Reports page.
// Replace with real API calls once the backend is ready.
// All filtering logic is kept in the page component so role-scoping can be
// added later by passing a `currentUser` prop and filtering before display.

// ─── Report history ──────────────────────────────────────────────────────────
export const REPORT_HISTORY = [
  { id: "rpt-001", name: "At-Risk Students — Aug 2026",        type: "at-risk",      generatedBy: "Dr. Priya Nair",  date: "2026-08-15T10:22:00", size: "14 KB" },
  { id: "rpt-002", name: "Intervention Progress — Q2 2026",    type: "intervention", generatedBy: "Admin",           date: "2026-08-10T09:05:00", size: "22 KB" },
  { id: "rpt-003", name: "Department Risk Trend — Sem 2",      type: "dept-trend",   generatedBy: "James O'\''Connor", date: "2026-08-07T14:30:00", size: "18 KB" },
  { id: "rpt-004", name: "Full Audit Report — Aug 2026",       type: "audit",        generatedBy: "Admin",           date: "2026-08-05T11:00:00", size: "35 KB" },
  { id: "rpt-005", name: "At-Risk Students — Jul 2026",        type: "at-risk",      generatedBy: "Sarah Kim",       date: "2026-07-31T08:45:00", size: "12 KB" },
  { id: "rpt-006", name: "Intervention Progress — Jul 2026",   type: "intervention", generatedBy: "Dr. Priya Nair",  date: "2026-07-28T16:10:00", size: "20 KB" },
  { id: "rpt-007", name: "Department Risk Trend — Sem 1",      type: "dept-trend",   generatedBy: "Admin",           date: "2026-07-15T13:00:00", size: "17 KB" },
];

// ─── Scheduled reports ────────────────────────────────────────────────────────
export const INITIAL_SCHEDULED = [
  { id: "sch-001", name: "Weekly At-Risk Summary", type: "at-risk",      frequency: "Weekly",  email: "admin@university.edu",      active: true  },
  { id: "sch-002", name: "Monthly Audit Digest",   type: "audit",        frequency: "Monthly", email: "compliance@university.edu", active: false },
];
