// Mock data — matches MOCK_DATA.json / DATA_DICTIONARY.md shape.
// Fields not from the UCI dataset (name, department, attendance, interventions)
// are simulated for the demo and tagged in the UI with <SimTag />.
//
// age_at_enrollment, scholarship_holder, and tuition_fees_up_to_date are real
// UCI "Predict students' dropout and academic success" fields, added here to
// support the student profile section.

const DATA = [
  { student_id: "STU-1001", student_name: "Ana Torres", department: "Computer Science", semester: 2, admission_grade: 152.3, age_at_enrollment: 18, scholarship_holder: true, tuition_fees_up_to_date: true, curricular_units_1st_sem_enrolled: 6, curricular_units_1st_sem_approved: 5, curricular_units_2nd_sem_enrolled: 6, curricular_units_2nd_sem_approved: 6, curricular_units_failed: 1, approval_rate: 0.92, attendance_percentage: 94, dropout_probability: 0.08, risk_category: "Low",
    risk_factors: [ { factor: "Strong admission grade", tier: "moderate", direction: "protective" }, { factor: "High approval rate across semesters", tier: "major", direction: "protective" } ],
    interventions: [] },
  { student_id: "STU-1002", student_name: "Marco Silva", department: "Mechanical Engineering", semester: 3, admission_grade: 118.7, age_at_enrollment: 22, scholarship_holder: false, tuition_fees_up_to_date: true, curricular_units_1st_sem_enrolled: 6, curricular_units_1st_sem_approved: 3, curricular_units_2nd_sem_enrolled: 6, curricular_units_2nd_sem_approved: 2, curricular_units_failed: 7, approval_rate: 0.42, attendance_percentage: 61, dropout_probability: 0.81, risk_category: "High",
    risk_factors: [ { factor: "High number of failed curricular units", tier: "major", direction: "risk" }, { factor: "Low approval rate in both semesters", tier: "major", direction: "risk" }, { factor: "Low admission grade", tier: "moderate", direction: "risk" } ],
    interventions: [
      { type: "Academic tutoring referral", date: "2026-06-02", notes: "Referred to peer tutoring for core courses.", status: "In Progress", mentor_name: "Dr. Priya Nair" },
      { type: "Counseling call", date: "2026-07-10", notes: "Discussed workload stress; follow-up in 2 weeks.", status: "Open", mentor_name: "Dr. Priya Nair" },
    ] },
  { student_id: "STU-1003", student_name: "Beatriz Costa", department: "Business Administration", semester: 1, admission_grade: 134.0, age_at_enrollment: 20, scholarship_holder: false, tuition_fees_up_to_date: false, curricular_units_1st_sem_enrolled: 5, curricular_units_1st_sem_approved: 4, curricular_units_2nd_sem_enrolled: 5, curricular_units_2nd_sem_approved: 3, curricular_units_failed: 3, approval_rate: 0.70, attendance_percentage: 78, dropout_probability: 0.47, risk_category: "Medium",
    risk_factors: [ { factor: "Declining approval rate from 1st to 2nd semester", tier: "moderate", direction: "risk" }, { factor: "Attendance below cohort average", tier: "moderate", direction: "risk" }, { factor: "Reasonable admission grade", tier: "moderate", direction: "protective" } ],
    interventions: [ { type: "Financial aid referral", date: "2026-05-20", notes: "Applied for emergency bursary.", status: "Resolved", mentor_name: "James O'Connor" } ] },
  { student_id: "STU-1004", student_name: "Diego Fernandes", department: "Computer Science", semester: 4, admission_grade: 109.5, age_at_enrollment: 23, scholarship_holder: false, tuition_fees_up_to_date: false, curricular_units_1st_sem_enrolled: 6, curricular_units_1st_sem_approved: 2, curricular_units_2nd_sem_enrolled: 6, curricular_units_2nd_sem_approved: 1, curricular_units_failed: 9, approval_rate: 0.25, attendance_percentage: 48, dropout_probability: 0.89, risk_category: "High",
    risk_factors: [ { factor: "Very low approval rate across both semesters", tier: "major", direction: "risk" }, { factor: "Low attendance", tier: "major", direction: "risk" }, { factor: "Tuition fees not up to date", tier: "moderate", direction: "risk" } ],
    interventions: [
      { type: "Counseling call", date: "2026-04-15", notes: "Initial check-in, student cited financial stress.", status: "Resolved", mentor_name: "Dr. Priya Nair" },
      { type: "Financial aid referral", date: "2026-05-01", notes: "Referred to bursary office.", status: "Resolved", mentor_name: "Dr. Priya Nair" },
      { type: "Academic tutoring referral", date: "2026-07-22", notes: "Enrolled in supplemental classes.", status: "In Progress", mentor_name: "James O'Connor" },
    ] },
  { student_id: "STU-1005", student_name: "Sofia Almeida", department: "Nursing", semester: 2, admission_grade: 145.8, age_at_enrollment: 19, scholarship_holder: true, tuition_fees_up_to_date: true, curricular_units_1st_sem_enrolled: 6, curricular_units_1st_sem_approved: 6, curricular_units_2nd_sem_enrolled: 6, curricular_units_2nd_sem_approved: 6, curricular_units_failed: 0, approval_rate: 1.0, attendance_percentage: 97, dropout_probability: 0.03, risk_category: "Low",
    risk_factors: [ { factor: "Perfect approval rate", tier: "major", direction: "protective" }, { factor: "High attendance", tier: "moderate", direction: "protective" } ],
    interventions: [] },
  { student_id: "STU-1006", student_name: "Rui Pereira", department: "Mechanical Engineering", semester: 3, admission_grade: 126.2, age_at_enrollment: 21, scholarship_holder: false, tuition_fees_up_to_date: true, curricular_units_1st_sem_enrolled: 6, curricular_units_1st_sem_approved: 4, curricular_units_2nd_sem_enrolled: 6, curricular_units_2nd_sem_approved: 4, curricular_units_failed: 4, approval_rate: 0.67, attendance_percentage: 73, dropout_probability: 0.52, risk_category: "Medium",
    risk_factors: [ { factor: "Moderate number of failed units", tier: "moderate", direction: "risk" }, { factor: "Attendance slightly below average", tier: "moderate", direction: "risk" } ],
    interventions: [ { type: "Academic tutoring referral", date: "2026-06-18", notes: "Started weekly study group.", status: "In Progress", mentor_name: "James O'Connor" } ] },
  { student_id: "STU-1007", student_name: "Ines Rodrigues", department: "Business Administration", semester: 1, admission_grade: 141.0, age_at_enrollment: 18, scholarship_holder: true, tuition_fees_up_to_date: true, curricular_units_1st_sem_enrolled: 5, curricular_units_1st_sem_approved: 5, curricular_units_2nd_sem_enrolled: 5, curricular_units_2nd_sem_approved: 5, curricular_units_failed: 0, approval_rate: 1.0, attendance_percentage: 91, dropout_probability: 0.06, risk_category: "Low",
    risk_factors: [ { factor: "Full approval rate", tier: "major", direction: "protective" }, { factor: "Strong admission grade", tier: "moderate", direction: "protective" } ],
    interventions: [] },
  { student_id: "STU-1008", student_name: "Tiago Martins", department: "Computer Science", semester: 4, admission_grade: 98.4, age_at_enrollment: 24, scholarship_holder: false, tuition_fees_up_to_date: false, curricular_units_1st_sem_enrolled: 6, curricular_units_1st_sem_approved: 1, curricular_units_2nd_sem_enrolled: 5, curricular_units_2nd_sem_approved: 0, curricular_units_failed: 10, approval_rate: 0.09, attendance_percentage: 32, dropout_probability: 0.94, risk_category: "High",
    risk_factors: [ { factor: "Almost no approved units across two semesters", tier: "major", direction: "risk" }, { factor: "Very low attendance", tier: "major", direction: "risk" }, { factor: "Low admission grade", tier: "moderate", direction: "risk" } ],
    interventions: [ { type: "Counseling call", date: "2026-03-11", notes: "Student unresponsive to first outreach.", status: "Open", mentor_name: "Dr. Priya Nair" } ] },
  { student_id: "STU-1009", student_name: "Carla Nogueira", department: "Nursing", semester: 2, admission_grade: 130.6, age_at_enrollment: 20, scholarship_holder: true, tuition_fees_up_to_date: true, curricular_units_1st_sem_enrolled: 6, curricular_units_1st_sem_approved: 5, curricular_units_2nd_sem_enrolled: 6, curricular_units_2nd_sem_approved: 4, curricular_units_failed: 3, approval_rate: 0.75, attendance_percentage: 82, dropout_probability: 0.38, risk_category: "Medium",
    risk_factors: [ { factor: "Slight drop in approved units in 2nd semester", tier: "moderate", direction: "risk" }, { factor: "Attendance close to cohort average", tier: "moderate", direction: "protective" } ],
    interventions: [ { type: "Academic tutoring referral", date: "2026-07-02", notes: "Preventive referral, not yet flagged high risk.", status: "Resolved", mentor_name: "James O'Connor" } ] },
  { student_id: "STU-1010", student_name: "Paulo Ramos", department: "Mechanical Engineering", semester: 1, admission_grade: 112.9, age_at_enrollment: 19, scholarship_holder: false, tuition_fees_up_to_date: true, curricular_units_1st_sem_enrolled: 6, curricular_units_1st_sem_approved: 3, curricular_units_2nd_sem_enrolled: 6, curricular_units_2nd_sem_approved: 3, curricular_units_failed: 6, approval_rate: 0.50, attendance_percentage: 69, dropout_probability: 0.63, risk_category: "High",
    risk_factors: [ { factor: "Half of enrolled units failed", tier: "major", direction: "risk" }, { factor: "Below-average attendance", tier: "moderate", direction: "risk" } ],
    interventions: [ { type: "Counseling call", date: "2026-08-01", notes: "Scheduled first check-in.", status: "Open", mentor_name: "Dr. Priya Nair" } ] },
];

export default DATA;
