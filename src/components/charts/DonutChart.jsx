/**
 * DonutChart — category breakdown donut with center label and legend.
 * slices: [{ label, value, color }]
 * total: string to render in the center (e.g. "$3,284")
 */
export default function DonutChart({ slices = [], total = '' }) {
  const size = 130;
  const stroke = 16;
  const r = 50;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r; // 314.16

  const sum = slices.reduce((acc, s) => acc + s.value, 0) || 1;

  let cumulative = 0;
  const segments = slices.map((s, i) => {
    const len = (s.value / sum) * circumference;
    const offset = -cumulative;
    const seg = {
      ...s,
      pct: Math.round((s.value / sum) * 100),
      dasharray: `${len} ${circumference}`,
      dashoffset: offset,
      delay: `${i * 0.1}s`
    };
    cumulative += len;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <div className="donut-chart-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              className="donut-slice"
              style={{ animationDelay: seg.delay }}
            />
          ))}
        </svg>
        <div className="donut-center">
          <div className="donut-total">{total}</div>
          <div className="donut-label">Total</div>
        </div>
      </div>
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="legend-row">
            <span className="legend-dot" style={{ background: seg.color }} />
            <span className="legend-label">{seg.label}</span>
            <span className="legend-val">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
