export function RiskLight({ level }) {
  const colors = { High: "bg-rose-500", Medium: "bg-amber-500", Low: "bg-emerald-500" };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[level]} ${
        level === "High" ? "animate-pulse ring-2 ring-rose-200" : ""
      }`}
    />
  );
}

export default function RiskBadge({ level, probability }) {
  const styles = {
    High: "bg-rose-50 text-rose-700 border-rose-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-semibold ${styles[level]}`}>
      <RiskLight level={level} />
      {level}
      <span className="font-mono tabular-nums text-xs opacity-70">{Math.round(probability * 100)}%</span>
    </span>
  );
}
