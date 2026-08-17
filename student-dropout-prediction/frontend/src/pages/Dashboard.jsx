import KpiCard from "../components/KpiCard";
import StudentTable from "../components/StudentTable";
import SimTag from "../components/SimTag";
import DonutChart from "../components/charts/DonutChart";
import BarChart from "../components/charts/BarChart";

const RISK_COLORS = { High: "#e11d48", Medium: "#d97706", Low: "#059669" }; // rose-600 / amber-600 / emerald-600

function pct(n, total) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

export default function Dashboard({ students, onSelect }) {
  const total = students.length;
  const counts = { High: 0, Medium: 0, Low: 0 };
  students.forEach((s) => (counts[s.risk_category] = (counts[s.risk_category] || 0) + 1));

  const allInterventions = students.flatMap((s) => s.interventions);
  const openCount = allInterventions.filter((iv) => iv.status === "Open").length;
  const inProgressCount = allInterventions.filter((iv) => iv.status === "In Progress").length;
  const activeCount = openCount + inProgressCount;

  // Risk by department — average predicted dropout probability, aggregated
  // from the mock cohort. `department` is a simulated demo field (see SimTag).
  const deptTotals = {};
  students.forEach((s) => {
    if (!deptTotals[s.department]) deptTotals[s.department] = { sum: 0, count: 0 };
    deptTotals[s.department].sum += s.dropout_probability;
    deptTotals[s.department].count += 1;
  });
  const deptItems = Object.entries(deptTotals)
    .map(([dept, { sum, count }]) => {
      const avgPct = Math.round((sum / count) * 100);
      return {
        label: dept,
        value: avgPct,
        displayValue: `${avgPct}%`,
        color: avgPct >= 60 ? RISK_COLORS.High : avgPct >= 35 ? RISK_COLORS.Medium : RISK_COLORS.Low,
      };
    })
    .sort((a, b) => b.value - a.value);

  // Top recurring risk factors across the cohort (risk-direction only).
  const factorCounts = {};
  students.forEach((s) => {
    s.risk_factors
      .filter((f) => f.direction === "risk")
      .forEach((f) => {
        factorCounts[f.factor] = (factorCounts[f.factor] || 0) + 1;
      });
  });
  const factorItems = Object.entries(factorCounts)
    .map(([factor, count]) => ({
      label: factor,
      value: count,
      displayValue: `${count} student${count === 1 ? "" : "s"}`,
      color: "#be123c",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const highRiskStudents = students
    .filter((s) => s.risk_category === "High")
    .sort((a, b) => b.dropout_probability - a.dropout_probability);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Cohort overview and prioritized outreach for mentors.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total students" value={total} />
        <KpiCard
          label="High risk"
          value={`${pct(counts.High, total)}%`}
          sublabel={`${counts.High} student${counts.High === 1 ? "" : "s"}`}
          accent="text-rose-600"
        />
        <KpiCard
          label="Medium risk"
          value={`${pct(counts.Medium, total)}%`}
          sublabel={`${counts.Medium} student${counts.Medium === 1 ? "" : "s"}`}
          accent="text-amber-600"
        />
        <KpiCard
          label="Low risk"
          value={`${pct(counts.Low, total)}%`}
          sublabel={`${counts.Low} student${counts.Low === 1 ? "" : "s"}`}
          accent="text-emerald-600"
        />
        <KpiCard
          label="Active interventions"
          value={activeCount}
          sublabel={`${openCount} open · ${inProgressCount} in progress`}
          accent="text-teal-700"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-medium text-slate-800 mb-1">Risk distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Share of cohort by predicted risk category.</p>
          <DonutChart
            segments={[
              { label: "High", value: counts.High, color: RISK_COLORS.High },
              { label: "Medium", value: counts.Medium, color: RISK_COLORS.Medium },
              { label: "Low", value: counts.Low, color: RISK_COLORS.Low },
            ]}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="text-sm font-medium text-slate-800">Risk by department</h3>
            <SimTag />
          </div>
          <p className="text-xs text-slate-400 mb-4">Avg. predicted dropout probability per department.</p>
          {deptItems.length > 0 ? (
            <BarChart items={deptItems} />
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">No department data available.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-medium text-slate-800 mb-1">Top recurring risk factors</h3>
          <p className="text-xs text-slate-400 mb-4">Most common risk factors across the cohort.</p>
          {factorItems.length > 0 ? (
            <BarChart items={factorItems} />
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">No risk factors logged.</p>
          )}
        </div>
      </div>

      {/* Prioritized high-risk students */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-medium text-slate-800">Prioritized outreach — high risk students</h2>
          <p className="text-xs text-slate-400 mt-0.5">Sorted by predicted dropout probability, highest first.</p>
        </div>
        {highRiskStudents.length > 0 ? (
          <StudentTable students={highRiskStudents} onSelect={onSelect} />
        ) : (
          <div className="border border-slate-200 rounded-md bg-white py-12 text-center text-sm text-slate-400">
            No high-risk students right now.
          </div>
        )}
      </div>
    </div>
  );
}
