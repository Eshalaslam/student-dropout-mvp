// Responsive SVG horizontal bar chart. Pass items as
// [{ label, value, displayValue?, color? }]. No external chart library —
// each row is a tiny SVG rect scaled with a viewBox, so it stays responsive
// at any container width without distorting text (labels render as HTML).
export default function BarChart({ items, barColor = "#0f766e" }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-3 text-xs mb-1">
            <span className="text-slate-600 font-medium truncate">{item.label}</span>
            <span className="font-mono text-slate-400 whitespace-nowrap">{item.displayValue ?? item.value}</span>
          </div>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="w-full h-2" role="img" aria-label={`${item.label}: ${item.displayValue ?? item.value}`}>
            <rect x="0" y="0" width="100" height="8" rx="4" fill="#f1f5f9" />
            <rect x="0" y="0" width={Math.max(2, (item.value / max) * 100)} height="8" rx="4" fill={item.color || barColor} />
          </svg>
        </div>
      ))}
    </div>
  );
}
