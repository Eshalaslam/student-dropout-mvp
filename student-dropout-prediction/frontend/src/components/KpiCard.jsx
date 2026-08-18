export default function KpiCard({ label, value, sublabel, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm hover:border-slate-300 transition-all">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1.5">{label}</div>
      <div className={`text-2xl font-semibold font-mono tabular-nums ${accent || "text-slate-900"}`}>{value}</div>
      {sublabel && <div className="text-xs text-slate-400 mt-1">{sublabel}</div>}
    </div>
  );
}
