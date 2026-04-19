/**
 * BarChart — "this vs last" comparison, paired bars per category.
 * data: [{ label, current, previous, tone }]
 * tone: 'primary' (default) | 'accent' (for a given bar)
 */
export default function BarChart({ data = [], width = 320, height = 180 }) {
  if (!data.length) return null;

  const chartTop = 20;
  const chartBottom = 150;
  const chartHeight = chartBottom - chartTop;

  const max = Math.max(...data.flatMap((d) => [d.current, d.previous]));
  const scaleH = (v) => (v / max) * chartHeight;

  const barW = 14;
  const pairGap = 2;
  const pairW = barW * 2 + pairGap;
  const step = width / data.length;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Gridlines */}
      <g stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4">
        <line x1="0" y1="40"  x2={width} y2="40" />
        <line x1="0" y1="80"  x2={width} y2="80" />
        <line x1="0" y1="120" x2={width} y2="120" />
      </g>

      <g>
        {data.map((d, i) => {
          const currentH = scaleH(d.current);
          const previousH = scaleH(d.previous);
          const pairX = i * step + (step - pairW) / 2;
          const curX = pairX;
          const prevX = pairX + barW + pairGap;
          const curY = chartBottom - currentH;
          const prevY = chartBottom - previousH;
          const fill = d.tone === 'accent' ? 'var(--accent)' : 'var(--primary)';

          return (
            <g key={d.label}>
              <rect
                className="bar-rise"
                style={{ animationDelay: `${i * 0.1}s` }}
                x={curX}
                y={curY}
                width={barW}
                height={currentH}
                rx="3"
                fill={fill}
              />
              <rect
                className="bar-rise"
                style={{ animationDelay: `${i * 0.1 + 0.05}s` }}
                x={prevX}
                y={prevY}
                width={barW}
                height={previousH}
                rx="3"
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1.5"
              />
            </g>
          );
        })}
      </g>

      {/* X labels */}
      <g fill="var(--ink-3)" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
        {data.map((d, i) => (
          <text key={d.label} x={i * step + step / 2} y="168">
            {d.label.toUpperCase()}
          </text>
        ))}
      </g>
    </svg>
  );
}
