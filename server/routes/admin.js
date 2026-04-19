import { Router } from 'express';
import { seed, clearAndInit } from '../services/seed.js';
import { readJSON } from '../services/storage.proxy.js';

// We need BOTH adapters available for the migrate endpoint
import * as fsStorage from '../services/storage.js';
import * as kvStorage from '../services/storage.kv.js';

const router = Router();

router.post('/reset', async (req, res, next) => {
  try {
    const mode = req.body?.mode;
    if (mode === 'seed') {
      const result = await seed();
      return res.json({ ok: true, mode, ...result });
    }
    if (mode === 'clear') {
      const result = await clearAndInit();
      return res.json({ ok: true, mode, ...result });
    }
    res.status(400).json({ error: 'mode must be "clear" or "seed"' });
  } catch (e) { next(e); }
});

router.get('/status', async (_req, res, next) => {
  try {
    const settings = await readJSON('settings.json', {});
    res.json({ ok: true, isDemo: !!settings.isDemo, hasSettings: !!settings.user });
  } catch (e) { next(e); }
});

/**
 * POST /api/admin/migrate
 * Reads everything from the local filesystem and writes it all into Vercel KV.
 * Safe to call multiple times — it clears KV first then re-writes.
 * Only works when KV env vars are present (i.e. you've linked KV to local dev via `vercel env pull`).
 */
router.post('/migrate', async (req, res, next) => {
  try {
    // Read everything from local FS
    const [categories, budgets, savingsGoals, settings] = await Promise.all([
      fsStorage.readJSON('categories.json', []),
      fsStorage.readJSON('budgets.json', {}),
      fsStorage.readJSON('savings-goals.json', []),
      fsStorage.readJSON('settings.json', {})
    ]);

    const months = await fsStorage.listTxnMonths();
    const allTxns = [];
    for (const m of months) {
      const txns = await fsStorage.readTransactions({
        from: `${m}-01`,
        to: `${m}-31`  // storage filters to actual month bounds
      });
      allTxns.push(...txns);
    }

    // Wipe KV and re-write
    await kvStorage.clearAllData();
    await kvStorage.writeJSON('categories.json', categories);
    await kvStorage.writeJSON('budgets.json', budgets);
    await kvStorage.writeJSON('savings-goals.json', savingsGoals);
    await kvStorage.writeJSON('settings.json', settings);

    const byMonth = {};
    for (const txn of allTxns) {
      const m = txn.date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(txn);
    }
    for (const [month, txns] of Object.entries(byMonth)) {
      await kvStorage.batchWriteMonth(month, txns);
    }

    res.json({
      ok: true,
      migrated: {
        transactions: allTxns.length,
        months: months.length,
        categories: categories.length,
        budgets: Object.keys(budgets).length,
        goals: savingsGoals.length
      }
    });
  } catch (e) {
    next(e);
  }
});

export default router;
