import { Router } from 'express';
import {
  readTransactions,
  appendTransaction,
  updateTransaction,
  deleteTransaction,
  findTransaction
} from '../services/storage.proxy.js';   // ← changed

const router = Router();

function genId() {
  return 'txn_' + Math.random().toString(36).slice(2, 10);
}

function validateTxn(body) {
  const errors = [];
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))
    errors.push('date is required (YYYY-MM-DD)');
  if (!body.merchant || typeof body.merchant !== 'string')
    errors.push('merchant is required');
  if (typeof body.amount !== 'number' || body.amount < 0)
    errors.push('amount must be a non-negative number');
  if (!body.category || typeof body.category !== 'string')
    errors.push('category is required');
  return errors;
}

router.get('/', async (req, res, next) => {
  try {
    const { from, to, category, limit } = req.query;
    let txns = await readTransactions({ from, to });
    if (category && category !== 'all')
      txns = txns.filter((t) => t.category === category);
    if (limit) txns = txns.slice(0, Number(limit));
    res.json(txns);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await findTransaction(req.params.id);
    if (!result) return res.status(404).json({ error: 'not found' });
    res.json(result.txn);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const errors = validateTxn(req.body);
    if (errors.length) return res.status(400).json({ error: 'validation', details: errors });
    const txn = {
      id: genId(),
      date: req.body.date,
      merchant: req.body.merchant.trim(),
      amount: Number(req.body.amount),
      category: req.body.category,
      note: req.body.note || '',
      isIncome: req.body.isIncome || req.body.category === 'income',
      createdAt: new Date().toISOString()
    };
    await appendTransaction(txn);
    res.status(201).json(txn);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['date', 'merchant', 'amount', 'category', 'note', 'isIncome'];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    const updated = await updateTransaction(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await deleteTransaction(req.params.id);
    if (!ok) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
