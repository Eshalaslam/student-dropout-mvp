// Renders one SHAP-derived risk/protective factor as a directional bar.
// factor: { factor: string, tier: "major" | "moderate", direction: "risk" | "protective" }
export default function FactorBar({ factor }) {
  const isProtective = factor.direction === "protective";
  const magnitude = factor.tier === "major" ? 100 : 55;
  const barColor = isProtective ? "bg-emerald-500" : factor.tier === "major" ? "bg-rose-500" : "bg-amber-500";
  const labelColor = isProtective ? "text-emerald-600" : factor.tier === "major" ? "text-rose-600" : "text-amber-600";
  const label = isProtective ? "Protective" : factor.tier === "major" ? "Major risk" : "Moderate risk";

  return (
    <div className="py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between mb-1.5 gap-3">
        <span className="text-sm text-slate-700">{factor.factor}</span>
        <span className={`text-xs font-mono uppercase tracking-wide whitespace-nowrap ${labelColor}`}>{label}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${magnitude}%` }} />
      </div>
    </div>
  );
}
