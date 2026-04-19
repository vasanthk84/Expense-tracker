/**
 * storage.proxy.js
 *
 * Re-exports the correct storage adapter based on environment:
 *   - VERCEL=1  →  Vercel KV (Redis)
 *   - otherwise →  local filesystem (original storage.js)
 *
 * All server-side code should import from this file,
 * NOT from storage.js or storage.kv.js directly.
 *
 * Usage:
 *   import { readJSON, writeJSON, readTransactions, ... } from './storage.proxy.js';
 */

let adapter;

if (process.env.VERCEL) {
  adapter = await import('./storage.kv.js');
} else {
  adapter = await import('./storage.js');
}

export const {
  readJSON,
  writeJSON,
  listTxnMonths,
  readTransactions,
  appendTransaction,
  findTransaction,
  updateTransaction,
  deleteTransaction,
  clearAllData
} = adapter;
