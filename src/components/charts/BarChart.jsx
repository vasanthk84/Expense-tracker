import { useState, useRef, useCallback, useEffect } from 'react';

export default function BarChart({ data = [], height = 200, hidePrevious = false, refValue = null, refLabel = null, smartCap = false }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const [svgWidth, setSvgWidth] = useState(320);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w > 0) setSvgWidth(w);
    });
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data.length) return null;

  const vbWidth = hidePrevious ? Math.max(svgWidth, data.length * 14) : svgWidth;

  const chartTop = 24;
  const chartBottom = 158;
  const chartHeight = chartBottom - chartTop;

  // Smart outlier cap: clamp bars > 3× median so small values stay visible
  const nonZero = data.map((d) => d.current).filter((v) => v > 0).sort((a, b) => a - b);
  const median  = nonZero.length ? nonZero[Math.floor(nonZero.length / 2)] : 0;
  const capAt   = smartCap && median > 0 ? median * 3 : null;

  const displayData = data.map((d) => ({
    ...d,
    _raw:    d.current,
    _capped: capAt != null && d.current > capAt,
    current: capAt != null ? Math.min(d.current, capAt) : d.current,
  }));

  const max = Math.max(...displayData.flatMap((d) => [d.current, hidePrevious ? 0 : (d.previous || 0)]), refValue || 0) || 1;
  const scaleH = (v) => (v / max) * chartHeight;

  const step = vbWidth / displayData.length;
  const barW = hidePrevious ? Math.max(step * 0.55, 4) : 12;
  const pairGap = 2;
  const pairW = hidePrevious ? barW : barW * 2 + pairGap;

  const formatVal = (v) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`;

  const handlePointer = useCallback((clientX) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const pixelX = clientX - rect.left;
    const vbX = (pixelX / rect.width) * vbWidth;
    const idx = Math.floor(vbX / step);
    setActiveIdx(idx >= 0 && idx < displayData.length ? idx : null);
  }, [step, vbWidth, displayData.length]);

  const labelStep = displayData.length >= 20 ? 5 : displayData.length >= 10 ? 2 : 1;
  const activeBar = activeIdx !== null ? displayData[activeIdx] : null;

  return (
    <div style={{ position: 'relative' }}>
      {activeBar && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 6,
          padding: '3px 8px',
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          {activeBar.label} — {formatVal(activeBar._raw ?? activeBar.current)}
          {!hidePrevious && (activeBar.previous || 0) > 0 && (
            <span style={{ color: 'var(--ink-3)', marginLeft: 6 }}>
              prev {formatVal(activeBar.previous)}
            </span>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${vbWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', overflow: 'visible' }}
        onMouseMove={(e) => handlePointer(e.clientX)}
        onMouseLeave={() => setActiveIdx(null)}
        onTouchMove={(e) => { e.preventDefault(); handlePointer(e.touches[0].clientX); }}
        onTouchEnd={() => setActiveIdx(null)}
      >
        <g stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4">
          <line x1="0" y1={chartTop + chartHeight * 0.25} x2={vbWidth} y2={chartTop + chartHeight * 0.25} />
          <line x1="0" y1={chartTop + chartHeight * 0.5}  x2={vbWidth} y2={chartTop + chartHeight * 0.5} />
          <line x1="0" y1={chartTop + chartHeight * 0.75} x2={vbWidth} y2={chartTop + chartHeight * 0.75} />
        </g>

        <line x1="0" y1={chartBottom} x2={vbWidth} y2={chartBottom} stroke="var(--border)" strokeWidth="1" />

        {refValue != null && (() => {
          const ry = chartBottom - scaleH(refValue);
          return (
            <g>
              <line x1="0" y1={ry} x2={vbWidth} y2={ry}
                stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.65" />
              {refLabel && (
                <text x={vbWidth - 3} y={ry - 3} textAnchor="end"
                  fill="var(--danger)" fontSize="8" fontFamily="JetBrains Mono" opacity="0.8">
                  {refLabel}
                </text>
              )}
            </g>
          );
        })()}

        <g>
          {displayData.map((d, i) => {
            const currentH = scaleH(d.current);
            const previousH = hidePrevious ? 0 : scaleH(d.previous || 0);
            const pairX = i * step + (step - pairW) / 2;
            const curX = pairX;
            const prevX = pairX + barW + pairGap;
            const curY = chartBottom - currentH;
            const prevY = chartBottom - previousH;
            const fill = d._capped ? 'var(--accent)' : (d.tone === 'accent' ? 'var(--accent)' : 'var(--primary)');
            const isActive = activeIdx === i;
            const dimmed = activeIdx !== null && !isActive;

            return (
              <g key={`${d.label}-${i}`} opacity={dimmed ? 0.35 : 1} style={{ transition: 'opacity 0.15s ease' }}>
                {d.current > 0 && (
                  <rect
                    className="bar-rise"
                    style={{ animationDelay: `${i * 0.04}s`, transformOrigin: `0 ${chartBottom}px` }}
                    x={curX}
                    y={curY}
                    width={barW}
                    height={currentH}
                    rx="3"
                    fill={fill}
                    opacity={isActive ? 1 : 0.85}
                  />
                )}

                {!hidePrevious && (d.previous || 0) > 0 && (
                  <rect
                    className="bar-rise"
                    style={{ animationDelay: `${i * 0.04 + 0.02}s`, transformOrigin: `0 ${chartBottom}px` }}
                    x={prevX}
                    y={prevY}
                    width={barW}
                    height={previousH}
                    rx="3"
                    fill={fill}
                    fillOpacity="0.25"
                    stroke={fill}
                    strokeWidth="1"
                  />
                )}

                {isActive && d.current > 0 && (
                  <rect
                    x={curX - 1}
                    y={curY - 1}
                    width={barW + 2}
                    height={currentH + 2}
                    rx="4"
                    fill="none"
                    stroke={fill}
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                )}

                {/* Capped indicator: zigzag lines + value label above bar */}
                {d._capped && (
                  <g>
                    <line x1={curX} y1={curY + 2} x2={curX + barW / 3} y2={curY - 2}
                      stroke="var(--accent)" strokeWidth="1" />
                    <line x1={curX + barW / 3} y1={curY - 2} x2={curX + barW * 2/3} y2={curY + 2}
                      stroke="var(--accent)" strokeWidth="1" />
                    <line x1={curX + barW * 2/3} y1={curY + 2} x2={curX + barW} y2={curY - 2}
                      stroke="var(--accent)" strokeWidth="1" />
                    <text
                      x={curX + barW / 2} y={curY - 5}
                      textAnchor="middle" fill="var(--accent)"
                      fontSize="7.5" fontFamily="JetBrains Mono"
                    >
                      {formatVal(d._raw)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        <g fill="var(--ink-2)" fontSize="9.5" fontFamily="JetBrains Mono" textAnchor="middle" letterSpacing="0.3">
          {displayData.map((d, i) => {
            const show = i === 0 || i === displayData.length - 1 || i % labelStep === 0;
            if (!show) return null;
            const x = i * step + step / 2;
            return (
              <g key={`lbl-${i}`}>
                <line x1={x} y1={chartBottom} x2={x} y2={chartBottom + 4} stroke="var(--border)" strokeWidth="1" />
                <text x={x} y={height - 3} fill="var(--ink-2)">{d.label}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
