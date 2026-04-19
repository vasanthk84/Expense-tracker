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
  const month = currentMonth();
  const { theme, toggleTheme } = useTheme();
  const settings = useSettings();
  const summary = useMonthSummary(month);
  const utilization = useBudgetUtilization(month);
  const goals = useSavingsGoals();
  const insights = useInsights(month);

  const userName = settings.data?.user?.name || 'there';
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

      {/* Hero spending card */}
      <AsyncBoundary state={summary} loadingLabel="Loading summary…">
        {summary.data && <HeroCard summary={summary.data} />}
      </AsyncBoundary>

      {/* Savings ring */}
      <AsyncBoundary state={goals}>
        {goals.data?.[0] && <SavingsCard goal={goals.data[0]} />}
      </AsyncBoundary>

      {/* Budget vs actual */}
      <SectionHead title="Budget vs. Actual" action="See all →" onActionClick={() => navigate('/budgets')} />
      <AsyncBoundary state={utilization} emptyTitle="No budgets yet" emptySub="Set category budgets to start tracking." emptyIcon="savings">
        {utilization.data && (
          <Card>
            {utilization.data.filter((b) => b.budget > 0).slice(0, 4).map((b) => (
              <div key={b.id} className="budget-row">
                <div className="budget-cat">
                  <CategoryIcon icon={b.icon} tone={b.tone} />
                  <div className="budget-meta">
                    <div className="budget-name">{b.name}</div>
                    <div className="budget-sub">${b.spent} / ${b.budget}</div>
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
      <AsyncBoundary state={insights} emptyTitle="No insights yet" emptySub="Add a few transactions and we'll spot patterns." emptyIcon="spark">
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

function HeroCard({ summary }) {
  const cents = (summary.spent % 1).toFixed(2).slice(2);
  const whole = Math.floor(summary.spent);
  return (
    <Card variant="hero">
      <div className="hero-label">Spending · {summary.monthLabel}</div>
      <div className="hero-amount">
        ${whole.toLocaleString()}
        <span className="cents">.{cents}</span>
      </div>
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

/** Replace the highlight phrase in body with an <em> for visual emphasis. */
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
