# Student List & Student Details — Dev B

## Structure
```
src/
  data/mockStudents.js     mock data, matches MOCK_DATA.json / DATA_DICTIONARY.md
  components/               RiskBadge, StatusPill, FactorBar, SimTag, StudentTable
  pages/StudentList.jsx     search + filter + sort + table
  pages/StudentDetails.jsx  3 tabs: Overview / Why-at-risk / Interventions
  App.jsx                   demo shell — swap for your real router
```

## Requirements
- React
- `lucide-react` (icons)
- Tailwind CSS configured in the project (uses core utility classes only)

## Next step
Replace `src/data/mockStudents.js` with a real API call once the backend is ready.
Keep the same student object shape so nothing downstream needs to change.
`RiskBadge`, `StatusPill`, and `StudentTable` are written to be reused by the
Dashboard page too (Dev A) — don't duplicate them.
