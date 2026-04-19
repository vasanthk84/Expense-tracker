import { Router } from 'express';
import { seed, clearAndInit } from '../services/seed.js';
import { readJSON } from '../services/storage.js';

const router = Router();

/**
 * POST /api/admin/reset
 * body: { mode: "clear" | "seed" }
 */
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
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/status — quick health + demo flag
 */
router.get('/status', async (_req, res, next) => {
  try {
    const settings = await readJSON('settings.json', {});
    res.json({
      ok: true,
      isDemo: !!settings.isDemo,
      hasSettings: !!settings.user
    });
  } catch (e) { next(e); }
});

export default router;
