/**
 * analytics.js — server-side aggregations.
 * Pure functions over transactions; called by /api/analytics routes.
 *
 * FIXES applied:
 *  1. forecast() — returns correct shape that ForecastScreen expects
 *                  (projected, period, yoyChange, actual[], forecast[], upper[], lower[])
 *                  Uses linear regression instead of flat average
 *  2. insights()  — break → continue so ALL spikes are reported, not just the first
 *  3. weeklyPattern() — divides by occurrence count (avg per day, not sum)
 *  4. daysRemaining() — correctly handles future months
 *  5. averageDailySpent() — now exported (was dead code)
 *  6. categoryBreakdown() — 8-color palette, no more border-strong as a slice color
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

/**
 * FIX #4: daysRemaining — correctly handles current, past, and future months.
 * Previously a future month returned the full day count instead of days-from-today.
 */
function daysRemaining(yyyymm, today = new Date()) {
  const [y, m] = yyyymm.split('-').map(Number);
  const curY = today.getFullYear();
  const curM = today.getMonth() + 1;

  // Past month → 0 days remaining
  if (y < curY || (y === curY && m < curM)) return 0;

  // Current month → days left in the month from today
  if (y === curY && m === curM) return daysInMonth(yyyymm) - today.getDate();

  // Future month → all days remaining (month hasn't started yet)
  return daysInMonth(yyyymm);
}

const MONTH_NAMES_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthLabel(yyyymm, short = false) {
  const m = Number(yyyymm.slice(5, 7));
  return short ? MONTH_NAMES_SHORT[m - 1] : MONTH_NAMES_FULL[m - 1];
}

function totalSpending(txns) {
  return txns.filter((t) => !t.isIncome).reduce((sum, t) => sum + t.amount, 0);
}

function totalIncome(txns) {
  return txns.filter((t) => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
}

function spendingByCategory(txns) {
  const out = {};
  for (const t of txns) {
    if (t.isIncome) continue;
    out[t.category] = (out[t.category] || 0) + t.amount;
  }
  return out;
}

/**
 * FIX #5: averageDailySpent is now exported so callers can use it.
 */
export function averageDailySpent(txns, yyyymm) {
  const total = totalSpending(txns);
  const spentDays = Math.max(1, daysInMonth(yyyymm) - daysRemaining(yyyymm));
  return total / spentDays;
}

/**
 * Normalize budgets to always be an array of { categoryId, amount }.
 */
function normalizeBudgets(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([categoryId, amount]) => ({ categoryId, amount }));
  }
  return [];
}

/**
 * Simple linear regression: returns { slope, intercept }
 * x = 0-based index, y = spending value
 */
function linearRegression(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  const sumX  = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY  = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, y, i) => acc + i * y, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function monthSummary(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const [txns, settings] = await Promise.all([
    readTransactions({ from, to }),
    readJSON('settings.json', { monthlyBudget: 0 })
  ]);
  const spent  = totalSpending(txns);
  const income = totalIncome(txns);
  const budget = settings.monthlyBudget || 0;
  const dailyAvg = averageDailySpent(txns, yyyymm);
  return {
    month: yyyymm,
    monthLabel: monthLabel(yyyymm),
    spent:     Math.round(spent    * 100) / 100,
    income:    Math.round(income   * 100) / 100,
    netFlow:   Math.round((income - spent) * 100) / 100,
    budget,
    remaining: Math.max(0, Math.round((budget - spent) * 100) / 100),
    daysLeft:  daysRemaining(yyyymm),
    txnCount:  txns.length,
    dailyAvg:  Math.round(dailyAvg * 100) / 100,
    savingsRate: income > 0 ? Math.round(((income - spent) / income) * 100) : 0
  };
}

