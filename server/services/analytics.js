/**
 * analytics.js — server-side aggregations.
 * Pure functions over transactions; called by /api/analytics routes.
 */
import { readTransactions, readJSON } from './storage.proxy.js';

function pad(n) { return String(n).padStart(2, '0'); }

function monthBounds(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const from = `${yyyymm}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${yyyymm}-${pad(lastDay)}`;
  return { from, to };
}

function offsetMonth(yyyymm, delta) {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function daysInMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function daysRemaining(yyyymm, today = new Date()) {
  const [y, m] = yyyymm.split('-').map(Number);
  const isCurrentMonth = today.getFullYear() === y && (today.getMonth() + 1) === m;
  if (!isCurrentMonth) {
    const last = new Date(y, m, 0);
    return last < today ? 0 : daysInMonth(yyyymm);
  }
  return daysInMonth(yyyymm) - today.getDate();
}

const MONTH_NAMES_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthLabel(yyyymm, short = false) {
  const m = Number(yyyymm.slice(5, 7));
  return short ? MONTH_NAMES_SHORT[m - 1] : MONTH_NAMES_FULL[m - 1];
}

function totalSpending(txns) {
  return txns.filter((t) => !t.isIncome).reduce((sum, t) => sum + t.amount, 0);
}

function spendingByCategory(txns) {
  const out = {};
  for (const t of txns) {
    if (t.isIncome) continue;
    out[t.category] = (out[t.category] || 0) + t.amount;
  }
  return out;
}

function averageDailySpent(txns, yyyymm) {
  const total = totalSpending(txns);
  const spentDays = Math.max(1, daysInMonth(yyyymm) - daysRemaining(yyyymm));
  return total / spentDays;
}

/**
 * Normalize budgets to always be an array of { categoryId, amount }.
 * Handles both storage shapes:
 *   object: { "food": 500, "transport": 200 }  ← written by config.js routes
 *   array:  [{ categoryId: "food", amount: 500 }] ← legacy / seeded data
 */
function normalizeBudgets(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([categoryId, amount]) => ({ categoryId, amount }));
  }
  return [];
}

export async function monthSummary(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const [txns, settings] = await Promise.all([
    readTransactions({ from, to }),
    readJSON('settings.json', { monthlyBudget: 0 })
  ]);
  const spent = totalSpending(txns);
  const budget = settings.monthlyBudget || 0;
  return {
    month: yyyymm,
    monthLabel: monthLabel(yyyymm),
    spent: Math.round(spent * 100) / 100,
    budget,
    remaining: Math.max(0, Math.round((budget - spent) * 100) / 100),
    daysLeft: daysRemaining(yyyymm),
    txnCount: txns.length
  };
}

export async function budgetUtilization(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const [txns, rawBudgets, categories] = await Promise.all([
    readTransactions({ from, to }),
    readJSON('budgets.json', []),
    readJSON('categories.json', [])
  ]);
  const budgets = normalizeBudgets(rawBudgets);
  const budgetMap = Object.fromEntries(budgets.map((b) => [b.categoryId, b.amount || 0]));
  const byCat = spendingByCategory(txns);
  const rows = categories
    .filter((c) => c.id !== 'income')
    .map((cat) => {
      const budget = budgetMap[cat.id] || 0;
      const spent = byCat[cat.id] || 0;
      const remaining = Math.max(0, budget - spent);
      const pct = budget ? (spent / budget) * 100 : 0;
      return {
        id: cat.id,
        categoryId: cat.id,
        name: cat.name,
        icon: cat.icon || null,
        tone: cat.tone || null,
        budget,
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        pct: Math.round(pct)
      };
    })
    .sort((a, b) => b.pct - a.pct);
  return rows;
}

export async function categoryBreakdown({ from, to }) {
  const txns = await readTransactions({ from, to });
  const categories = await readJSON('categories.json', []);
  const byCat = spendingByCategory(txns);
  const total = Object.values(byCat).reduce((s, v) => s + v, 0) || 1;
  const colors = ['var(--primary)', '#4C6B5D', 'var(--accent)', '#C9B48A', 'var(--border-strong)'];
  const sorted = categories
    .filter((c) => c.id !== 'income' && byCat[c.id])
    .map((c) => ({ id: c.id, name: c.name, value: byCat[c.id] || 0 }))
    .sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 4);
  const rest = sorted.slice(4);
  const restTotal = rest.reduce((s, c) => s + c.value, 0);
  const slices = [
    ...top.map((c, i) => ({
      label: c.name,
      value: Math.round(c.value * 100) / 100,
      color: colors[i] || colors[colors.length - 1]
    }))
  ];
  if (restTotal > 0) {
    slices.push({
      label: 'Other',
      value: Math.round(restTotal * 100) / 100,
      color: colors[4]
    });
  }
  return { total: Math.round(total * 100) / 100, slices };
}

