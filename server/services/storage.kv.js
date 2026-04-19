/**
 * storage.kv.js — Upstash Redis adapter (via Vercel marketplace).
 *
 * FIX: readJSON was relying on Upstash auto-parsing which is inconsistent.
 * The @upstash/redis client sometimes returns a parsed object, sometimes a
 * raw string, depending on client version and whether the value was stored
 * via JSON.stringify or not.  We now normalise everything explicitly:
 *   - writeJSON always stores JSON.stringify(data)
 *   - readJSON always calls safeParseJSON() which handles both string and object
 *
 * Works with both old Vercel KV env vars and new Upstash env vars:
 *   KV_REST_API_URL + KV_REST_API_TOKEN
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 */
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

/* ─────────────────────────────────────────
   Safe JSON helpers
───────────────────────────────────────── */

/**
 * FIX: Upstash may return an already-parsed object OR a JSON string.
 * Handle both cases so callers always receive the correct type.
 */
function safeParseJSON(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return fallback; }
  }
  // Already an object/array (Upstash auto-parsed it)
  return val;
}

export async function readJSON(filename, fallback = null) {
  try {
    const val = await redis.get(`config:${filename}`);
    return safeParseJSON(val, fallback);
  } catch {
    return fallback;
  }
}

export async function writeJSON(filename, data) {
  // Always store as a JSON string so reads are always consistent
  await redis.set(`config:${filename}`, JSON.stringify(data));
}

/* ─────────────────────────────────────────
   Transaction month index
───────────────────────────────────────── */

async function getMonthIndex() {
  const idx = await redis.get('txn:index');
  return safeParseJSON(idx, []);
}

async function addMonthToIndex(month) {
  const idx = await getMonthIndex();
  if (!idx.includes(month)) {
    idx.push(month);
    idx.sort();
    await redis.set('txn:index', JSON.stringify(idx));
  }
}

async function readMonthTxns(month) {
  const rows = await redis.get(`txn:${month}`);
  return safeParseJSON(rows, []);
}

async function writeMonthTxns(month, txns) {
  const sorted = [...txns].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
  await redis.set(`txn:${month}`, JSON.stringify(sorted));
  await addMonthToIndex(month);
}

/* ─────────────────────────────────────────
   Public transaction API
───────────────────────────────────────── */

function monthKey(dateStr) { return dateStr.slice(0, 7); }

export async function listTxnMonths() {
  return getMonthIndex();
}

export async function appendTransaction(txn) {
  const month    = monthKey(txn.date);
  const existing = await readMonthTxns(month);
  existing.push(txn);
  await writeMonthTxns(month, existing);
}

export async function readTransactions({ from, to } = {}) {
  const months    = await listTxnMonths();
  const fromMonth = from ? monthKey(from) : null;
  const toMonth   = to   ? monthKey(to)   : null;

  const inRange = months.filter((m) => {
    if (fromMonth && m < fromMonth) return false;
    if (toMonth   && m > toMonth)   return false;
    return true;
  });

  const all = [];
  for (const m of inRange) {
    const txns = await readMonthTxns(m);
    all.push(...txns);
  }

  return all.filter((t) => {
    if (from && t.date < from) return false;
    if (to   && t.date > to)   return false;
    return true;
  });
}

export async function findTransaction(id, hintMonth) {
  if (hintMonth) {
    const txns  = await readMonthTxns(hintMonth);
    const found = txns.find((t) => t.id === id);
    if (found) return { txn: found, month: hintMonth };
  }
  const months = await listTxnMonths();
  for (const m of months) {
    const txns  = await readMonthTxns(m);
    const found = txns.find((t) => t.id === id);
    if (found) return { txn: found, month: m };
  }
  return null;
}

export async function updateTransaction(id, patch) {
  const result = await findTransaction(id);
  if (!result) return null;
  const { txn: existing, month: oldMonth } = result;
  const updated  = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  const newMonth = monthKey(updated.date);
  const oldTxns  = await readMonthTxns(oldMonth);
  const filtered = oldTxns.filter((t) => t.id !== id);
  if (newMonth === oldMonth) {
    await writeMonthTxns(oldMonth, [...filtered, updated]);
  } else {
    await writeMonthTxns(oldMonth, filtered);
    const newTxns = await readMonthTxns(newMonth);
    await writeMonthTxns(newMonth, [...newTxns, updated]);
  }
  return updated;
}

export async function deleteTransaction(id) {
  const result = await findTransaction(id);
  if (!result) return false;
  const { month } = result;
  const txns = await readMonthTxns(month);
  await writeMonthTxns(month, txns.filter((t) => t.id !== id));
  return true;
}

/* ─────────────────────────────────────────
   Admin: clear all KV data
───────────────────────────────────────── */

export async function clearAllData() {
  const configKeys = [
    'config:settings.json',
    'config:budgets.json',
    'config:categories.json',
    'config:savings-goals.json'
  ];
  for (const k of configKeys) await redis.del(k);

  const months = await getMonthIndex();
  for (const m of months) await redis.del(`txn:${m}`);
  await redis.del('txn:index');
}

export async function batchWriteMonth(month, txns) {
  const sorted = [...txns].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
  await redis.set(`txn:${month}`, JSON.stringify(sorted));
  await addMonthToIndex(month);
}
