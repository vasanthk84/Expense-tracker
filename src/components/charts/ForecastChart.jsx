import { useRef, useEffect, useState } from 'react';

/**
 * ForecastChart — clean area chart with smooth bezier curves.
 * actual:   [{ label, value }]  historical months
 * forecast: [{ label, value }]  projected months (first point = last actual)
 * upper/lower: optional band arrays (shown as soft fill, not extra lines)
 */
export default function ForecastChart({ actual = [], forecast = [], upper, lower }) {
  const containerRef = useRef(null);
  const [W, setW]    = useState(320);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w > 0) setW(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!actual.length || !forecast.length) return null;

  const H    = 200;
  const padL = 46;   // Y labels
  const padR = 14;
  const padT = 28;
  const padB = 28;   // X labels
  const cW   = W - padL - padR;
  const cH   = H - padT - padB;

  // Scale
  const allVals = [
    ...actual.map((d) => d.value),
    ...forecast.map((d) => d.value),
    ...(upper?.map((d) => d.value) || []),
  ];
  const maxVal  = Math.max(...allVals, 1) * 1.18;
  const scaleY  = (v) => padT + cH - (v / maxVal) * cH;

  const total  = actual.length + forecast.length - 1;
  const scaleX = (i) => padL + (i / Math.max(total - 1, 1)) * cW;

  const joinIdx = actual.length - 1;
  const aPts    = actual.map((d, i)   => ({ x: scaleX(i),          y: scaleY(d.value), label: d.label,  value: d.value }));
  const fPts    = forecast.map((d, i) => ({ x: scaleX(joinIdx + i), y: scaleY(d.value), label: d.label,  value: d.value }));

  // Smooth cubic bezier through points
  function curvePath(pts) {
    if (pts.length < 2) return `M ${pts[0]?.x ?? 0},${pts[0]?.y ?? 0}`;
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], c = pts[i];
      const dx = (c.x - p.x) * 0.45;
      d += ` C ${p.x + dx},${p.y} ${c.x - dx},${c.y} ${c.x},${c.y}`;
    }
    return d;
  }

  const aPath    = curvePath(aPts);
  const fPath    = curvePath(fPts);
  const baseline = padT + cH;

  // Area polygons
  const aArea  = `${aPath} L ${aPts[aPts.length - 1].x},${baseline} L ${aPts[0].x},${baseline} Z`;
  const fArea  = `${fPath} L ${fPts[fPts.length - 1].x},${baseline} L ${fPts[0].x},${baseline} Z`;

  // Uncertainty band (fill only, no extra lines)
  let bandArea = null;
  if (upper && lower && upper.length === forecast.length) {
    const uPts = upper.map((d, i) => ({ x: scaleX(joinIdx + i), y: scaleY(d.value) }));
    const lPts = lower.map((d, i) => ({ x: scaleX(joinIdx + i), y: scaleY(d.value) }));
    const uPath = curvePath(uPts);
    const lRev  = [...lPts].reverse();
    const lSeg  = lRev.map((p) => `L ${p.x},${p.y}`).join(' ');
    bandArea = `${uPath} ${lSeg} Z`;
  }

  // Y-axis guide values
  const yGuides = [0.25, 0.5, 0.75];
  const fmt     = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`;

  // X labels — actual: every other; forecast: first + last only
  const nowX  = fPts[0].x;
  const lastA = aPts[aPts.length - 1];
  const lastF = fPts[fPts.length - 1];

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        width="100%" height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="fcActualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fcForecastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yGuides.map((s) => {
          const y = scaleY(maxVal * s);
          return (
            <g key={s}>
              <line x1={padL} y1={y} x2={W - padR} y2={y}
                stroke="var(--border)" strokeWidth="1" strokeDasharray="3 5" />
              <text x={padL - 6} y={y + 3.5}
                textAnchor="end" fill="var(--ink-3)"
                fontSize="9" fontFamily="JetBrains Mono">
                {fmt(maxVal * s)}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line x1={padL} y1={baseline} x2={W - padR} y2={baseline}
          stroke="var(--border)" strokeWidth="1" />

        {/* Uncertainty band fill */}
        {bandArea && (
          <path d={bandArea} fill="var(--accent)" fillOpacity="0.06" />
        )}

        {/* Actual area */}
        <path d={aArea} fill="url(#fcActualGrad)" />

        {/* Forecast area */}
        <path d={fArea} fill="url(#fcForecastGrad)" />

        {/* NOW divider */}
        <line x1={nowX} y1={padT - 6} x2={nowX} y2={baseline}
          stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 3" />
        <text x={nowX} y={padT - 9}
          textAnchor="middle" fill="var(--ink-3)"
          fontSize="8.5" fontFamily="JetBrains Mono" letterSpacing="0.5">
          TODAY
        </text>

        {/* Actual line */}
        <path d={aPath}
          fill="none" stroke="var(--primary)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className="line-draw"
        />

        {/* Forecast dashed line */}
        <path d={fPath}
          fill="none" stroke="var(--accent)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="5 4"
        />

        {/* Actual dots */}
        <g fill="var(--surface)" stroke="var(--primary)" strokeWidth="2">
          {aPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" />
          ))}
        </g>

        {/* Forecast dots — only first and last */}
        <circle cx={fPts[0].x} cy={fPts[0].y} r="3"
          fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
        <circle cx={lastF.x} cy={lastF.y} r="5"
          fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />

        {/* Value callout on last actual point */}
        {lastA.value > 0 && (
          <g>
            <rect x={lastA.x - 22} y={lastA.y - 22} width={44} height={16}
              rx="4" fill="var(--primary)" opacity="0.9" />
            <text x={lastA.x} y={lastA.y - 11}
              textAnchor="middle" fill="var(--bg)"
              fontSize="9" fontFamily="JetBrains Mono" fontWeight="700">
              {fmt(lastA.value)}
            </text>
          </g>
        )}

        {/* Value callout on last forecast point */}
        <g>
          <rect x={lastF.x - 24} y={lastF.y - 24} width={48} height={17}
            rx="4" fill="var(--accent)" opacity="0.9" />
          <text x={lastF.x} y={lastF.y - 12}
            textAnchor="middle" fill="var(--bg)"
            fontSize="9" fontFamily="JetBrains Mono" fontWeight="700">
            {fmt(lastF.value)}
          </text>
        </g>

        {/* X labels */}
        <g fill="var(--ink-3)" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">
          {/* Actual: first + every-other */}
          {aPts.filter((_, i) => i === 0 || i % 2 === 0).map((p, i) => (
            <text key={`a-${i}`} x={p.x} y={H - 6}>{p.label.toUpperCase()}</text>
          ))}
          {/* Forecast: every other, skip the join point */}
          {fPts.slice(1).filter((_, i) => i % 2 === 0).map((p, i) => (
            <text key={`f-${i}`} x={p.x} y={H - 6} fill="var(--accent)" fillOpacity="0.7">
              {p.label.toUpperCase()}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
