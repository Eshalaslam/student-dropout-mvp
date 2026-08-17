// Responsive SVG donut chart. Pass segments as [{ label, value, color }].
// No external chart library — plain SVG circles using stroke-dasharray.
export default function DonutChart({ segments, size = 148, strokeWidth = 20 }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="flex-shrink-0 -rotate-90"
        role="img"
        aria-label="Risk distribution donut chart"
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const fraction = s.value / total;
              const dash = fraction * circumference;
              const el = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += dash;
              return el;
            })}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
          className="fill-slate-800"
          style={{ fontSize: 22, fontWeight: 600, fontFamily: "ui-monospace, monospace" }}
        >
          {total}
        </text>
      </svg>
      <div className="space-y-2 min-w-[120px]">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="font-mono text-slate-400 text-xs ml-auto pl-2">
              {s.value} · {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
