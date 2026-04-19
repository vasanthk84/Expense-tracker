import { Router } from 'express';
import {
  monthSummary,
  budgetUtilization,
  categoryBreakdown,
  monthlyTrend,
  budgetTrend,
  categoryComparison,
  merchantBreakdown,
  forecast,
  insights,
  weeklyPattern
} from '../services/analytics.js';

const router = Router();

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

router.get('/summary', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    res.json(await monthSummary(month));
  } catch (e) { next(e); }
});

router.get('/budget-utilization', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    res.json(await budgetUtilization(month));
  } catch (e) { next(e); }
});

router.get('/category-breakdown', async (req, res, next) => {
  try {
    let { from, to } = req.query;
    if (!from || !to) {
      const m = currentMonth();
      const [y, mm] = m.split('-').map(Number);
      from = `${m}-01`;
      const lastDay = new Date(y, mm, 0).getDate();
      to = `${m}-${String(lastDay).padStart(2, '0')}`;
    }
    res.json(await categoryBreakdown({ from, to }));
  } catch (e) { next(e); }
});

router.get('/trend', async (req, res, next) => {
  try {
    const endMonth = req.query.endMonth || currentMonth();
    const count = Number(req.query.count) || 6;
    res.json(await monthlyTrend(endMonth, count));
  } catch (e) { next(e); }
});

router.get('/comparison', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    res.json(await categoryComparison(month));
  } catch (e) { next(e); }
});

router.get('/forecast', async (req, res, next) => {
  try {
    const endMonth = req.query.endMonth || currentMonth();
    const past = Number(req.query.past) || 6;
    const future = Number(req.query.future) || 6;
    res.json(await forecast(endMonth, past, future));
  } catch (e) { next(e); }
});

router.get('/insights', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    res.json(await insights(month));
  } catch (e) { next(e); }
});

router.get('/merchant-breakdown', async (req, res, next) => {
  try {
    const category = req.query.category || 'groceries';
    let { from, to } = req.query;
    if (!from || !to) {
      const m = currentMonth();
      const [y, mm] = m.split('-').map(Number);
      from = `${m}-01`;
      to   = `${m}-${String(new Date(y, mm, 0).getDate()).padStart(2, '0')}`;
    }
    res.json(await merchantBreakdown(category, from, to));
  } catch (e) { next(e); }
});

router.get('/budget-trend', async (req, res, next) => {
  try {
    const endMonth = req.query.endMonth || currentMonth();
    const count = Number(req.query.count) || 6;
    res.json(await budgetTrend(endMonth, count));
  } catch (e) { next(e); }
});

router.get('/weekly-pattern', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    res.json(await weeklyPattern(month));
  } catch (e) { next(e); }
});

export default router;