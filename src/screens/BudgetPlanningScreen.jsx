/**
 * BudgetPlanningScreen.jsx
 *
 * FIX: bp-vals was rendering raw numbers like `$186.4` instead of `$186.40`
 * and `0` instead of `$0.00`.  Now uses formatMoney() consistently.
 * Also shows overAmount formatted correctly.
 */
import { useState } from 'react';
import AppHeader from '../components/layout/AppHeader.jsx';
import Card from '../components/ui/Card.jsx';
import SectionHead from '../components/ui/SectionHead.jsx';
import CategoryIcon from '../components/ui/CategoryIcon.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/icons/Icon.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import {
  useBudgetUtilization,
  useMonthSummary,
  useBudgetMutations
} from '../hooks/useData.js';
import { useToast } from '../context/ToastContext.jsx';
import { currentMonth, formatMoney } from '../utils/date.js';

export default function BudgetPlanningScreen() {
  const month       = currentMonth();
  const summary     = useMonthSummary(month);
  const utilization = useBudgetUtilization(month);
  const { setCategory } = useBudgetMutations();
  const toast = useToast();

  const [editing, setEditing] = useState(null); // { id, name, budget }
  const [draft,   setDraft]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const startEdit = (cat) => {
    setEditing(cat);
    setDraft(String(cat.budget || ''));
  };

  const save = async () => {
    const value = Number(draft);
    if (Number.isNaN(value) || value < 0) {
      toast.show('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await setCategory(editing.id, value);
      toast.show(`${editing.name} budget updated`);
      setEditing(null);
    } catch {
      toast.show('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppHeader
        label="Planning"
        title="Budgets"
        right={<button className="icon-btn"><Icon name="plus" size={16} /></button>}
      />

      <AsyncBoundary state={summary}>
        {summary.data && <UtilizationCard summary={summary.data} />}
      </AsyncBoundary>

      <SectionHead title="Category budgets" action="Tap to edit" />

      <AsyncBoundary state={utilization}>
        {utilization.data && (
          <Card variant="flush">
            {utilization.data.map((b) => {
              const isOver     = b.pct > 100;
              const overAmount = b.spent - b.budget;
              return (
                <div
                  key={b.id}
                  className="budget-plan-row"
                  onClick={() => startEdit(b)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="bp-head">
                    <div className="bp-title">
                      <CategoryIcon icon={b.icon} tone={b.tone} />
                      <div>
                        <div className="bp-name">{b.name}</div>
                        <div className={`bp-pct ${isOver ? 'danger' : ''}`}>
                          {b.budget > 0
                            ? `${b.pct}% ${isOver ? '· over' : 'used'}`
                            : 'No budget set'}
                        </div>
                      </div>
                    </div>
                    {/* FIX: was `${b.spent}` / `${b.budget}` — now formatMoney */}
                    <div className={`bp-vals ${isOver ? 'over' : ''}`}>
                      <span className="spent">
                        {formatMoney(b.spent, { withCents: true })}
                      </span>
                      {' / '}
                      {formatMoney(b.budget, { withCents: true })}
                    </div>
                  </div>
                  {b.budget > 0 && <ProgressBar value={b.pct} size="md" />}
                  {isOver && (
                    <div className="bp-alert">
                      <Icon name="alert" size={12} />
                      {formatMoney(overAmount, { withCents: true })} over budget. Consider reducing by week's end.
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </AsyncBoundary>

      <Modal
        open={!!editing}
        onClose={() => !saving && setEditing(null)}
        title={editing ? `Edit ${editing.name} budget` : ''}
        subtitle="Monthly limit for this category"
      >
        <div className="amount-field">
          <div className="amount-label">Monthly budget</div>
          <div className="amount-display">
            <span className="amount-currency">$</span>
            <input
              className="amount-value"
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              min="0"
              step="10"
            />
          </div>
        </div>
        <Button size="md" onClick={save}>
          {saving ? 'Saving…' : 'Save budget'}
        </Button>
        <button
          className="btn-sm"
          style={{
            width: '100%', marginTop: 8,
            background: 'transparent', border: 'none', color: 'var(--ink-3)'
          }}
          onClick={() => setEditing(null)}
          disabled={saving}
        >
          Cancel
        </button>
      </Modal>

      <div style={{ height: 30 }} />
    </>
  );
}

function UtilizationCard({ summary }) {
  const pct = summary.budget > 0
    ? Math.round((summary.spent / summary.budget) * 100)
    : 0;
  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="hero-label" style={{ color: 'var(--ink-3)' }}>
        {summary.monthLabel} utilization
      </div>
      <div className="hero-amount" style={{ color: 'var(--ink)', fontSize: 36 }}>
        {pct}<span style={{ fontSize: 22, opacity: 0.7 }}>%</span>
      </div>
      <div style={{
        marginTop: 14, height: 8,
        background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, pct)}%`,
          background: pct >= 100 ? 'var(--danger)' : pct >= 90 ? 'var(--accent)' : 'var(--primary)'
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)'
      }}>
        <span>{formatMoney(summary.spent, { withCents: false })} spent</span>
        <span>{formatMoney(summary.budget, { withCents: false })} budget</span>
      </div>
    </Card>
  );
}
