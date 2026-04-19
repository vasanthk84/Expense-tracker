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

export default router;
