// Generic progress bar. `value`/`max` define the fill percentage.
export default function ProgressBar({ value, max = 100, color = "bg-teal-500", trackColor = "bg-slate-100", height = "h-1.5" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`w-full ${height} ${trackColor} rounded-full overflow-hidden`}>
      <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}
