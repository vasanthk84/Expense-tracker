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

export async function monthSummary(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const txns = await readTransactions({ from, to });
  const total = totalSpending(txns);
  const avgDaily = averageDailySpent(txns, yyyymm);
  return {
    month: yyyymm,
    total: Math.round(total * 100) / 100,
    avgDaily: Math.round(avgDaily * 100) / 100,
    count: txns.filter((t) => !t.isIncome).length
  };
}

export async function budgetUtilization(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const [txns, budgets, categories] = await Promise.all([
    readTransactions({ from, to }),
    readJSON('budgets.json', []),
    readJSON('categories.json', [])
  ]);
  const byCat = spendingByCategory(txns);
  const rows = budgets.map((b) => {
    const cat = categories.find((c) => c.id === b.categoryId) || { name: b.categoryId };
    const spent = byCat[b.categoryId] || 0;
    const remaining = Math.max(0, (b.amount || 0) - spent);
    const pct = b.amount ? (spent / b.amount) * 100 : 0;
    return {
      categoryId: b.categoryId,
      name: cat.name,
      budget: b.amount,
      spent: Math.round(spent * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      pct: Math.round(pct)
    };
  }).sort((a, b) => b.pct - a.pct);
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
  const [txns, budgets, categories] = await Promise.all([
    readTransactions({ from, to }),
    readJSON('budgets.json', []),
    readJSON('categories.json', [])
  ]);
  const byCat = spendingByCategory(txns);
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const topBudgetOver = budgets
    .map((b) => ({ ...b, spent: byCat[b.categoryId] || 0 }))
    .filter((b) => b.amount > 0)
    .sort((a, b) => (b.spent / b.amount) - (a.spent / a.amount))[0];

  return {
    topCategory: topCat ? {
      id: topCat[0],
      name: (categories.find((c) => c.id === topCat[0]) || {}).name || topCat[0],
      amount: Math.round(topCat[1] * 100) / 100
    } : null,
    mostUtilizedBudget: topBudgetOver ? {
      categoryId: topBudgetOver.categoryId,
      name: (categories.find((c) => c.id === topBudgetOver.categoryId) || {}).name || topBudgetOver.categoryId,
      pct: Math.round((topBudgetOver.spent / topBudgetOver.amount) * 100),
      spent: Math.round(topBudgetOver.spent * 100) / 100,
      budget: Math.round(topBudgetOver.amount * 100) / 100
    } : null
  };
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
