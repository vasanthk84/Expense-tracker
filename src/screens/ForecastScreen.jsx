/**
 * ForecastScreen.jsx
 *
 * FIX: Was reading forecast.data.projected / .period / .yoyChange / .actual /
 * .forecast / .upper / .lower but the old analytics.js returned a flat array.
 * The analytics.js is now fixed to return these named fields, so this screen
 * works correctly.  Also added income-vs-spend trend lines and a cleaner
 * projection breakdown with per-category projected amounts.
 */
import { useState } from 'react';
import AppHeader from '../components/layout/AppHeader.jsx';
import Card from '../components/ui/Card.jsx';
import SectionHead from '../components/ui/SectionHead.jsx';
import CategoryIcon from '../components/ui/CategoryIcon.jsx';
import ForecastChart from '../components/charts/ForecastChart.jsx';
import Icon from '../components/icons/Icon.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import { useForecast, useBudgetUtilization, useMonthSummary, useCategories } from '../hooks/useData.js';
import { currentMonth, formatMoney } from '../utils/date.js';

export default function ForecastScreen() {
  const month       = currentMonth();
  const forecast    = useForecast(month, 6, 6);
  const utilization = useBudgetUtilization(month);
  const summary     = useMonthSummary(month);
  const categories  = useCategories();
  const [showGuide, setShowGuide] = useState(false);

  const recurringIds = new Set(
    (categories.data || []).filter((c) => c.recurring).map((c) => c.id)
  );

  return (
    <>
      <AppHeader
        label="Forecast"
        title="Next 6 months"
        right={<button className="icon-btn"><Icon name="spark" size={16} /></button>}
      />

      {/* ── Summary strip ── */}
      <AsyncBoundary state={summary}>
        {summary.data && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10,
            margin: '0 20px 14px'
          }}>
            <StatChip
              label="Income"
              value={formatMoney(summary.data.income, { withCents: false })}
              tone="primary"
            />
            <StatChip
              label="Spent"
              value={formatMoney(summary.data.spent, { withCents: false })}
            />
            <StatChip
              label="Savings rate"
              value={`${summary.data.savingsRate}%`}
              tone={summary.data.savingsRate > 0 ? 'primary' : 'danger'}
            />
          </div>
        )}
      </AsyncBoundary>

      {/* ── Forecast chart card ── */}
      <AsyncBoundary state={forecast}>
        {forecast.data && (() => {
          const fd = forecast.data;
          return (
            <Card style={{ padding: '16px 18px' }}>
              <div className="forecast-head">
                <div>
                  <div className="hero-label" style={{ color: 'var(--ink-3)' }}>
                    Projected monthly avg
                  </div>
                  <div className="forecast-amount">
                    {formatMoney(fd.projected, { withCents: false })}
                  </div>
                  <div className="forecast-period">{fd.period}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div
                    className="forecast-badge"
                    style={fd.yoyChange > 0
                      ? { background: 'var(--danger-soft)', color: 'var(--danger)' }
                      : { background: 'var(--primary-soft)', color: 'var(--primary)' }
                    }
                  >
                    {fd.yoyChange > 0 ? '+' : ''}{fd.yoyChange}% YoY
                  </div>
                  <button
                    onClick={() => setShowGuide((v) => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}
                  >
                    <Icon name="spark" size={11} />
                    How to read
                  </button>
                </div>
              </div>

              {/* ── How to read guide ── */}
              {showGuide && (
                <div style={{ margin: '12px 0', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.65 }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 8, fontSize: 13 }}>How to read this chart</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <GuideRow icon="primary" label="Solid green line — Actual spending">
                      Each dot is one month of real recorded spending. The height shows how much you spent.
                    </GuideRow>
                    <GuideRow icon="accent" label="Dashed line — Forecast">
                      Starts from TODAY and shows projected monthly spend for the next 6 months. Built using linear regression on your past history, with your recurring costs (Rent, Utilities, Subs) as a guaranteed floor.
                    </GuideRow>
                    <GuideRow icon="band" label="Shaded band — Uncertainty range">
                      The soft glow around the forecast line is ±1 standard deviation — meaning actual spending will likely land somewhere inside this band, not exactly on the line.
                    </GuideRow>
                    <GuideRow icon="callout" label="Green pill = last actual · Amber pill = end-of-forecast">
                      The two labelled bubbles show: where you are now, and where you're projected to be in 6 months.
                    </GuideRow>
                  </div>
                </div>
              )}

              <ForecastChart
                actual={fd.actual}
                forecast={fd.forecast}
                upper={fd.upper}
                lower={fd.lower}
              />

              <div className="chart-legend" style={{ marginTop: 10, fontFamily: 'var(--font-mono)' }}>
                <span className="chart-legend-item">
                  <span style={{ width: 16, height: 2, background: 'var(--primary)', display: 'inline-block' }} />
                  Actual
                </span>
                <span className="chart-legend-item">
                  <span style={{ width: 16, height: 0, display: 'inline-block', borderTop: '2px dashed var(--accent)' }} />
                  Forecast
                </span>
                <span className="chart-legend-item">
                  <span style={{ width: 16, height: 8, background: 'var(--accent)', opacity: 0.12, display: 'inline-block', borderRadius: 2 }} />
                  ±1σ band
                </span>
              </div>

              {fd.actual.length >= 2 && (() => {
                const first = fd.actual[0].value;
                const last  = fd.actual[fd.actual.length - 1].value;
                const diff  = last - first;
                const pct   = first > 0 ? Math.round((diff / first) * 100) : 0;
                if (pct === 0) return null;
                const isUp = diff > 0;
                return (
                  <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: isUp ? 'var(--danger-soft)' : 'var(--primary-soft)', color: isUp ? 'var(--danger)' : 'var(--primary)', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Icon name={isUp ? 'alert' : 'arrowUp'} size={12} />
                    Spending {isUp ? 'trended up' : 'trended down'} {Math.abs(pct)}% over the past {fd.actual.length} months
                  </div>
                );
              })()}
            </Card>
          );
        })()}
      </AsyncBoundary>

      {/* ── Per-category projection ── */}
      <SectionHead title="Category projections" />
      <AsyncBoundary state={utilization}>
        {utilization.data && (() => {
          const today      = new Date().getDate();
          const rows = utilization.data.filter((b) => b.budget > 0 || b.spent > 0);
          const recurring  = rows.filter((b) => recurringIds.has(b.id));
          const variable   = rows.filter((b) => !recurringIds.has(b.id));

          const RecurringSection = recurring.length > 0 && (
            <>
              <div style={{ padding: '10px 16px 4px', fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Fixed · repeats every month
              </div>
              {recurring.map((b) => (
                <div key={b.id} className="budget-row" style={{ borderLeft: '2px solid var(--primary)' }}>
                  <div className="budget-cat">
                    <CategoryIcon icon={b.icon} tone={b.tone} />
                    <div className="budget-meta">
                      <div className="budget-name">{b.name}</div>
                      <div className="budget-sub">
                        {b.budget > 0
                          ? `${formatMoney(b.budget, { withCents: false })}/mo · ${formatMoney(b.budget * 6, { withCents: false })} over 6 mo`
                          : 'Set a budget to include in forecast'}
                      </div>
                    </div>
                  </div>
                  {b.budget > 0 && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--primary)', flexShrink: 0 }}>
                      Fixed
                    </div>
                  )}
                </div>
              ))}
            </>
          );

          const VariableSection = variable.length > 0 && (
            <>
              <div style={{ padding: '10px 16px 4px', fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Variable · based on current pace
              </div>
              {variable.map((b) => {
                const projected6m    = today > 0 ? Math.round((b.spent / today) * 30 * 6) : b.spent * 6;
                const vsAnnualBudget = b.budget > 0 ? Math.round(((projected6m / (b.budget * 6)) - 1) * 100) : null;
                const isUp = vsAnnualBudget > 5;
                return (
                  <div key={b.id} className="budget-row">
                    <div className="budget-cat">
                      <CategoryIcon icon={b.icon} tone={b.tone} />
                      <div className="budget-meta">
                        <div className="budget-name">{b.name}</div>
                        <div className="budget-sub">{formatMoney(projected6m, { withCents: false })} projected over 6 mo</div>
                      </div>
                    </div>
                    {vsAnnualBudget !== null && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: isUp ? 'var(--danger)' : 'var(--primary)', flexShrink: 0 }}>
                        {isUp ? '+' : ''}{vsAnnualBudget}%
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          );

          return (
            <Card variant="flush">
              {RecurringSection}
              {VariableSection}
            </Card>
          );
        })()}
      </AsyncBoundary>

      <div style={{ height: 30 }} />
    </>
  );
}

function GuideRow({ icon, label, children }) {
  const color = icon === 'primary' ? 'var(--primary)' : icon === 'accent' ? 'var(--accent)' : 'var(--ink-3)';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4 }} />
      <div>
        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 12, marginBottom: 2 }}>{label}</div>
        <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>{children}</div>
      </div>
    </div>
  );
}

function StatChip({ label, value, tone = 'default' }) {
  const color = tone === 'primary'
    ? 'var(--primary)'
    : tone === 'danger'
    ? 'var(--danger)'
    : 'var(--ink)';
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '10px 12px',
      textAlign: 'center'
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 14,
        fontWeight: 600,
        color
      }}>{value}</div>
      <div style={{
        fontSize: 10,
        color: 'var(--ink-3)',
        marginTop: 2,
        fontFamily: 'var(--font-mono)'
      }}>{label}</div>
    </div>
  );
}
