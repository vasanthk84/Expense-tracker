/**
 * LineChart — monthly trend.
 * data: [{ label, value }]
 * Automatically scales Y. Renders area fill, dashed gridlines, and points.
 * `highlightIndex` — if set, draws a dashed vertical and a tooltip.
 */
export default function LineChart({
  data = [],
  width = 320,
  height = 170,
  highlightIndex,
  tooltipLabel,
  tooltipValue,
  gradientId = 'lineAreaGrad'
}) {
  if (!data.length) return null;

  const padBottom = 20; // space for labels
  const chartTop = 0;
  const chartBottom = height - 30;
  const chartHeight = chartBottom - chartTop;

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;

  // Add headroom so points aren't against the top
  const scaleY = (v) =>
    chartBottom - ((v - min) / range) * (chartHeight - 20) - 10;

  const scaleX = (i) => (i / (data.length - 1)) * width;

  const points = data.map((d, i) => ({
    x: scaleX(i),
    y: scaleY(d.value),
    label: d.label,
    value: d.value
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
    .join(' ');

  const areaD = `${pathD} L ${width},${height - padBottom} L 0,${height - padBottom} Z`;

  const hi = highlightIndex != null ? points[highlightIndex] : null;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Gridlines */}
      <g stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4">
        <line x1="0" y1={chartHeight * 0.25} x2={width} y2={chartHeight * 0.25} />
        <line x1="0" y1={chartHeight * 0.5}  x2={width} y2={chartHeight * 0.5} />
        <line x1="0" y1={chartHeight * 0.75} x2={width} y2={chartHeight * 0.75} />
      </g>

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="line-draw"
      />

      {/* Points */}
      <g fill="var(--surface)" stroke="var(--primary)" strokeWidth="2">
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4 : 3}
            fill={i === points.length - 1 ? 'var(--primary)' : 'var(--surface)'}
          />
        ))}
      </g>

      {/* Tooltip */}
      {hi && (
        <g>
          <line
            x1={hi.x}
            y1={0}
            x2={hi.x}
            y2={height - padBottom}
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <rect
            x={hi.x - 38}
            y={20}
            width="76"
            height="30"
            rx="6"
            fill="var(--ink)"
          />
          <text
            x={hi.x}
            y={32}
            textAnchor="middle"
            fill="var(--bg)"
            fontSize="9"
            fontFamily="JetBrains Mono"
          >
            {tooltipLabel || hi.label.toUpperCase()}
          </text>
          <text
            x={hi.x}
            y={44}
            textAnchor="middle"
            fill="var(--bg)"
            fontSize="11"
            fontFamily="Fraunces"
            fontWeight="600"
          >
            {tooltipValue || `$${hi.value.toLocaleString()}`}
          </text>
        </g>
      )}

      {/* X labels */}
      <g fill="var(--ink-3)" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - 10}>
            {p.label.toUpperCase()}
          </text>
        ))}
      </g>
    </svg>
  );
}
