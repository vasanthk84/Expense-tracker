import AppHeader from '../components/layout/AppHeader.jsx';
import Card from '../components/ui/Card.jsx';
import SectionHead from '../components/ui/SectionHead.jsx';
import CategoryIcon from '../components/ui/CategoryIcon.jsx';
import ForecastChart from '../components/charts/ForecastChart.jsx';
import Icon from '../components/icons/Icon.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import { useForecast, useBudgetUtilization } from '../hooks/useData.js';
import { currentMonth, formatMoney } from '../utils/date.js';

export default function ForecastScreen() {
  const month = currentMonth();
  const forecast = useForecast(month, 6, 6);
  const utilization = useBudgetUtilization(month);

  return (
    <>
      <AppHeader
        label="Forecast"
        title="Next 6 months"
        right={<button className="icon-btn"><Icon name="spark" size={16} /></button>}
      />

      <AsyncBoundary state={forecast}>
        {forecast.data && (
          <Card style={{ padding: '16px 18px' }}>
            <div className="forecast-head">
              <div>
                <div className="hero-label" style={{ color: 'var(--ink-3)' }}>Projected spend</div>
                <div className="forecast-amount">{formatMoney(forecast.data.projected, { withCents: false })}</div>
                <div className="forecast-period">{forecast.data.period}</div>
              </div>
              <div
                className="forecast-badge"
                style={
                  forecast.data.yoyChange > 0
                    ? { background: 'var(--danger-soft)', color: 'var(--danger)' }
                    : undefined
                }
              >
                {forecast.data.yoyChange > 0 ? '+' : ''}{forecast.data.yoyChange}% YoY
              </div>
            </div>

            <ForecastChart
              actual={forecast.data.actual}
              forecast={forecast.data.forecast}
              upper={forecast.data.upper}
              lower={forecast.data.lower}
            />

            <div className="chart-legend" style={{ marginTop: 10, fontFamily: 'var(--font-mono)' }}>
              <span className="chart-legend-item">
                <span style={{ width: 16, height: 2, background: 'var(--primary)' }} />
                Actual
              </span>
              <span className="chart-legend-item">
                <span style={{ width: 16, height: 2, background: 'var(--accent)', borderTop: '1.5px dashed var(--accent)' }} />
                Forecast
              </span>
            </div>
          </Card>
        )}
      </AsyncBoundary>

      <SectionHead title="Forecast breakdown" />
      <AsyncBoundary state={utilization}>
        {utilization.data && (
          <Card>
            {utilization.data.filter((b) => b.budget > 0).slice(0, 5).map((b) => {
              // Simple projection: last month's spend × 6
              const projected = b.spent * 6;
              const change = b.budget > 0 ? Math.round(((b.spent - b.budget) / b.budget) * 100) : 0;
              const isUp = change > 0;
              return (
                <div key={b.id} className="budget-row">
                  <div className="budget-cat">
                    <CategoryIcon icon={b.icon} tone={b.tone} />
                    <div className="budget-meta">
                      <div className="budget-name">{b.name}</div>
                      <div className="budget-sub">${Math.round(projected).toLocaleString()} projected</div>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: isUp ? 'var(--danger)' : 'var(--primary)',
                    fontWeight: 600
                  }}>
                    {isUp ? '+' : ''}{change}%
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </AsyncBoundary>

      <div style={{ height: 30 }} />
    </>
  );
}
