import { Router } from 'express';
import {
  monthSummary,
  budgetUtilization,
  categoryBreakdown,
  monthlyTrend,
  categoryComparison,
  forecast,
  insights,
  weeklyPattern
} from '../services/analytics.js';

const router = Router();

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * GET /api/analytics/summary?month=YYYY-MM
 * Default month = current.
 */
router.get('/summary', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const data = await monthSummary(month);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * GET /api/analytics/budget-utilization?month=YYYY-MM
 */
router.get('/budget-utilization', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const data = await budgetUtilization(month);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * GET /api/analytics/category-breakdown?from=&to=
 * Defaults to current month.
 */
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
    const data = await categoryBreakdown({ from, to });
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * GET /api/analytics/trend?endMonth=YYYY-MM&count=6
 */
router.get('/trend', async (req, res, next) => {
  try {
    const endMonth = req.query.endMonth || currentMonth();
    const count = Number(req.query.count) || 6;
    const data = await monthlyTrend(endMonth, count);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * GET /api/analytics/comparison?month=YYYY-MM
 */
router.get('/comparison', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const data = await categoryComparison(month);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * GET /api/analytics/forecast?endMonth=&past=6&future=6
 */
router.get('/forecast', async (req, res, next) => {
  try {
    const endMonth = req.query.endMonth || currentMonth();
    const past = Number(req.query.past) || 6;
    const future = Number(req.query.future) || 6;
    const data = await forecast(endMonth, past, future);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * GET /api/analytics/insights?month=YYYY-MM
 */
router.get('/insights', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const data = await insights(month);
    res.json(data);
  } catch (e) { next(e); }
});

/**
 * GET /api/analytics/weekly-pattern?month=YYYY-MM
 */
router.get('/weekly-pattern', async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const data = await weeklyPattern(month);
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
