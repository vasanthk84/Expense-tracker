/**
 * api/index.js — Vercel serverless entry point.
 *
 * On cold start, checks KV for seed data and seeds if empty.
 * This runs once per container lifetime (not per request).
 */
import app from '../server/index.js';
import { seed } from '../server/services/seed.js';
import { readJSON } from '../server/services/storage.proxy.js';

let bootstrapped = false;

async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  try {
    const settings = await readJSON('settings.json', null);
    if (!settings) {
      console.log('[vercel bootstrap] No KV data found — seeding…');
      const result = await seed();
      console.log(`[vercel bootstrap] Seeded: ${result.transactions} txns.`);
    } else {
      console.log(`[vercel bootstrap] KV data present (demo: ${!!settings.isDemo}).`);
    }
  } catch (err) {
    console.error('[vercel bootstrap] Failed:', err);
  }
}

// Bootstrap runs on first request, not at import time,
// because KV env vars may not be ready at module-load in some Vercel edge cases.
export default async function handler(req, res) {
  await bootstrap();
  return app(req, res);
}