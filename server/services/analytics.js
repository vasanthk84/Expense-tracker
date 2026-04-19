/**
 * analytics.js — server-side aggregations.
 * Pure functions over transactions; called by /api/analytics routes.
 */
import { readTransactions, readJSON } from './storage.proxy.js';  // ← changed

/* --------- date helpers --------- */

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

const MONTH_NAMES_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthLabel(yyyymm, short = false) {
  const m = Number(yyyymm.slice(5, 7));
  return short ? MONTH_NAMES_SHORT[m - 1] : MONTH_NAMES_FULL[m - 1];
}

/* --------- aggregations --------- */

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

/* --------- public API --------- */

export async function monthSummary(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const txns = await readTransactions({ from, to });
  const settings = await readJSON('settings.json', { monthlyBudget: 0 });
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
  const txns = await readTransactions({ from, to });
  const budgets = await readJSON('budgets.json', {});
  const categories = await readJSON('categories.json', []);
  const spent = spendingByCategory(txns);
  return categories
    .filter((c) => c.id !== 'income')
    .map((cat) => {
      const s = Math.round((spent[cat.id] || 0) * 100) / 100;
      const b = budgets[cat.id] || 0;
      const pct = b > 0 ? Math.round((s / b) * 100) : 0;
      return { id: cat.id, name: cat.name, icon: cat.icon, tone: cat.tone, spent: s, budget: b, pct };
    });
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
      value: Math.round((c.value / total) * 100),
      amount: Math.round(c.value * 100) / 100,
      color: colors[i] || colors[colors.length - 1]
    }))
  ];
  if (restTotal > 0) {
    slices.push({
      label: 'Other',
      value: Math.round((restTotal / total) * 100),
      amount: Math.round(restTotal * 100) / 100,
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
  return top.map((c) => ({
    label: c.name.slice(0, 4).toLowerCase(),
    fullLabel: c.name,
    current: c.current,
    previous: c.previous,
    tone: c.tone === 'accent' ? 'accent' : undefined
  }));
}

export async function forecast(endMonth, pastMonths = 6, futureMonths = 6) {
  const trend = await monthlyTrend(endMonth, pastMonths);
  const values = trend.map((d) => d.value).filter((v) => v > 0);
  if (!values.length) return { actual: trend, forecast: [], upper: [], lower: [], projected: 0, yoyChange: 0 };
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const n = values.length;
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - avg);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const lastValue = values[values.length - 1];
  const forecastPoints = [{ month: endMonth, label: monthLabel(endMonth, true), value: lastValue }];
  for (let i = 1; i <= futureMonths; i++) {
    const m = offsetMonth(endMonth, i);
    const projected = Math.max(0, Math.round((avg + slope * (n - 1 + i)) * 100) / 100);
    forecastPoints.push({ month: m, label: monthLabel(m, true), value: projected });
  }
  const upper = forecastPoints.map((p) => ({ ...p, value: Math.round(p.value * 1.1 * 100) / 100 }));
  const lower = forecastPoints.map((p) => ({ ...p, value: Math.round(p.value * 0.9 * 100) / 100 }));
  const projected = forecastPoints.slice(1).reduce((s, p) => s + p.value, 0);
  const yoyChange = Math.round(((slope * futureMonths) / avg) * 100 * 10) / 10;
  return {
    actual: trend, forecast: forecastPoints, upper, lower,
    projected: Math.round(projected), yoyChange,
    period: `${monthLabel(forecastPoints[1].month, true)} → ${monthLabel(forecastPoints[forecastPoints.length - 1].month, true)}`
  };
}

export async function insights(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const prev = monthBounds(offsetMonth(yyyymm, -1));
  const [curTxns, prevTxns, categories, budgets] = await Promise.all([
    readTransactions({ from, to }),
    readTransactions(prev),
    readJSON('categories.json', []),
    readJSON('budgets.json', {})
  ]);
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

  const overs = [];
  for (const cat of categories) {
    if (cat.id === 'income') continue;
    const spent = curBy[cat.id] || 0;
    const budget = budgets[cat.id] || 0;
    if (budget > 0 && spent > budget) overs.push({ category: cat.name, over: Math.round((spent - budget) * 100) / 100 });
  }
  if (overs.length) {
    const top = overs.sort((a, b) => b.over - a.over)[0];
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
  const dayTotals = [0,0,0,0,0,0,0];
  for (const t of txns) {
    if (t.isIncome) continue;
    const dow = new Date(t.date).getDay();
    dayTotals[dow] += t.amount;
  }
  const max = Math.max(...dayTotals, 1);
  const order = [1,2,3,4,5,6,0];
  const labels = ['M','T','W','T','F','S','S'];
  const totals = order.map((i) => dayTotals[i]);
  const topIdx = totals.indexOf(Math.max(...totals));
  return {
    days: order.map((i, idx) => ({
      day: labels[idx],
      value: Math.round((dayTotals[i] / max) * 100),
      amount: Math.round(dayTotals[i] * 100) / 100,
      highlight: idx === topIdx
    })),
    topDay: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][topIdx],
    topAvg: Math.round(totals[topIdx] / 4)
  };
}
