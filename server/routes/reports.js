import { Router } from 'express';
import { listTxnMonths, readTransactions } from '../services/storage.proxy.js';   // ← changed

const router = Router();

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function pad(n) { return String(n).padStart(2, '0'); }

function totalSpending(txns) {
  return txns.filter((t) => !t.isIncome).reduce((s, t) => s + t.amount, 0);
}

router.get('/', async (req, res, next) => {
  try {
    const type = req.query.type || 'monthly';
    const months = await listTxnMonths();

    if (type === 'monthly') {
      const reports = [];
      for (const m of [...months].reverse()) {
        const [y, mm] = m.split('-').map(Number);
        const lastDay = new Date(y, mm, 0).getDate();
        const txns = await readTransactions({ from: `${m}-01`, to: `${m}-${pad(lastDay)}` });
        reports.push({
          id: m,
          title: `${MONTH_NAMES[mm - 1]} ${y}`,
          meta: `${MONTH_NAMES[mm - 1].slice(0, 3)} 1 – ${MONTH_NAMES[mm - 1].slice(0, 3)} ${lastDay} · $${totalSpending(txns).toFixed(2)}`,
          year: y, month: mm,
          total: Math.round(totalSpending(txns) * 100) / 100
        });
      }
      return res.json(reports);
    }

    if (type === 'quarterly') {
      const quarters = {};
      for (const m of months) {
        const [y, mm] = m.split('-').map(Number);
        const q = Math.ceil(mm / 3);
        const key = `${y}-Q${q}`;
        if (!quarters[key]) quarters[key] = { year: y, quarter: q, months: [] };
        quarters[key].months.push(m);
      }
      const reports = [];
      for (const key of Object.keys(quarters).sort().reverse()) {
        const { year, quarter, months: qMonths } = quarters[key];
        let total = 0;
        for (const m of qMonths) {
          const [y, mm] = m.split('-').map(Number);
          const lastDay = new Date(y, mm, 0).getDate();
          const txns = await readTransactions({ from: `${m}-01`, to: `${m}-${pad(lastDay)}` });
          total += totalSpending(txns);
        }
        const startMonth = (quarter - 1) * 3;
        const endMonth = startMonth + 2;
        reports.push({
          id: key, title: `Q${quarter} ${year}`,
          meta: `${MONTH_NAMES[startMonth].slice(0, 3)} – ${MONTH_NAMES[endMonth].slice(0, 3)} · $${total.toFixed(2)}`,
          year, quarter, total: Math.round(total * 100) / 100
        });
      }
      return res.json(reports);
    }

    if (type === 'annual') {
      const years = {};
      for (const m of months) {
        const [y] = m.split('-').map(Number);
        if (!years[y]) years[y] = [];
        years[y].push(m);
      }
      const reports = [];
      for (const y of Object.keys(years).sort().reverse()) {
        let total = 0;
        for (const m of years[y]) {
          const [yy, mm] = m.split('-').map(Number);
          const lastDay = new Date(yy, mm, 0).getDate();
          const txns = await readTransactions({ from: `${m}-01`, to: `${m}-${pad(lastDay)}` });
          total += totalSpending(txns);
        }
        reports.push({
          id: `${y}`, title: `${y} Annual`,
          meta: `Full year summary · $${total.toFixed(2)}`,
          year: Number(y), total: Math.round(total * 100) / 100
        });
      }
      return res.json(reports);
    }

    res.status(400).json({ error: 'invalid type' });
  } catch (e) { next(e); }
});

/* ── CSV export ── GET /api/reports/export?id=2026-04&type=monthly */
router.get('/export', async (req, res, next) => {
  try {
    const { id, type = 'monthly' } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });

    let txns = [];
    let filename = `report-${id}.csv`;

    if (type === 'monthly') {
      const [y, mm] = id.split('-').map(Number);
      const lastDay = new Date(y, mm, 0).getDate();
      txns = await readTransactions({ from: `${id}-01`, to: `${id}-${pad(lastDay)}` });
      filename = `${MONTH_NAMES[mm - 1]}-${y}.csv`;
    } else if (type === 'quarterly') {
      // id like "2026-Q1"
      const [yearStr, qStr] = id.split('-');
      const quarter = Number(qStr.replace('Q', ''));
      const startM = (quarter - 1) * 3 + 1;
      const y = Number(yearStr);
      for (let m = startM; m < startM + 3; m++) {
        const mm = String(m).padStart(2, '0');
        const lastDay = new Date(y, m, 0).getDate();
        const t = await readTransactions({ from: `${y}-${mm}-01`, to: `${y}-${mm}-${pad(lastDay)}` });
        txns.push(...t);
      }
      filename = `${id}.csv`;
    } else if (type === 'annual') {
      const y = Number(id);
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        const lastDay = new Date(y, m, 0).getDate();
        try {
          const t = await readTransactions({ from: `${y}-${mm}-01`, to: `${y}-${mm}-${pad(lastDay)}` });
          txns.push(...t);
        } catch { /* month may not exist */ }
      }
      filename = `${id}-annual.csv`;
    }

    const rows = [
      ['Date', 'Description', 'Category', 'Amount', 'Type'],
      ...txns.map((t) => [
        t.date,
        `"${(t.label || t.note || '').replace(/"/g, '""')}"`,
        t.category || '',
        t.amount.toFixed(2),
        t.isIncome ? 'Income' : 'Expense'
      ])
    ];
    const csv = rows.map((r) => r.join(',')).join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (e) { next(e); }
});

export default router;
