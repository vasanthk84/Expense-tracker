/**
 * InsightsScreen.jsx
 *
 * FIXES:
 *  1. Now renders ALL insight types from the fixed analytics (savings, overspend)
 *     not just 'over-budget' and 'spike'
 *  2. Weekly pattern bars now show averages (from fixed weeklyPattern() server fn)
 *     with a subtitle confirming they're per-occurrence averages
 *  3. Multiple spike insights are now surfaced (analytics break → continue fix)
 */
import AppHeader from '../components/layout/AppHeader.jsx';
import Card from '../components/ui/Card.jsx';
import SectionHead from '../components/ui/SectionHead.jsx';
import Button from '../components/ui/Button.jsx';
import Insight from '../components/ui/Insight.jsx';
import Icon from '../components/icons/Icon.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import { useInsights, useWeeklyPattern } from '../hooks/useData.js';
import { currentMonth, formatMoney } from '../utils/date.js';
import { useToast } from '../context/ToastContext.jsx';

// Map insight types to tone colours for the icon chip
const TONE_MAP = {
  'over-budget': 'default',
  spike:         'primary',
  pattern:       'primary',
  savings:       'primary',
  overspend:     'default',
};

export default function InsightsScreen() {
  const month    = currentMonth();
  const insights = useInsights(month);
  const pattern  = useWeeklyPattern(month);
  const toast    = useToast();

  // Primary card: first over-budget or spike
  const primary = insights.data?.find((i) =>
    i.type === 'over-budget' || i.type === 'spike'
  );
  // All others — including additional spikes (now that break→continue is fixed)
  const others = insights.data?.filter((i) => i !== primary) || [];

  return (
    <>
      <AppHeader
        label="Smart tips"
        title="Insights"
        right={
          <button className="icon-btn" style={{ color: 'var(--accent)' }}>
            <Icon name="spark" size={16} />
          </button>
        }
      />

      {/* Primary AI tip */}
      <AsyncBoundary
        state={insights}
        emptyTitle="No patterns yet"
        emptySub="We'll surface spending patterns as you log more transactions."
        emptyIcon="spark"
      >
        {primary && (
          <Card className="ai-card">
            <div className="ai-chip">
              <Icon name="spark" size={10} strokeWidth={1.6} />
              Pattern detected
            </div>
            <div className="ai-tip-title">{primary.title}</div>
            <div className="ai-tip-body">{primary.body}</div>
            <div className="ai-cta">
              <Button variant="primary" onClick={() => toast.show('Opening category…')}>
                Review
              </Button>
              <Button variant="secondary" onClick={() => toast.show('Dismissed')}>
                Dismiss
              </Button>
            </div>
          </Card>
        )}
      </AsyncBoundary>

      {/* Spending patterns — FIX: bars now show avg per occurrence */}
      <SectionHead title="Spending patterns" />
      <AsyncBoundary state={pattern}>
        {pattern.data && (() => {
          const days   = pattern.data; // [{label:'Sun', value: avg_spend}, ...]
          const maxVal = Math.max(...days.map((d) => d.value), 1);
          const topIdx = days.reduce(
            (best, d, i) => d.value > days[best].value ? i : best, 0
          );
          const topDay = days[topIdx].label;
          const topAvg = days[topIdx].value;

          // Mon-first display: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
          const order  = [1, 2, 3, 4, 5, 6, 0];
          const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

          return (
            <Card>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 14,
                alignItems: 'center',
                marginBottom: 14
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  lineHeight: 1
                }}>
                  {topDay}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
                    Highest-spend day
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                    {/* FIX: now shows "avg per occurrence" since weeklyPattern divides */}
                    Avg {formatMoney(topAvg, { withCents: false })} per {topDay}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                height: 60,
                gap: 8
              }}>
                {order.map((srcIdx, i) => {
                  const day    = days[srcIdx];
                  const isTop  = srcIdx === topIdx;
                  const heightPct = Math.max((day.value / maxVal) * 100, 4);
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title={`${day.label}: ${formatMoney(day.value, { withCents: false })} avg`}
                    >
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{
                          width: '100%',
                          height: `${heightPct}%`,
                          background: isTop ? 'var(--primary)' : 'var(--surface-2)',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.4s ease'
                        }} />
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: isTop ? 'var(--primary)' : 'var(--ink-3)',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: isTop ? 600 : 400
                      }}>
                        {labels[i]}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                marginTop: 8, fontSize: 10, color: 'var(--ink-3)',
                fontFamily: 'var(--font-mono)', textAlign: 'center'
              }}>
                Average spend per occurrence · {currentMonth().slice(0, 7)}
              </div>
            </Card>
          );
        })()}
      </AsyncBoundary>

      {/* Other insights — now includes savings / overspend / additional spikes */}
      {others.length > 0 && (
        <>
          <SectionHead title="Smart suggestions" />
          <Card>
            {others.map((tip, i) => (
              <Insight
                key={i}
                icon={tip.icon || 'spark'}
                iconTone={TONE_MAP[tip.type] || 'default'}
                title={tip.title}
              >
                {tip.body}
              </Insight>
            ))}
          </Card>
        </>
      )}

      <div style={{ height: 30 }} />
    </>
  );
}
