/**
 * date.js — date helpers used across screens.
 */

export function pad(n) { return String(n).padStart(2, '0'); }

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthBounds(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: `${yyyymm}-01`,
    to:   `${yyyymm}-${pad(lastDay)}`
  };
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function relativeDayLabel(dateStr) {
  const today = todayISO();
  if (dateStr === today) return 'Today';

  const d = new Date(dateStr);
  const t = new Date(today);
  const diffDays = Math.round((t - d) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return DAY_LABELS[d.getDay()];
  return `${DAY_LABELS[d.getDay()].slice(0, 3)}`;
}

export function shortMonthDay(dateStr) {
  const d = new Date(dateStr);
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

export function formatDayHeader(dateStr) {
  return `${relativeDayLabel(dateStr)} · ${shortMonthDay(dateStr)}`;
}

/**
 * Group transactions by date (descending). Returns [{ date, label, items }]
 */
export function groupByDate(txns) {
  const groups = {};
  for (const t of txns) {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  }
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      label: formatDayHeader(date),
      items: groups[date]
    }));
}

/**
 * Format $1234.56 → "$1,234.56"
 */
export function formatMoney(amount, { withCents = true } = {}) {
  const n = Number(amount) || 0;
  const opts = withCents
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { minimumFractionDigits: 0, maximumFractionDigits: 0 };
  return '$' + n.toLocaleString('en-US', opts);
}
