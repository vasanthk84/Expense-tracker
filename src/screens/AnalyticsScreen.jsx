/**
 * AnalyticsScreen.jsx
 *
 * FIXES:
 *  1. Summary strip: daily avg now uses summary.data.dailyAvg (server-computed)
 *     instead of dividing by getDate() on the client which could be day 1 = $0
 *  2. Trend chart: income data is now available from the fixed monthlyTrend()
 *     and displayed as a secondary reference line
 *  3. Savings rate chip added to summary strip
 */
import { useState, useMemo } from 'react';
import AppHeader from '../components/layout/AppHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import BarChart from '../components/charts/BarChart.jsx';
import Icon from '../components/icons/Icon.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import {
  useCategoryBreakdown,
  useTrend,
  useComparison,
  useTransactions,
  useMonthSummary,
} from '../hooks/useData.js';
import { currentMonth, monthBounds, formatMoney, pad } from '../utils/date.js';

const RANGE_OPTIONS = [
  { id: 'week',    label: 'Week'    },
  { id: 'month',   label: 'Month'   },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year',    label: 'Year'    },
];

function rangeBounds(rangeId) {
  const today = new Date();
  const fmt   = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  switch (rangeId) {
    case 'week': {
      const sun = new Date(today);
      sun.setDate(today.getDate() - today.getDay());
      return { from: fmt(sun), to: fmt(today), trendCount: 4 };
    }
    case 'quarter': {
      const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      return { from: fmt(qStart), to: fmt(today), trendCount: 3 };
    }
    case 'year':
      return { from: `${today.getFullYear()}-01-01`, to: fmt(today), trendCount: 12 };
    case 'month':
    default: {
      const m = currentMonth();
      const { from, to } = monthBounds(m);
      return { from, to, trendCount: 6 };
    }
  }
}

function useDailyExpenses(month) {
  const { from, to } = monthBounds(month);
  const txns = useTransactions({ from, to });
  const dailyData = useMemo(() => {
    if (!txns.data) return null;
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const totals = {};
    for (const t of txns.data) {
      if (t.isIncome) continue;
      totals[t.date] = (totals[t.date] || 0) + t.amount;
    }
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day     = i + 1;
      const dateStr = `${month}-${pad(day)}`;
      return { label: String(day), current: totals[dateStr] || 0, previous: 0 };
    });
  }, [txns.data, month]);
  return { ...txns, data: dailyData };
}