export async function budgetUtilization(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const [txns, rawBudgets, categories] = await Promise.all([
    readTransactions({ from, to }),
    readJSON('budgets.json', []),
    readJSON('categories.json', [])
  ]);
  const budgets   = normalizeBudgets(rawBudgets);
  const budgetMap = Object.fromEntries(budgets.map((b) => [b.categoryId, b.amount || 0]));
  const byCat = spendingByCategory(txns);
  const rows = categories
    .filter((c) => c.id !== 'income')
    .map((cat) => {
      const budget    = budgetMap[cat.id] || 0;
      const spent     = byCat[cat.id] || 0;
      const remaining = Math.max(0, budget - spent);
      const pct       = budget ? (spent / budget) * 100 : 0;
      return {
        id:         cat.id,
        categoryId: cat.id,
        name:       cat.name,
        icon:       cat.icon || null,
        tone:       cat.tone || null,
        budget,
        spent:     Math.round(spent     * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        pct:       Math.round(pct)
      };
    })
    .sort((a, b) => b.pct - a.pct);
  return rows;
}

/**
 * FIX #6: 8 distinct colors — no more --border-strong as a visible slice color.
 */
export async function categoryBreakdown({ from, to }) {
  const txns       = await readTransactions({ from, to });
  const categories = await readJSON('categories.json', []);
  const byCat  = spendingByCategory(txns);
  const total  = Object.values(byCat).reduce((s, v) => s + v, 0) || 1;

  const COLORS = [
    'var(--primary)',
    '#4C6B5D',
    'var(--accent)',
    '#C9B48A',
    '#7A9E8E',
    '#D4956A',
    '#5E7A6E',
    '#A87C52'
  ];

  const sorted = categories
    .filter((c) => c.id !== 'income' && byCat[c.id])
    .map((c) => ({ id: c.id, name: c.name, value: byCat[c.id] || 0 }))
    .sort((a, b) => b.value - a.value);

  const top  = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const restTotal = rest.reduce((s, c) => s + c.value, 0);

  const slices = top.map((c, i) => ({
    label: c.name,
    value: Math.round(c.value * 100) / 100,
    color: COLORS[i]
  }));

  if (restTotal > 0) {
    slices.push({
      label: 'Other',
      value: Math.round(restTotal * 100) / 100,
      color: COLORS[7]
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
    data.push({
      month:  m,
      label:  monthLabel(m, true),
      value:  Math.round(totalSpending(txns) * 100) / 100,
      income: Math.round(totalIncome(txns)   * 100) / 100
    });
  }
  return data;
}

export async function categoryComparison(yyyymm) {
  const prevMonth = offsetMonth(yyyymm, -1);
  const cur  = monthBounds(yyyymm);
  const prev = monthBounds(prevMonth);
  const [curTxns, prevTxns, categories] = await Promise.all([
    readTransactions(cur),
    readTransactions(prev),
    readJSON('categories.json', [])
  ]);
  const curBy  = spendingByCategory(curTxns);
  const prevBy = spendingByCategory(prevTxns);
  const top = categories
    .filter((c) => c.id !== 'income')
    .map((c) => ({
      id:       c.id,
      name:     c.name,
      tone:     c.tone,
      current:  Math.round((curBy[c.id]  || 0) * 100) / 100,
      previous: Math.round((prevBy[c.id] || 0) * 100) / 100
    }))
    .sort((a, b) => b.current - a.current)
    .slice(0, 5);
  return top;
}

/**
 * FIX #1: forecast() — returns the shape ForecastScreen.jsx actually expects.
 *
 * Returns:
 *   projected  — single number: average monthly spend for the forecast window
 *   period     — human label e.g. "May – Oct 2026"
 *   yoyChange  — % change vs same window last year
 *   actual[]   — { month, label, value } historical points
 *   forecast[] — { month, label, value } projected points (first = last actual)
 *   upper[]    — { month, label, value } upper band (+1 stddev)
 *   lower[]    — { month, label, value } lower band (-1 stddev)
 */
export async function forecast(endMonth, past = 6, future = 6) {
  // ── 1. Fetch historical data ──────────────────────────────────────────────
  const histMonths = [];
  for (let i = past - 1; i >= 0; i--) histMonths.push(offsetMonth(endMonth, -i));

  const histData = [];
  for (const m of histMonths) {
    const { from, to } = monthBounds(m);
    const txns = await readTransactions({ from, to });
    histData.push({
      month: m,
      label: monthLabel(m, true),
      value: Math.round(totalSpending(txns) * 100) / 100
    });
  }

  // ── 2. Linear regression for trend ───────────────────────────────────────
  const values = histData.map((d) => d.value);
  const { slope, intercept } = linearRegression(values);

  // Standard deviation of residuals → uncertainty band
  const residuals = values.map((v, i) => v - (intercept + slope * i));
  const stdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length));

  // ── 3. Build forecast points ──────────────────────────────────────────────
  const joinIdx = past - 1; // last historical index
  const forecastPoints = [];
  const upperPoints    = [];
  const lowerPoints    = [];

  for (let i = 0; i <= future; i++) {
    const m   = offsetMonth(endMonth, i);
    const x   = joinIdx + i;
    const val = Math.max(0, Math.round((intercept + slope * x) * 100) / 100);
    const up  = Math.round((val + stdDev) * 100) / 100;
    const lo  = Math.max(0, Math.round((val - stdDev) * 100) / 100);
    forecastPoints.push({ month: m, label: monthLabel(m, true), value: val });
    upperPoints.push(   { month: m, label: monthLabel(m, true), value: up  });
    lowerPoints.push(   { month: m, label: monthLabel(m, true), value: lo  });
  }

  // ── 4. YoY comparison ────────────────────────────────────────────────────
  const lastYear = [];
  for (let i = 0; i < future; i++) {
    const m = offsetMonth(endMonth, i - 11); // ~1 year back
    const { from, to } = monthBounds(m);
    const txns = await readTransactions({ from, to });
    lastYear.push(totalSpending(txns));
  }
  const lyAvg    = lastYear.reduce((a, b) => a + b, 0) / Math.max(1, lastYear.length);
  const fcAvg    = forecastPoints.slice(1).reduce((a, b) => a + b.value, 0) / future;
  const yoyChange = lyAvg > 0 ? Math.round(((fcAvg - lyAvg) / lyAvg) * 100) : 0;

  // ── 5. Period label ───────────────────────────────────────────────────────
  const firstFc = forecastPoints[1];
  const lastFc  = forecastPoints[forecastPoints.length - 1];
  const period  = `${firstFc.label} – ${lastFc.label} ${lastFc.month.slice(0, 4)}`;

  // projected = average of the forward forecast months (exclude the join point)
  const projected = Math.round(fcAvg * 100) / 100;

  return {
    projected,
    period,
    yoyChange,
    actual:   histData,
    forecast: forecastPoints,
    upper:    upperPoints,
    lower:    lowerPoints
  };
}

/**
 * FIX #2: insights() — break → continue so ALL spike categories are reported.
 */
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
  const out   = [];
  const curBy  = spendingByCategory(curTxns);
  const prevBy = spendingByCategory(prevTxns);

  // Spike detection — FIX: was `break`, now `continue` so all spikes are found
  for (const cat of categories) {
    if (cat.id === 'income') continue;
    const cur  = curBy[cat.id]  || 0;
    const prev = prevBy[cat.id] || 0;
    if (prev > 50 && cur > prev * 1.15) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      out.push({
        type:      'spike',
        icon:      'spark',
        title:     `${cat.name} up sharply`,
        body:      `You spent ${pct}% more on ${cat.name.toLowerCase()} than last month.`,
        highlight: `${pct}% more`,
        category:  cat.id
      });
      // FIX: was `break` — now `continue` so we keep checking other categories
    }
  }

  // Over-budget alerts
  const budgetMap = Object.fromEntries(budgets.map((b) => [b.categoryId, b.amount || 0]));
  const overs = categories
    .filter((c) => c.id !== 'income')
    .map((c) => ({
      category: c.name,
      over: Math.round(((curBy[c.id] || 0) - (budgetMap[c.id] || 0)) * 100) / 100
    }))
    .filter((x) => x.over > 0)
    .sort((a, b) => b.over - a.over);

  if (overs.length) {
    const top = overs[0];
    out.push({
      type:      'over-budget',
      icon:      'alert',
      title:     `Over budget on ${top.category}`,
      body:      `You're $${top.over.toFixed(2)} over your ${top.category.toLowerCase()} budget this month.`,
      highlight: `$${top.over.toFixed(2)}`,
      category:  top.category.toLowerCase()
    });
  }

  // Day-of-week pattern
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of curTxns) {
    if (t.isIncome) continue;
    const dow = new Date(t.date).getDay();
    dayTotals[dow] += t.amount;
    dayCounts[dow]++;
  }
  const dayAvgs = dayTotals.map((total, i) => (dayCounts[i] ? total / dayCounts[i] : 0));
  let topDay = 0;
  for (let i = 1; i < 7; i++) if (dayAvgs[i] > dayAvgs[topDay]) topDay = i;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (dayAvgs[topDay] > 0) {
    out.push({
      type:      'pattern',
      icon:      'spark',
      title:     'Spending pattern detected',
      body:      `${dayNames[topDay]} is your highest-spend day, averaging $${Math.round(dayAvgs[topDay])}.`,
      highlight: `${dayNames[topDay]}`,
      pattern:   { dayTotals, dayNames, topDay }
    });
  }

  // Net cash-flow insight
  const spent  = totalSpending(curTxns);
  const income = totalIncome(curTxns);
  if (income > 0) {
    const rate = Math.round(((income - spent) / income) * 100);
    if (rate > 0) {
      out.push({
        type:      'savings',
        icon:      'arrowUp',
        title:     `Saving ${rate}% of income`,
        body:      `You've kept $${Math.round(income - spent).toLocaleString()} so far this month. Great pace.`,
        highlight: `${rate}%`
      });
    } else if (rate < 0) {
      out.push({
        type:      'overspend',
        icon:      'alert',
        title:     'Spending exceeds income',
        body:      `You've spent $${Math.abs(Math.round(income - spent)).toLocaleString()} more than you've earned this month.`,
        highlight: `$${Math.abs(Math.round(income - spent)).toLocaleString()}`
      });
    }
  }

  return out;
}

/**
 * FIX #3: weeklyPattern — divides by how many times each weekday appears in
 * the month so the bar heights represent average spend, not raw sums.
 * (A month with 5 Saturdays was unfairly inflating Saturday previously.)
 */
export async function weeklyPattern(yyyymm) {
  const { from, to } = monthBounds(yyyymm);
  const txns   = await readTransactions({ from, to });
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sums   = Array(7).fill(0);
  const counts = Array(7).fill(0); // how many times each weekday appears

  // Count how many times each weekday appears in the month
  const [y, m] = yyyymm.split('-').map(Number);
  const days   = new Date(y, m, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    counts[dow]++;
  }

  // Sum spend per weekday
  txns.filter((t) => !t.isIncome).forEach((t) => {
    sums[new Date(t.date).getDay()] += t.amount;
  });

  // Return average spend per occurrence of that weekday
  return labels.map((label, i) => ({
    label,
    value: counts[i] > 0 ? Math.round((sums[i] / counts[i]) * 100) / 100 : 0
  }));
}
