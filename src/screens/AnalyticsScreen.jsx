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
  useComparison
} from '../hooks/useData.js';
import { currentMonth, monthBounds, formatMoney } from '../utils/date.js';

const RANGE_OPTIONS = [
  { id: 'week',    label: 'Week' },
  { id: 'month',   label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year',    label: 'Year' }
];

export default function AnalyticsScreen() {
  const [range, setRange] = useState('month');
  const month = currentMonth();
  const { from, to } = monthBounds(month);

  const breakdown = useCategoryBreakdown(from, to);
  const trend = useTrend(month, 6);
  const comparison = useComparison(month);

  // Highlight last point in trend chart
  const highlightIdx = trend.data ? trend.data.length - 2 : null;

  return (
    <>
      <AppHeader
        label="Insights"
        title="Analytics"
        right={<button className="icon-btn"><Icon name="download" size={16} /></button>}
      />

      <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />

      {/* Donut */}
      <Card variant="chart">
        <div className="chart-head">
          <div className="chart-title">Spending by category</div>
          <div className="chart-badge">{currentMonthLabel()}</div>
        </div>
        <AsyncBoundary state={breakdown}>
          {breakdown.data && (
            <DonutChart slices={breakdown.data.slices} total={formatMoney(breakdown.data.total, { withCents: false })} />
          )}
        </AsyncBoundary>
      </Card>

      {/* Trend */}
      <Card variant="chart">
        <div className="chart-head">
          <div className="chart-title">Monthly trend</div>
          <div className="chart-badge">6M</div>
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

      {/* Comparison */}
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
            <span style={{ width: 10, height: 8, border: '1.5px solid var(--border-strong)', borderRadius: 2 }} />
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
