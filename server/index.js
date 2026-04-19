/**
 * server/index.js — Express app entry
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import transactionsRouter from './routes/transactions.js';
import configRouter from './routes/config.js';
import analyticsRouter from './routes/analytics.js';
import reportsRouter from './routes/reports.js';
import adminRouter from './routes/admin.js';

import { seed } from './services/seed.js';
import { readJSON } from './services/storage.proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DATA_DIR   = path.resolve(__dirname, 'data');
const PORT       = process.env.PORT || 3001;

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
// Allow requests from the deployed frontend AND local dev
const ALLOWED_ORIGINS = [
  'https://expense-tracker-813p.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173'
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server / curl (no origin) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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
app.use('/api',              configRouter);
app.use('/api/analytics',    analyticsRouter);
app.use('/api/reports',      reportsRouter);
app.use('/api/admin',        adminRouter);

// 404 for unknown API routes
app.use('/api/*', (_req, res) => res.status(404).json({ error: 'not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: 'internal_server_error', message: err.message });
});

/* ── Bootstrap (local dev only) ────────────────────────────────────────── */
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

if (!process.env.VERCEL) {
  bootstrap().then(() => {
    app.listen(PORT, () => {
      console.log(`\n🟢 Ledger API listening on http://localhost:${PORT}`);
      console.log(`   Data dir: ${DATA_DIR}\n`);
    });
  });
}

// 2. Export the app at the top level (outside any IF)
export default app;
