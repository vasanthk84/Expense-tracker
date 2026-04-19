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
} from '../hooks/useData.js';
import { currentMonth, monthBounds, formatMoney, pad } from '../utils/date.js';

const RANGE_OPTIONS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

function rangeBounds(rangeId) {
  const today = new Date();
  const fmt = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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
    case 'year': {
      return {
        from: `${today.getFullYear()}-01-01`,
        to: fmt(today),
        trendCount: 12,
      };
    }
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
      const day = i + 1;
      const dateStr = `${month}-${pad(day)}`;
      return { label: String(day), value: totals[dateStr] || 0 };
    });
  }, [txns.data, month]);

  return { ...txns, data: dailyData };
}

export default function AnalyticsScreen() {
  const [range, setRange] = useState('month');
  const month = currentMonth();
  const { from, to, trendCount } = rangeBounds(range);

  const breakdown = useCategoryBreakdown(from, to);
  const trend = useTrend(month, trendCount);
  const comparison = useComparison(month);
  const daily = useDailyExpenses(month);

  const highlightIdx = trend.data ? trend.data.length - 2 : null;

  return (
    <>
      <AppHeader
        label="Insights"
        title="Analytics"
        right={<button className="icon-btn"><Icon name="download" size={16} /></button>}
      />

      <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />

      <Card variant="chart">
        <div className="chart-head">
          <div className="chart-title">Spending by category</div>
          <div className="chart-badge">{rangeLabel(range)}</div>
        </div>
        <AsyncBoundary state={breakdown}>
          {breakdown.data && (
            <DonutChart
              slices={breakdown.data.slices}
              total={formatMoney(breakdown.data.total, { withCents: false })}
            />
          )}
        </AsyncBoundary>
      </Card>

      <Card variant="chart">
        <div className="chart-head">
          <div className="chart-title">Daily expenses</div>
          <div className="chart-badge">{currentMonthLabel()}</div>
        </div>
        <AsyncBoundary state={daily}>
          {daily.data && daily.data.length > 0 && (
            <BarChart
              data={daily.data.map((d) => ({
                label: d.label,
                current: d.value,
                previous: 0,
              }))}
              hidePrevious
            />
          )}
        </AsyncBoundary>
      </Card>

      <Card variant="chart">
        <div className="chart-head">
          <div className="chart-title">Monthly trend</div>
          <div className="chart-badge">{trendCount}M</div>
        </div>
        <AsyncBoundary state={trend}>
          {trend.data && trend.data.length > 0 && (
            <LineChart
              data={trend.data}
              highlightIndex={highlightIdx >= 0 ? highlightIdx : undefined}
              tooltipValue={
                highlightIdx >= 0 && trend.data[highlightIdx]
                  ? formatMoney(trend.data[highlightIdx].value, { withCents: false })
                  : undefined
              }
            />
          )}
        </AsyncBoundary>
      </Card>

      <Card variant="chart">
        <div className="chart-head">
          <div className="chart-title">Category comparison</div>
          <div className="chart-badge">vs last month</div>
        </div>
        <AsyncBoundary state={comparison}>
          {comparison.data && <BarChart data={comparison.data} />}
        </AsyncBoundary>
        <div className="chart-legend">
          <span className="chart-legend-item">
            <span style={{ width: 10, height: 8, background: 'var(--primary)', borderRadius: 2 }} />
            This month
          </span>
          <span className="chart-legend-item">
            <span style={{ width: 10, height: 8, background: 'var(--primary)', opacity: 0.22, border: '1px solid var(--primary)', borderRadius: 2 }} />
            Last month
          </span>
        </div>
      </Card>

      <div style={{ height: 30 }} />
    </>
  );
}

function currentMonthLabel() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function rangeLabel(rangeId) {
  const map = { week: 'This week', month: currentMonthLabel(), quarter: 'This quarter', year: String(new Date().getFullYear()) };
  return map[rangeId] || currentMonthLabel();
}
