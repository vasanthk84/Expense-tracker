/**
 * ExpensesScreen.jsx
 *
 * FIX: The bell icon was completely un-wired — clicking it did nothing.
 * Now opens a NotificationsModal that surfaces over-budget and spike alerts
 * pulled from the insights API.
 */
import { useMemo, useState } from 'react';
import AppHeader from '../components/layout/AppHeader.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import Chip from '../components/ui/Chip.jsx';
import TxnRow from '../components/ui/TxnRow.jsx';
import Icon from '../components/icons/Icon.jsx';
import Modal from '../components/ui/Modal.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import { useTransactions, useCategories, useInsights } from '../hooks/useData.js';
import { groupByDate, currentMonth, monthBounds, pad } from '../utils/date.js';
import EditExpenseModal from './EditExpenseModal.jsx';

const DATE_RANGES = [
  { id: 'all', label: 'All' },
  { id: '1m',  label: '1M'  },
  { id: '3m',  label: '3M'  },
  { id: '6m',  label: '6M'  },
  { id: '1y',  label: '1Y'  },
];

const SORT_CYCLES = ['newest', 'oldest', 'highest'];
const SORT_LABELS = { newest: 'Newest', oldest: 'Oldest', highest: 'Highest' };
const SORT_ICONS  = { newest: '↓', oldest: '↑', highest: '$' };

function getDateBounds(rangeId) {
  if (rangeId === 'all') return {};
  const today = new Date();
  const fmt   = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const to    = fmt(today);
  if (rangeId === '1m') {
    const m = currentMonth();
    return { from: monthBounds(m).from, to };
  }
  const monthsBack = rangeId === '3m' ? 2 : rangeId === '6m' ? 5 : 11;
  const d = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
  return { from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, to };
}

