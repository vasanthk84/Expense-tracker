/**
 * DashboardScreen.jsx
 *
 * FIXES:
 *  1. HeroCard now shows income + net cash flow (surplus/deficit) alongside spend
 *  2. Savings rate shown in hero
 *  3. bp-vals raw number bug fixed — amounts now properly formatted with $
 */
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader.jsx';
import Card from '../components/ui/Card.jsx';
import SectionHead from '../components/ui/SectionHead.jsx';
import CategoryIcon from '../components/ui/CategoryIcon.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Insight from '../components/ui/Insight.jsx';
import SavingsRing from '../components/charts/SavingsRing.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import {
  useSettings,
  useMonthSummary,
  useBudgetUtilization,
  useSavingsGoals,
  useInsights
} from '../hooks/useData.js';
import { currentMonth, formatMoney } from '../utils/date.js';
import Icon from '../components/icons/Icon.jsx';

export default function DashboardScreen() {
  const navigate = useNavigate();
  const month    = currentMonth();
  const { theme, toggleTheme } = useTheme();
  const settings    = useSettings();
  const summary     = useMonthSummary(month);
  const utilization = useBudgetUtilization(month);
  const goals       = useSavingsGoals();
  const insights    = useInsights(month);

  const userName    = settings.data?.user?.name    || 'there';
  const userInitial = settings.data?.user?.initial || userName[0]?.toUpperCase() || 'U';

  return (
    <>
      <AppHeader
        label="Good morning"
        title={userName}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={16} />
            </button>
            <div className="avatar">{userInitial}</div>
          </div>
        }
      />

      {/* Hero spending card — now includes income + net flow */}
      <AsyncBoundary state={summary} loadingLabel="Loading summary…">
        {summary.data && <HeroCard summary={summary.data} />}
      </AsyncBoundary>

      {/* Savings ring */}
      <AsyncBoundary state={goals}>
        {goals.data?.[0] && <SavingsCard goal={goals.data[0]} />}
      </AsyncBoundary>

      {/* Budget vs actual */}
      <SectionHead title="Budget vs. Actual" action="See all →" onActionClick={() => navigate('/budgets')} />
      <AsyncBoundary
        state={utilization}
        emptyTitle="No budgets yet"
        emptySub="Set category budgets to start tracking."
        emptyIcon="savings"
      >
        {utilization.data && (
          <Card>
            {utilization.data.filter((b) => b.budget > 0).slice(0, 4).map((b) => (
              <div key={b.id} className="budget-row">
                <div className="budget-cat">
                  <CategoryIcon icon={b.icon} tone={b.tone} />
                  <div className="budget-meta">
                    <div className="budget-name">{b.name}</div>
                    {/* FIX: was `${b.spent}` — now properly formatted */}
                    <div className="budget-sub">
                      {formatMoney(b.spent, { withCents: false })} / {formatMoney(b.budget, { withCents: false })}
                    </div>
                  </div>
                </div>
                <div className="budget-bar-wrap">
                  <ProgressBar value={b.pct} />
                </div>
                <div className={`budget-pct ${b.pct >= 100 ? 'danger' : ''}`}>{b.pct}%</div>
              </div>
            ))}
          </Card>
        )}
      </AsyncBoundary>

      {/* Insights */}
      <SectionHead title="Key insights" />
      <AsyncBoundary
        state={insights}
        emptyTitle="No insights yet"
        emptySub="Add a few transactions and we'll spot patterns."
        emptyIcon="spark"
      >
        {insights.data?.length > 0 && (
          <Card>
            {insights.data.slice(0, 3).map((ins, i) => (
              <Insight key={i} icon={ins.icon} title={ins.title}>
                {renderHighlight(ins.body, ins.highlight)}
              </Insight>
            ))}
          </Card>
        )}
      </AsyncBoundary>

      <div style={{ height: 30 }} />
    </>
  );
}

/**
 * FIX: HeroCard now shows spend, income, net cash flow, and savings rate.
 * Previously only showed spend/budget/remaining/daysLeft — income was invisible.
 */
function HeroCard({ summary }) {
  const cents = (summary.spent % 1).toFixed(2).slice(2);
  const whole = Math.floor(summary.spent);
  const isPositive = summary.netFlow >= 0;

  return (
    <Card variant="hero">
      <div className="hero-label">Spending · {summary.monthLabel}</div>
      <div className="hero-amount">
        ${whole.toLocaleString()}
        <span className="cents">.{cents}</span>
      </div>

      {/* Primary row: budget / remaining / days */}
      <div className="hero-sub">
        <div className="hero-sub-item">
          <div className="hero-sub-label">Budget</div>
          <div className="hero-sub-value">${summary.budget.toLocaleString()}</div>
        </div>
        <div className="hero-sub-item">
          <div className="hero-sub-label">Remaining</div>
          <div className="hero-sub-value">${summary.remaining.toFixed(2)}</div>
        </div>
        <div className="hero-sub-item">
          <div className="hero-sub-label">Days left</div>
          <div className="hero-sub-value">{summary.daysLeft}</div>
        </div>
      </div>

      {/* Secondary row: income / net flow / savings rate — only if income exists */}
      {summary.income > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(253, 251, 247, 0.12)',
          position: 'relative',
          zIndex: 1
        }}>
          <div className="hero-sub-item">
            <div className="hero-sub-label">Income</div>
            <div className="hero-sub-value" style={{ color: 'rgba(253,251,247,0.9)' }}>
              ${summary.income.toLocaleString()}
            </div>
          </div>
          <div className="hero-sub-item">
            <div className="hero-sub-label">Net flow</div>
            <div className="hero-sub-value" style={{
              color: isPositive ? '#A8D5B5' : '#F4A89A'
            }}>
              {isPositive ? '+' : '−'}${Math.abs(summary.netFlow).toLocaleString()}
            </div>
          </div>
          <div className="hero-sub-item">
            <div className="hero-sub-label">Saved</div>
            <div className="hero-sub-value" style={{
              color: summary.savingsRate > 0 ? '#A8D5B5' : '#F4A89A'
            }}>
              {summary.savingsRate}%
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function SavingsCard({ goal }) {
  const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
  return (
    <Card>
      <div className="savings-card">
        <SavingsRing value={pct} />
        <div className="savings-text">
          <div className="savings-label">Savings goal</div>
          <div className="savings-amount">
            {formatMoney(goal.current, { withCents: false })}{' '}
            <span className="savings-amount-sub">/ {formatMoney(goal.target, { withCents: false })}</span>
          </div>
          <div className="savings-goal">{goal.label} · {goal.deadline}</div>
        </div>
      </div>
    </Card>
  );
}

function renderHighlight(body, highlight) {
  if (!highlight || !body.includes(highlight)) return body;
  const parts = body.split(highlight);
  return (
    <>
      {parts[0]}
      <em>{highlight}</em>
      {parts[1]}
    </>
  );
}
