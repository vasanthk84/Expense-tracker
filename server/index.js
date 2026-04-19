/**
 * server/index.js — Express app entry
 * - Auto-seeds on first run if data dir is empty
 * - Logs requests in dev
 * - Centralized error handler
 */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import transactionsRouter from './routes/transactions.js';
import configRouter from './routes/config.js';
import analyticsRouter from './routes/analytics.js';
import reportsRouter from './routes/reports.js';
import adminRouter from './routes/admin.js';

import { seed } from './services/seed.js';
import { readJSON } from './services/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');

const PORT = process.env.PORT || 3001;
const app = express();

app.use(express.json({ limit: '1mb' }));

// Tiny request logger
app.use((req, _res, next) => {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${req.method} ${req.url}`);
  next();
});

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Mount routes
app.use('/api/transactions', transactionsRouter);
app.use('/api', configRouter);                  // budgets, categories, savings, settings
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);

// 404 for unknown API routes
app.use('/api/*', (_req, res) => res.status(404).json({ error: 'not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: 'internal_server_error', message: err.message });
});

/**
 * Auto-seed on first run.
 * If settings.json doesn't exist yet, populate with demo data.
 */
async function bootstrap() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const settings = await readJSON('settings.json', null);
    if (!settings) {
      console.log('[bootstrap] No data found — seeding demo data…');
      const result = await seed();
      console.log(`[bootstrap] Seeded: ${result.transactions} txns, ${result.categories} categories.`);
    } else {
      console.log(`[bootstrap] Data present (demo: ${!!settings.isDemo}).`);
    }
  } catch (err) {
    console.error('[bootstrap] Failed:', err);
  }
}

if (process.env.VERCEL) {
  // On Vercel, just export the app (Vercel will handle the server)
  export default app;
} else {
  // Local development: run bootstrap and start server
  bootstrap().then(() => {
    app.listen(PORT, () => {
      console.log(`\n🟢 Ledger API listening on http://localhost:${PORT}`);
      console.log(`   Data dir: ${DATA_DIR}\n`);
    });
  });
}