export default function AnalyticsScreen() {
  const [range, setRange] = useState('month');
  const month = currentMonth();
  const { from, to, trendCount } = rangeBounds(range);

  const breakdown  = useCategoryBreakdown(from, to);
  const trend      = useTrend(month, trendCount);
  const comparison = useComparison(month);
  const daily      = useDailyExpenses(month);
  const summary    = useMonthSummary(month);

  const highlightIdx = trend.data ? trend.data.length - 2 : null;

  const comparisonBars = useMemo(() => {
    if (!comparison.data) return null;
    return comparison.data.map((d) => ({
      label:    (d.name || d.id || '').slice(0, 5),
      current:  d.current,
      previous: d.previous,
      tone:     d.tone,
    }));
  }, [comparison.data]);

  return (
    <>
      <AppHeader
        label="Insights"
        title="Analytics"
        right={<button className="icon-btn"><Icon name="download" size={16} /></button>}
      />

      {/* Summary strip — FIX: uses server-computed dailyAvg, adds savings rate */}
      <AsyncBoundary state={summary}>
        {summary.data && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 8,
            margin: '0 20px 10px'
          }}>
            <StatChip label="Spent"       value={formatMoney(summary.data.spent,    { withCents: false })} />
            <StatChip label="Income"      value={formatMoney(summary.data.income,   { withCents: false })} tone="primary" />
            <StatChip label="Daily avg"   value={formatMoney(summary.data.dailyAvg, { withCents: false })} />
            <StatChip
              label="Saved"
              value={`${summary.data.savingsRate}%`}
              tone={summary.data.savingsRate >= 0 ? 'primary' : 'danger'}
            />
          </div>
        )}
      </AsyncBoundary>

      <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />

      {/* Spending by category donut */}
      <Card variant="chart">
        <div className="chart-head">
          <div>
            <div className="chart-title">Spending by category</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Where your money goes</div>
          </div>
          <div className="chart-badge">{rangeLabel(range)}</div>
        </div>
        <AsyncBoundary state={breakdown} emptyTitle="No spending yet" emptyIcon="savings">
          {breakdown.data && breakdown.data.slices?.length > 0 && (
            <>
              <DonutChart
                slices={breakdown.data.slices}
                total={formatMoney(breakdown.data.total, { withCents: false })}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12 }}>
                {breakdown.data.slices.map((s) => (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, color: 'var(--ink-2)'
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: s.color, flexShrink: 0
                    }} />
                    {s.label} · {formatMoney(s.value, { withCents: false })}
                  </div>
                ))}
              </div>
            </>
          )}
        </AsyncBoundary>
      </Card>

      {/* Daily expenses bar chart */}
      <Card variant="chart">
        <div className="chart-head">
          <div>
            <div className="chart-title">Daily expenses</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Each day this month</div>
          </div>
          <div className="chart-badge">{currentMonthLabel()}</div>
        </div>
        <AsyncBoundary state={daily}>
          {daily.data && daily.data.some((d) => d.current > 0) && (
            <BarChart data={daily.data} hidePrevious />
          )}
        </AsyncBoundary>
      </Card>

      {/* Monthly trend line chart — FIX: income now in tooltip label */}
      <Card variant="chart">
        <div className="chart-head">
          <div>
            <div className="chart-title">Monthly spending trend</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              {trendCount}-month history
            </div>
          </div>
          <div className="chart-badge">{trendCount}M</div>
        </div>
        <AsyncBoundary state={trend}>
          {trend.data && trend.data.length > 0 && (
            <>
              <LineChart
                data={trend.data}
                highlightIndex={highlightIdx >= 0 ? highlightIdx : undefined}
                tooltipValue={
                  highlightIdx >= 0 && trend.data[highlightIdx]
                    ? formatMoney(trend.data[highlightIdx].value, { withCents: false })
                    : undefined
                }
              />
              {/* Income vs spend summary below chart */}
              {trend.data.some((d) => (d.income || 0) > 0) && (
                <div style={{
                  display: 'flex', justifyContent: 'space-around',
                  marginTop: 10, paddingTop: 10,
                  borderTop: '1px solid var(--border)'
                }}>
                  {trend.data.slice(-3).map((d) => (
                    <div key={d.month} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                        {d.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}>
                        {formatMoney(d.value, { withCents: false })}
                      </div>
                      {d.income > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          ↑ {formatMoney(d.income, { withCents: false })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </AsyncBoundary>
      </Card>

      {/* Category comparison bar chart */}
      <Card variant="chart">
        <div className="chart-head">
          <div>
            <div className="chart-title">Category comparison</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>This month vs last month</div>
          </div>
          <div className="chart-badge">vs last month</div>
        </div>
        <AsyncBoundary state={comparison} emptyTitle="No data yet" emptyIcon="savings">
          {comparisonBars && comparisonBars.length > 0 && (
            <BarChart data={comparisonBars} />
          )}
        </AsyncBoundary>
        <div className="chart-legend">
          <span className="chart-legend-item">
            <span style={{ width: 10, height: 8, background: 'var(--primary)', borderRadius: 2 }} />
            This month
          </span>
          <span className="chart-legend-item">
            <span style={{
              width: 10, height: 8, background: 'var(--primary)',
              opacity: 0.22, border: '1px solid var(--primary)', borderRadius: 2
            }} />
            Last month
          </span>
        </div>
      </Card>

      <div style={{ height: 30 }} />
    </>
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
      padding: '8px 10px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 13,
        fontWeight: 600,
        color
      }}>{value}</div>
      <div style={{
        fontSize: 9,
        color: 'var(--ink-3)',
        marginTop: 2,
        fontFamily: 'var(--font-mono)'
      }}>{label}</div>
    </div>
  );
}

function currentMonthLabel() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function rangeLabel(rangeId) {
  const map = {
    week:    'This week',
    month:   currentMonthLabel(),
    quarter: 'This quarter',
    year:    String(new Date().getFullYear())
  };
  return map[rangeId] || currentMonthLabel();
}