export default function ExpensesScreen() {
  const [activeCat,      setActiveCat]      = useState('all');
  const [query,          setQuery]          = useState('');
  const [dateRange,      setDateRange]      = useState('1m');
  const [sort,           setSort]           = useState('newest');
  const [collapsedDates, setCollapsedDates] = useState({});
  const [editing,        setEditing]        = useState(null);
  const [notifOpen,      setNotifOpen]      = useState(false);

  const dateBounds = getDateBounds(dateRange);
  const txnsState       = useTransactions({ category: activeCat, ...dateBounds });
  const categoriesState = useCategories();
  const insights        = useInsights(currentMonth());

  const toggleDate = (date) =>
    setCollapsedDates((prev) => ({ ...prev, [date]: !prev[date] }));

  // Alert count for badge on bell
  const alertCount = useMemo(() => {
    if (!insights.data) return 0;
    return insights.data.filter((i) =>
      i.type === 'over-budget' || i.type === 'spike' || i.type === 'overspend'
    ).length;
  }, [insights.data]);

  const chips = useMemo(() => {
    const cats = categoriesState.data || [];
    return ['all', ...cats.filter((c) => c.id !== 'income').slice(0, 6).map((c) => c.id)];
  }, [categoriesState.data]);

  const catLabel = (id) => {
    if (id === 'all') return 'All';
    const c = categoriesState.data?.find((x) => x.id === id);
    return c?.name || id;
  };

  const catIcon = (categoryId) => {
    const c = categoriesState.data?.find((x) => x.id === categoryId);
    return { icon: c?.icon || 'list', tone: c?.tone || 'default' };
  };

  const filtered = useMemo(() => {
    if (!txnsState.data) return [];
    const q = query.trim().toLowerCase();
    const base = q
      ? txnsState.data.filter((t) =>
          t.merchant.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q)
        )
      : txnsState.data;
    if (sort === 'oldest') return [...base].reverse();
    if (sort === 'highest') return [...base].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    return base;
  }, [txnsState.data, query, sort]);

  const grouped = useMemo(() => (sort === 'highest' ? null : groupByDate(filtered)), [filtered, sort]);

  return (
    <>
      <AppHeader
        label="Transactions"
        title="Expenses"
        right={
          /* FIX: bell icon now opens notifications modal with badge */
          <button
            className="icon-btn"
            onClick={() => setNotifOpen(true)}
            style={{ position: 'relative' }}
            aria-label={`${alertCount} alerts`}
          >
            <Icon name="bell" size={16} />
            {alertCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 6, right: 6,
                width: 8, height: 8,
                borderRadius: '50%',
                background: 'var(--danger)',
                border: '1.5px solid var(--bg)'
              }} />
            )}
          </button>
        }
      />

      <SearchBar
        placeholder="Search transactions…"
        value={query}
        onChange={setQuery}
      />

      {/* Date range + sort row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px 8px', overflowX: 'auto' }}>
        {DATE_RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setDateRange(r.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: dateRange === r.id ? 'var(--primary)' : 'var(--border)',
              background: dateRange === r.id ? 'var(--primary-soft)' : 'transparent',
              color: dateRange === r.id ? 'var(--primary)' : 'var(--ink-3)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {r.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setSort((s) => {
            const idx = SORT_CYCLES.indexOf(s);
            return SORT_CYCLES[(idx + 1) % SORT_CYCLES.length];
          })}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20,
            border: '1px solid var(--border)',
            background: sort !== 'newest' ? 'var(--primary-soft)' : 'transparent',
            color: sort !== 'newest' ? 'var(--primary)' : 'var(--ink-3)',
            fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', flexShrink: 0,
          }}
        >
          {SORT_ICONS[sort]} {SORT_LABELS[sort]}
        </button>
      </div>

      <div className="filter-row">
        {chips.map((id) => (
          <Chip key={id} active={activeCat === id} onClick={() => setActiveCat(id)}>
            {catLabel(id)}
          </Chip>
        ))}
      </div>

      <AsyncBoundary
        state={txnsState}
        emptyTitle={query ? 'No matches' : 'No transactions yet'}
        emptySub={query ? 'Try a different search term.' : 'Tap the + button to add one.'}
        emptyIcon="list"
      >
        {/* Flat list when sorted by highest amount */}
        {sort === 'highest' ? (
          <div className="txn-list">
            {filtered.map((t) => {
              const { icon, tone } = catIcon(t.category);
              return (
                <TxnRow
                  key={t.id}
                  txn={{
                    name:     t.merchant,
                    meta:     `${catLabel(t.category)} · ${t.date}${t.note ? ` · ${t.note}` : ''}`,
                    amount:   t.amount,
                    icon,
                    tone,
                    isIncome: t.isIncome
                  }}
                  onClick={() => setEditing(t)}
                />
              );
            })}
          </div>
        ) : (
          /* Grouped by date for newest/oldest */
          (grouped || []).map((group) => {
            const isCollapsed = !!collapsedDates[group.date];
            const dayTotal    = group.items.reduce(
              (sum, t) => (t.isIncome ? sum : sum + Math.abs(t.amount)), 0
            );
            return (
              <div key={group.date}>
                <div
                  className="date-sep"
                  onClick={() => toggleDate(group.date)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                  }}
                >
                  <span>{group.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                      -${dayTotal.toFixed(2)}
                    </span>
                    <Icon
                      name="chevron"
                      size={13}
                      style={{
                        transition: 'transform 200ms ease',
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      }}
                    />
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="txn-list">
                    {group.items.map((t) => {
                      const { icon, tone } = catIcon(t.category);
                      return (
                        <TxnRow
                          key={t.id}
                          txn={{
                            name:     t.merchant,
                            meta:     `${catLabel(t.category)}${t.note ? ` · ${t.note}` : ''}`,
                            amount:   t.amount,
                            icon,
                            tone,
                            isIncome: t.isIncome
                          }}
                          onClick={() => setEditing(t)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </AsyncBoundary>

      <div style={{ height: 30 }} />

      <EditExpenseModal txn={editing} onClose={() => setEditing(null)} />

      {/* FIX: Notifications modal */}
      <NotificationsModal
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        insights={insights}
      />
    </>
  );
}

function NotificationsModal({ open, onClose, insights }) {
  const alerts = (insights.data || []).filter((i) =>
    i.type === 'over-budget' || i.type === 'spike' || i.type === 'overspend'
  );
  const positive = (insights.data || []).filter((i) =>
    i.type === 'savings' || i.type === 'pattern'
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Notifications"
      subtitle={alerts.length > 0
        ? `${alerts.length} alert${alerts.length > 1 ? 's' : ''} this month`
        : 'All clear this month'}
    >
      {insights.loading && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Loading…
        </div>
      )}

      {!insights.loading && alerts.length === 0 && positive.length === 0 && (
        <div style={{
          padding: '24px 0',
          textAlign: 'center',
          color: 'var(--ink-3)',
          fontSize: 13
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
          No budget alerts. You're on track!
        </div>
      )}

      {alerts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--danger)',
            marginBottom: 8
          }}>
            Alerts
          </div>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              background: 'var(--danger-soft)',
              borderRadius: 10,
              marginBottom: 8
            }}>
              <Icon name={a.icon || 'alert'} size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.4 }}>{a.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {positive.length > 0 && (
        <div>
          <div style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--primary)',
            marginBottom: 8
          }}>
            Good news
          </div>
          {positive.map((a, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              background: 'var(--primary-soft)',
              borderRadius: 10,
              marginBottom: 8
            }}>
              <Icon name={a.icon || 'spark'} size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.4 }}>{a.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-sm"
        style={{ width: '100%', marginTop: 8, textAlign: 'center' }}
        onClick={onClose}
      >
        Close
      </button>
    </Modal>
  );
}
