import AppHeader from '../components/layout/AppHeader.jsx';
import Card from '../components/ui/Card.jsx';
import SectionHead from '../components/ui/SectionHead.jsx';
import Button from '../components/ui/Button.jsx';
import Insight from '../components/ui/Insight.jsx';
import Icon from '../components/icons/Icon.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import { useInsights, useWeeklyPattern } from '../hooks/useData.js';
import { currentMonth } from '../utils/date.js';
import { useToast } from '../context/ToastContext.jsx';

export default function InsightsScreen() {
  const month = currentMonth();
  const insights = useInsights(month);
  const pattern = useWeeklyPattern(month);
  const toast = useToast();

  // Pick the top "spike" or "over-budget" insight as the primary AI-style card
  const primary = insights.data?.find((i) => i.type === 'over-budget' || i.type === 'spike');
  const others  = insights.data?.filter((i) => i !== primary) || [];

  return (
    <>
      <AppHeader
        label="Smart tips"
        title="Insights"
        right={<button className="icon-btn" style={{ color: 'var(--accent)' }}><Icon name="spark" size={16} /></button>}
      />

      {/* Primary AI tip */}
      <AsyncBoundary state={insights} emptyTitle="No patterns yet" emptySub="We'll surface spending patterns as you log more transactions." emptyIcon="spark">
        {primary && (
          <Card className="ai-card">
            <div className="ai-chip">
              <Icon name="spark" size={10} strokeWidth={1.6} />
              Pattern detected
            </div>
            <div className="ai-tip-title">{primary.title}</div>
            <div className="ai-tip-body">{primary.body}</div>
            <div className="ai-cta">
              <Button variant="primary" onClick={() => toast.show('Opening category…')}>Review</Button>
              <Button variant="secondary" onClick={() => toast.show('Dismissed')}>Dismiss</Button>
            </div>
          </Card>
        )}
      </AsyncBoundary>

      {/* Spending patterns */}
      <SectionHead title="Spending patterns" />
      <AsyncBoundary state={pattern}>
        {pattern.data && (() => {
          const days = pattern.data; // [{label:'Sun',value:...}, ...]
          const maxVal = Math.max(...days.map((d) => d.value), 1);
          const topIdx = days.reduce((best, d, i) => d.value > days[best].value ? i : best, 0);
          const topDay = days[topIdx].label;
          const topAvg = Math.round(days[topIdx].value / 4);
          // Mon-first display order
          const order = [1,2,3,4,5,6,0];
          const labels = ['M','T','W','T','F','S','S'];
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
                    Avg ${topAvg} this month
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
                  const day = days[srcIdx];
                  const isTop = srcIdx === topIdx;
                  const heightPct = Math.max((day.value / maxVal) * 100, 4);
                  return (
                    <div
                      key={i}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
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
            </Card>
          );
        })()}
      </AsyncBoundary>

      {/* Other insights */}
      {others.length > 0 && (
        <>
          <SectionHead title="Smart suggestions" />
          <Card>
            {others.map((tip, i) => (
              <Insight key={i} icon={tip.icon || 'spark'} iconTone={tip.type === 'over-budget' ? 'default' : 'primary'} title={tip.title}>
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