export async function monthlyTrend(endMonth, count = 6) {
  const months = [];
  for (let i = count - 1; i >= 0; i--) months.push(offsetMonth(endMonth, -i));
  const data = [];
  for (const m of months) {
    const { from, to } = monthBounds(m);
    const txns = await readTransactions({ from, to });
    data.push({ month: m, label: monthLabel(m, true), value: Math.round(totalSpending(txns) * 100) / 100 });
  }
  return data;
}

export async function categoryComparison(yyyymm) {
  const prevMonth = offsetMonth(yyyymm, -1);
  const cur = monthBounds(yyyymm);
  const prev = monthBounds(prevMonth);
  const [curTxns, prevTxns, categories] = await Promise.all([
    readTransactions(cur),
    readTransactions(prev),
    readJSON('categories.json', [])
  ]);
  const curBy = spendingByCategory(curTxns);
  const prevBy = spendingByCategory(prevTxns);
  const top = categories
    .filter((c) => c.id !== 'income')
    .map((c) => ({
      id: c.id, name: c.name, tone: c.tone,
      current: Math.round((curBy[c.id] || 0) * 100) / 100,
      previous: Math.round((prevBy[c.id] || 0) * 100) / 100
    }))
    .sort((a, b) => b.current - a.current)
    .slice(0, 5);
  return top;
}

export async function forecast(endMonth, past = 6, future = 6) {
  const history = await monthlyTrend(endMonth, past);
  const avg = history.reduce((s, d) => s + d.value, 0) / (history.length || 1);
  const data = [...history.map((d) => ({ ...d, projected: false }))];
  for (let i = 1; i <= future; i++) {
    const m = offsetMonth(endMonth, i);
    data.push({ month: m, label: monthLabel(m, true), value: Math.round(avg * 100) / 100, projected: true });
  }
  return data;
}

export async function insights(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const prev = monthBounds(offsetMonth(yyyymm, -1));
  const [curTxns, prevTxns, rawBudgets, categories] = await Promise.all([
    readTransactions({ from, to }),
    readTransactions(prev),
    readJSON('budgets.json', []),
    readJSON('categories.json', [])
  ]);
  const budgets = normalizeBudgets(rawBudgets);
  const out = [];
  const curBy = spendingByCategory(curTxns);
  const prevBy = spendingByCategory(prevTxns);

  for (const cat of categories) {
    if (cat.id === 'income') continue;
    const cur = curBy[cat.id] || 0;
    const prev = prevBy[cat.id] || 0;
    if (prev > 50 && cur > prev * 1.15) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      out.push({ type: 'spike', icon: 'spark', title: `${cat.name} up sharply`, body: `You spent ${pct}% more on ${cat.name.toLowerCase()} than last month.`, highlight: `${pct}% more`, category: cat.id });
      break;
    }
  }

  const budgetMap = Object.fromEntries(budgets.map((b) => [b.categoryId, b.amount || 0]));
  const overs = categories
    .filter((c) => c.id !== 'income')
    .map((c) => ({ category: c.name, over: Math.round(((curBy[c.id] || 0) - (budgetMap[c.id] || 0)) * 100) / 100 }))
    .filter((x) => x.over > 0)
    .sort((a, b) => b.over - a.over);
  if (overs.length) {
    const top = overs[0];
    out.push({ type: 'over-budget', icon: 'alert', title: `Over budget on ${top.category}`, body: `You're $${top.over.toFixed(2)} over your ${top.category.toLowerCase()} budget this month.`, highlight: `$${top.over.toFixed(2)}`, category: top.category.toLowerCase() });
  }

  const dayTotals = [0,0,0,0,0,0,0];
  const dayCounts = [0,0,0,0,0,0,0];
  for (const t of curTxns) {
    if (t.isIncome) continue;
    const dow = new Date(t.date).getDay();
    dayTotals[dow] += t.amount;
    dayCounts[dow]++;
  }
  const dayAvgs = dayTotals.map((total, i) => dayCounts[i] ? total / dayCounts[i] : 0);
  let topDay = 0;
  for (let i = 1; i < 7; i++) if (dayAvgs[i] > dayAvgs[topDay]) topDay = i;
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (dayAvgs[topDay] > 0) {
    out.push({ type: 'pattern', icon: 'spark', title: 'Spending pattern detected', body: `${dayNames[topDay]} is your highest-spend day, averaging $${Math.round(dayAvgs[topDay])}.`, highlight: `${dayNames[topDay]}`, pattern: { dayTotals, dayNames, topDay } });
  }
  return out;
}

export async function weeklyPattern(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const txns = await readTransactions({ from, to });
  const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const sums = Array(7).fill(0);
  txns.filter((t) => !t.isIncome).forEach((t) => {
    sums[new Date(t.date).getDay()] += t.amount;
  });
  return labels.map((label, i) => ({ label, value: Math.round(sums[i] * 100) / 100 }));
}
