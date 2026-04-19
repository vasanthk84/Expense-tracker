/**
 * LineChart — monthly trend.
 * Fixes: smooth curves, proper preserveAspectRatio, interactive tooltip, label thinning.
 */
import { useRef, useState, useCallback } from 'react';

function smoothPath(points) {
  if (points.length < 2) return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cp1x = points[i].x + (points[i + 1].x - points[i].x) * 0.45;
    const cp1y = points[i].y;
    const cp2x = points[i + 1].x - (points[i + 1].x - points[i].x) * 0.45;
    const cp2y = points[i + 1].y;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${points[i + 1].x},${points[i + 1].y}`;
  }
  return d;
}

export default function LineChart({
  data = [],
  width = 320,
  height = 170,
  highlightIndex,
  tooltipLabel,
  tooltipValue,
  gradientId = 'lineAreaGrad'
}) {
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!data.length) return null;

  const padBottom = 30;
  const chartBottom = height - padBottom;
  const chartHeight = chartBottom;

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;

  const scaleY = (v) => chartBottom - ((v - min) / range) * (chartHeight - 24) - 12;
  const scaleX = (i) => (i / (data.length - 1)) * width;

  const points = data.map((d, i) => ({
    x: scaleX(i),
    y: scaleY(d.value),
    label: d.label,
    value: d.value,
  }));

  const pathD = smoothPath(points);
  const areaD = `${pathD} L${width},${height - padBottom} L0,${height - padBottom} Z`;

  // Active index: hover/touch overrides highlightIndex
  const activeIdx = hoverIdx ?? highlightIndex;
  const hi = activeIdx != null ? points[activeIdx] : null;

  // Hit-area handler: find nearest point by x position
  const handlePointer = useCallback((clientX) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - svgX);
      if (d < minDist) { minDist = d; nearest = i; }
    });
    setHoverIdx(nearest);
  }, [points, width]);

  // Label thinning: show every Nth label to avoid overlap
  const labelStep = data.length > 10 ? 3 : data.length > 6 ? 2 : 1;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', overflow: 'visible' }}
      onMouseMove={(e) => handlePointer(e.clientX)}
      onMouseLeave={() => setHoverIdx(null)}
      onTouchMove={(e) => { e.preventDefault(); handlePointer(e.touches[0].clientX); }}
      onTouchEnd={() => setHoverIdx(null)}
    >
      {/* Gridlines */}
      <g stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4">
        <line x1="0" y1={chartHeight * 0.25} x2={width} y2={chartHeight * 0.25} />
        <line x1="0" y1={chartHeight * 0.5}  x2={width} y2={chartHeight * 0.5} />
        <line x1="0" y1={chartHeight * 0.75} x2={width} y2={chartHeight * 0.75} />
      </g>

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--primary)" stopOpacity="0.18" />
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
            r={i === activeIdx ? 5 : i === points.length - 1 ? 4 : 3}
            fill={i === points.length - 1 || i === activeIdx ? 'var(--primary)' : 'var(--surface)'}
            style={{ transition: 'r 0.1s ease' }}
          />
        ))}
      </g>

      {/* Tooltip — follows hover/touch */}
      {hi && (
        <g>
          <line
            x1={hi.x} y1={0}
            x2={hi.x} y2={height - padBottom}
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          {/* Clamp tooltip box to stay within SVG bounds */}
          <rect
            x={Math.min(Math.max(hi.x - 38, 0), width - 76)}
            y={20}
            width="76"
            height="30"
            rx="6"
            fill="var(--ink)"
          />
          <text
            x={Math.min(Math.max(hi.x, 38), width - 38)}
            y={32}
            textAnchor="middle"
            fill="var(--bg)"
            fontSize="9"
            fontFamily="JetBrains Mono"
          >
            {(activeIdx === highlightIndex && tooltipLabel) || hi.label.toUpperCase()}
          </text>
          <text
            x={Math.min(Math.max(hi.x, 38), width - 38)}
            y={44}
            textAnchor="middle"
            fill="var(--bg)"
            fontSize="11"
            fontFamily="Fraunces"
            fontWeight="600"
          >
            {(activeIdx === highlightIndex && tooltipValue) || `$${hi.value.toLocaleString()}`}
          </text>
        </g>
      )}

      {/* X labels — thinned to prevent overlap */}
      <g fill="var(--ink-3)" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
        {points.map((p, i) => {
          if (i % labelStep !== 0 && i !== points.length - 1) return null;
          return (
            <text key={i} x={p.x} y={height - 8}>
              {p.label.toUpperCase()}
            </text>
          );
        })}
      </g>
    </svg>
  );
}