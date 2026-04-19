import { Router } from 'express';
import { readJSON, writeJSON } from '../services/storage.proxy.js';   // ← changed

const router = Router();

/* ---- Budgets ---- */
router.get('/budgets', async (_req, res, next) => {
  try { res.json(await readJSON('budgets.json', {})); } catch (e) { next(e); }
});

router.put('/budgets', async (req, res, next) => {
  try {
    if (typeof req.body !== 'object' || Array.isArray(req.body))
      return res.status(400).json({ error: 'budgets must be an object' });
    await writeJSON('budgets.json', req.body);
    res.json(req.body);
  } catch (e) { next(e); }
});

router.patch('/budgets/:categoryId', async (req, res, next) => {
  try {
    const budgets = await readJSON('budgets.json', {});
    if (typeof req.body.amount !== 'number' || req.body.amount < 0)
      return res.status(400).json({ error: 'amount must be a non-negative number' });
    budgets[req.params.categoryId] = req.body.amount;
    await writeJSON('budgets.json', budgets);
    res.json(budgets);
  } catch (e) { next(e); }
});

/* ---- Categories ---- */
router.get('/categories', async (_req, res, next) => {
  try { res.json(await readJSON('categories.json', [])); } catch (e) { next(e); }
});

/* ---- Savings goals ---- */
router.get('/savings-goals', async (_req, res, next) => {
  try { res.json(await readJSON('savings-goals.json', [])); } catch (e) { next(e); }
});

router.put('/savings-goals', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body))
      return res.status(400).json({ error: 'goals must be an array' });
    await writeJSON('savings-goals.json', req.body);
    res.json(req.body);
  } catch (e) { next(e); }
});

/* ---- Settings ---- */
router.get('/settings', async (_req, res, next) => {
  try { res.json(await readJSON('settings.json', {})); } catch (e) { next(e); }
});

router.patch('/settings', async (req, res, next) => {
  try {
    const current = await readJSON('settings.json', {});
    const updated = { ...current, ...req.body };
    await writeJSON('settings.json', updated);
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
