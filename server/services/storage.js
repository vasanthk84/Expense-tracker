/**
 * storage.js — file system persistence layer
 * - Transactions: month-grouped JSONL (data/transactions/YYYY-MM.jsonl)
 * - Everything else: plain JSON files (data/budgets.json, etc.)
 *
 * Note: atomic rename removed — fs.rename fails on Windows when target exists (EPERM).
 * Direct fs.writeFile is safe for local dev; Vercel KV handles production durability.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const TXN_DIR = path.join(DATA_DIR, 'transactions');

/* --------- helpers --------- */

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function monthKey(dateStr) {
  // dateStr is YYYY-MM-DD, returns YYYY-MM
  return dateStr.slice(0, 7);
}

function txnFilePath(month) {
  // month is YYYY-MM
  return path.join(TXN_DIR, `${month}.jsonl`);
}

/* --------- JSON helpers --------- */

export async function readJSON(filename, fallback = null) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function writeJSON(filename, data) {
  await ensureDir(DATA_DIR);
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

/* --------- JSONL helpers (transactions) --------- */

async function readMonthTxns(month) {
  try {
    const raw = await fs.readFile(txnFilePath(month), 'utf8');
    if (!raw.trim()) return [];
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeMonthTxns(month, txns) {
  await ensureDir(TXN_DIR);
  // Sort by date desc, then createdAt desc — newest first
  const sorted = [...txns].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
  const contents = sorted.map((t) => JSON.stringify(t)).join('\n') + (sorted.length ? '\n' : '');
  await fs.writeFile(txnFilePath(month), contents, 'utf8');
}

/**
 * Append a single transaction to its month file.
 * Faster than rewriting the whole file for the common "new txn" case.
 */
export async function appendTransaction(txn) {
  await ensureDir(TXN_DIR);
  const month = monthKey(txn.date);
  const line = JSON.stringify(txn) + '\n';
  await fs.appendFile(txnFilePath(month), line, 'utf8');
}

/**
 * List all available transaction month files (sorted ascending: 2025-09, 2025-10, ...).
 */
export async function listTxnMonths() {
  try {
    const files = await fs.readdir(TXN_DIR);
    return files
      .filter((f) => /^\d{4}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.replace('.jsonl', ''))
      .sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Read transactions across a date range. Inclusive on both ends.
 * from/to are YYYY-MM-DD strings.
 */
export async function readTransactions({ from, to } = {}) {
  const months = await listTxnMonths();
  const fromMonth = from ? monthKey(from) : null;
  const toMonth = to ? monthKey(to) : null;

  const inRange = months.filter((m) => {
    if (fromMonth && m < fromMonth) return false;
    if (toMonth && m > toMonth) return false;
    return true;
  });

  const all = [];
  for (const m of inRange) {
    const txns = await readMonthTxns(m);
    all.push(...txns);
  }

  // Filter to exact date range
  return all.filter((t) => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    return true;
  });
}

/**
 * Find a single transaction by id. Searches month files, optionally hinted by month.
 */
export async function findTransaction(id, hintMonth) {
  if (hintMonth) {
    const txns = await readMonthTxns(hintMonth);
    const found = txns.find((t) => t.id === id);
    if (found) return { txn: found, month: hintMonth };
  }
  const months = await listTxnMonths();
  for (const m of months) {
    const txns = await readMonthTxns(m);
    const found = txns.find((t) => t.id === id);
    if (found) return { txn: found, month: m };
  }
  return null;
}

/**
 * Update a transaction in place. Handles month change if date changes.
 */
export async function updateTransaction(id, patch) {
  const result = await findTransaction(id);
  if (!result) return null;

  const { txn: existing, month: oldMonth } = result;
  const updated = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  const newMonth = monthKey(updated.date);

  // Remove from old month
  const oldTxns = await readMonthTxns(oldMonth);
  const filtered = oldTxns.filter((t) => t.id !== id);

  if (newMonth === oldMonth) {
    // Same month — just rewrite with the updated record
    await writeMonthTxns(oldMonth, [...filtered, updated]);
  } else {
    // Date moved to a different month
    await writeMonthTxns(oldMonth, filtered);
    const newTxns = await readMonthTxns(newMonth);
    await writeMonthTxns(newMonth, [...newTxns, updated]);
  }

  return updated;
}

/**
 * Delete a transaction by id. Returns true if found & removed.
 */
export async function deleteTransaction(id) {
  const result = await findTransaction(id);
  if (!result) return false;
  const { month } = result;
  const txns = await readMonthTxns(month);
  const filtered = txns.filter((t) => t.id !== id);
  await writeMonthTxns(month, filtered);
  return true;
}

/* --------- Admin: clear / seed --------- */

export async function clearAllData() {
  await ensureDir(DATA_DIR);
  // Remove transaction files
  try {
    const files = await fs.readdir(TXN_DIR);
    for (const f of files) {
      if (f.endsWith('.jsonl')) await fs.unlink(path.join(TXN_DIR, f));
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  // Remove top-level JSON files
  const top = await fs.readdir(DATA_DIR).catch(() => []);
  for (const f of top) {
    if (f.endsWith('.json')) await fs.unlink(path.join(DATA_DIR, f));
  }
}
