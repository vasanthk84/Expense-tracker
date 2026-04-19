/**
 * ForecastChart — actual (solid) + forecast (dashed) line with uncertainty band.
 * actual:   [{ label, value }]   — historical
 * forecast: [{ label, value }]   — projected, first point should match last actual
 * upper/lower (optional): [{ label, value }] uncertainty bounds for the forecast range
 */
export default function ForecastChart({
  actual = [],
  forecast = [],
  upper,
  lower,
  width = 320,
  height = 180
}) {
  if (!actual.length || !forecast.length) return null;

  const chartTop = 0;
  const chartBottom = 150;
  const chartHeight = chartBottom - chartTop;

  // Combine to determine scale
  const allValues = [
    ...actual.map((d) => d.value),
    ...forecast.map((d) => d.value),
    ...(upper?.map((d) => d.value) || []),
    ...(lower?.map((d) => d.value) || [])
  ];
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  const range = max - min || 1;

  const scaleY = (v) =>
    chartBottom - ((v - min) / range) * (chartHeight - 20) - 10;

  // X positions: actual spans first half, forecast the second
  const totalPoints = actual.length + forecast.length - 1; // -1 because they share the join point
  const scaleX = (i) => (i / totalPoints) * width;

  const actualPts = actual.map((d, i) => ({ x: scaleX(i), y: scaleY(d.value), label: d.label }));
  const joinIndex = actual.length - 1;
  const forecastPts = forecast.map((d, i) => ({
    x: scaleX(joinIndex + i),
    y: scaleY(d.value),
    label: d.label
  }));

  const upperPts = upper?.map((d, i) => ({ x: scaleX(joinIndex + i), y: scaleY(d.value) }));
  const lowerPts = lower?.map((d, i) => ({ x: scaleX(joinIndex + i), y: scaleY(d.value) }));

  const pathFrom = (pts) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  const actualPath = pathFrom(actualPts);
  const forecastPath = pathFrom(forecastPts);

  // Area under forecast
  const lastFp = forecastPts[forecastPts.length - 1];
  const firstFp = forecastPts[0];
  const areaD = `${forecastPath} L ${lastFp.x},${height - 30} L ${firstFp.x},${height - 30} Z`;

  // X-axis labels: show every other from combined set
  const allLabels = [...actual.map((d) => d.label), ...forecast.slice(1).map((d) => d.label)];
  const labelPositions = allLabels.map((label, i) => ({
    label,
    x: scaleX(i)
  }));

  const nowX = forecastPts[0].x;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Gridlines */}
      <g stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4">
        <line x1="0" y1="40"  x2={width} y2="40" />
        <line x1="0" y1="90"  x2={width} y2="90" />
        <line x1="0" y1="140" x2={width} y2="140" />
      </g>

      {/* NOW divider */}
      <line x1={nowX} y1="0" x2={nowX} y2={height - 10} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2 3" />
      <text x={nowX} y="12" textAnchor="middle" fill="var(--ink-3)" fontSize="9" fontFamily="JetBrains Mono">
        NOW
      </text>

      <defs>
        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Forecast area */}
      <path d={areaD} fill="url(#forecastGrad)" />

      {/* Uncertainty bands */}
      {upperPts && (
        <path
          d={pathFrom(upperPts)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.5"
        />
      )}
      {lowerPts && (
        <path
          d={pathFrom(lowerPts)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.5"
        />
      )}

      {/* Actual line */}
      <path
        d={actualPath}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="line-draw"
      />

      {/* Forecast line */}
      <path
        d={forecastPath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 4"
      />

      {/* Actual points */}
      <g fill="var(--surface)" stroke="var(--primary)" strokeWidth="2">
        {actualPts.map((p, i) => (
          <circle key={`a-${i}`} cx={p.x} cy={p.y} r="3" />
        ))}
      </g>

      {/* Forecast points */}
      <g fill="var(--surface)" stroke="var(--accent)" strokeWidth="2">
        {forecastPts.slice(1).map((p, i) => (
          <circle
            key={`f-${i}`}
            cx={p.x}
            cy={p.y}
            r={i === forecastPts.length - 2 ? 4 : 3}
            fill={i === forecastPts.length - 2 ? 'var(--accent)' : 'var(--surface)'}
          />
        ))}
      </g>

      {/* X labels — show every 2nd */}
      <g fill="var(--ink-3)" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
        {labelPositions.filter((_, i) => i % 2 === 0).map((p, i) => (
          <text key={i} x={p.x} y={height - 20}>
            {p.label.toUpperCase()}
          </text>
        ))}
      </g>
    </svg>
  );
}
