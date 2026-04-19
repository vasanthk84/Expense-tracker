import { useMemo, useState } from 'react';
import AppHeader from '../components/layout/AppHeader.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import Chip from '../components/ui/Chip.jsx';
import TxnRow from '../components/ui/TxnRow.jsx';
import Icon from '../components/icons/Icon.jsx';
import { AsyncBoundary } from '../components/ui/AsyncStates.jsx';
import { useTransactions, useCategories } from '../hooks/useData.js';
import { groupByDate } from '../utils/date.js';
import EditExpenseModal from './EditExpenseModal.jsx';

export default function ExpensesScreen() {
  const [activeCat, setActiveCat] = useState('all');
  const [query, setQuery] = useState('');
  const [collapsedDates, setCollapsedDates] = useState({});
  const [editing, setEditing] = useState(null); // full txn object

  const txnsState = useTransactions({ category: activeCat });
  const categoriesState = useCategories();

  const toggleDate = (date) =>
    setCollapsedDates((prev) => ({ ...prev, [date]: !prev[date] }));

  // Build chip list from real categories (top 5)
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

  // Apply search filter client-side
  const filtered = useMemo(() => {
    if (!txnsState.data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return txnsState.data;
    return txnsState.data.filter((t) =>
      t.merchant.toLowerCase().includes(q) ||
      t.note?.toLowerCase().includes(q)
    );
  }, [txnsState.data, query]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <>
      <AppHeader
        label="Transactions"
        title="Expenses"
        right={<button className="icon-btn"><Icon name="bell" size={16} /></button>}
      />

      <SearchBar
        placeholder="Search transactions\u2026"
        value={query}
        onChange={setQuery}
      />

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
        {grouped.map((group) => {
          const isCollapsed = !!collapsedDates[group.date];
          const dayTotal = group.items.reduce(
            (sum, t) => (t.isIncome ? sum : sum + Math.abs(t.amount)),
            0
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
                  <span style={{
                    fontSize: 12,
                    color: 'var(--ink-2)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
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
                          name: t.merchant,
                          meta: `${catLabel(t.category)}${t.note ? ` \u00b7 ${t.note}` : ''}`,
                          amount: t.amount,
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
        })}
        {grouped.length === 0 && filtered.length === 0 && query && (
          <div className="empty-state">
            <div className="empty-state-title">No matches</div>
            <div className="empty-state-sub">Try a different search term.</div>
          </div>
        )}
      </AsyncBoundary>

      <div style={{ height: 30 }} />

      <EditExpenseModal txn={editing} onClose={() => setEditing(null)} />
    </>
  );
}
