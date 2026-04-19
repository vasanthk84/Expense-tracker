import { useState } from 'react';

export default function DonutChart({ slices = [], total = '' }) {
  const [activeIdx, setActiveIdx] = useState(null);

  const size = 130;
  const stroke = 16;
  const r = 50;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const sum = slices.reduce((acc, s) => acc + s.value, 0) || 1;

  const rawPcts = slices.map((s) => (s.value / sum) * 100);
  const floored = rawPcts.map(Math.floor);
  let leftover = 100 - floored.reduce((a, b) => a + b, 0);
  const pcts = floored
    .map((p, i) => ({ i, p, r: rawPcts[i] - p }))
    .sort((a, b) => b.r - a.r)
    .reduce((arr, { i, p }) => {
      arr[i] = p + (leftover-- > 0 ? 1 : 0);
      return arr;
    }, []);

  let cumulative = 0;
  const segments = slices.map((s, i) => {
    const len = (s.value / sum) * circumference;
    const seg = {
      ...s,
      pct: pcts[i],
      dasharray: `${len} ${circumference - len}`,
      finalOffset: circumference - len,
      rotation: (cumulative / circumference) * 360 - 90,
      delay: i * 0.12,
    };
    cumulative += len;
    return seg;
  });

  const active = activeIdx !== null ? segments[activeIdx] : null;

  return (
    <div className="donut-wrap">
      <div className="donut-chart-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <style>{`
            @keyframes donut-draw {
              from { stroke-dashoffset: var(--do-start); }
              to   { stroke-dashoffset: var(--do-end); }
            }
          `}</style>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={activeIdx === i ? stroke + 5 : stroke}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.finalOffset}
              transform={`rotate(${seg.rotation} ${cx} ${cy})`}
              style={{
                '--do-start': circumference,
                '--do-end': seg.finalOffset,
                animation: `donut-draw 0.7s cubic-bezier(0.4,0,0.2,1) ${seg.delay}s both`,
                cursor: 'pointer',
                transition: 'stroke-width 0.15s ease',
              }}
              onClick={() => setActiveIdx(activeIdx === i ? null : i)}
              role="button"
              aria-label={`${seg.label}: ${seg.pct}%`}
            />
          ))}
        </svg>
        <div className="donut-center" style={{ pointerEvents: 'none' }}>
          <div className="donut-total" style={active ? { fontSize: 11 } : {}}>
            {active
              ? `$${active.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              : total}
          </div>
          <div className="donut-label" style={active ? { fontSize: 9 } : {}}>
            {active ? active.label : 'Total'}
          </div>
        </div>
      </div>

      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="legend-row"
            style={{
              cursor: 'pointer',
              opacity: activeIdx !== null && activeIdx !== i ? 0.4 : 1,
              transition: 'opacity 0.15s ease',
            }}
            onClick={() => setActiveIdx(activeIdx === i ? null : i)}
          >
            <span className="legend-dot" style={{ background: seg.color }} />
            <span className="legend-label">{seg.label}</span>
            <span className="legend-val">
              ${seg.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className="legend-val" style={{ color: 'var(--ink-3)', marginLeft: 4 }}>
              {seg.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
