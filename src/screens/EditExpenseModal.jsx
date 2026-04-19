import { useEffect, useState } from 'react';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/icons/Icon.jsx';
import { useCategories, useTransactionMutations } from '../hooks/useData.js';
import { useToast } from '../context/ToastContext.jsx';

export default function EditExpenseModal({ txn, onClose }) {
  const open = !!txn;
  const { data: categories } = useCategories();
  const { update, remove } = useTransactionMutations();
  const toast = useToast();

  const [amount,     setAmount]     = useState('');
  const [merchant,   setMerchant]   = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date,       setDate]       = useState('');
  const [note,       setNote]       = useState('');
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (txn) {
      setAmount(String(txn.amount));
      setMerchant(txn.merchant || '');
      setCategoryId(txn.category || '');
      setDate(txn.date || '');
      setNote(txn.note || '');
      setError(null);
      setConfirming(false);
    }
  }, [txn]);

  const save = async () => {
    setError(null);
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return setError('Enter a valid amount');
    if (!merchant.trim())             return setError('Enter a merchant name');
    setBusy(true);
    try {
      await update(txn.id, { amount: numAmount, merchant: merchant.trim(), category: categoryId, date, note });
      toast.show('Transaction updated');
      onClose();
    } catch {
      setError('Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await remove(txn.id);
      toast.show('Transaction deleted');
      onClose();
    } catch {
      toast.show('Failed to delete');
    } finally {
      setBusy(false);
    }
  };

  const cats = (categories || []).filter((c) => c.id !== 'income');

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Edit transaction" subtitle="Update or remove this entry">

      {confirming ? (
        /* ── Delete confirmation ── */
        <>
          <div style={{ textAlign: 'center', padding: '10px 0 16px', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.5 }}>
            Delete <strong style={{ color: 'var(--ink)' }}>{merchant}</strong> (${Number(amount).toFixed(2)})? This cannot be undone.
          </div>
          <button
            onClick={confirmDelete}
            disabled={busy}
            style={{ width: '100%', padding: '12px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            {busy ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            className="btn-sm"
            style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: 'var(--ink-3)' }}
            onClick={() => setConfirming(false)}
            disabled={busy}
          >
            Cancel
          </button>
        </>
      ) : (
        /* ── Edit form ── */
        <>
          <div className="amount-field">
            <div className="amount-label">Amount</div>
            <div className="amount-display">
              <span className="amount-currency">$</span>
              <input
                className="amount-value"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                autoFocus
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">Merchant</div>
            <input
              className="form-input"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Blue Bottle Coffee"
            />
          </div>

          <div className="form-row">
            <div className="form-label">Category</div>
            <div className="cat-picker" style={{ maxHeight: 90, overflowY: 'auto' }}>
              {cats.map((c) => (
                <div
                  key={c.id}
                  className={`cat-pill ${categoryId === c.id ? 'active' : ''}`}
                  onClick={() => setCategoryId(c.id)}
                >
                  <Icon name={c.icon} size={14} />
                  {c.name}
                </div>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-label">Note</div>
            <input
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
            />
          </div>

          <div className="form-row">
            <div className="form-label">Date</div>
            <input
              className="form-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <Button size="md" onClick={save}>{busy ? 'Saving…' : 'Save changes'}</Button>

          <button
            className="btn-sm"
            onClick={() => setConfirming(true)}
            style={{
              width: '100%', marginTop: 10,
              background: 'transparent', border: '1px solid var(--danger)',
              color: 'var(--danger)', borderRadius: 10, padding: '9px',
              cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6
            }}
          >
            <Icon name="alert" size={13} />
            Delete transaction
          </button>
        </>
      )}
    </Modal>
  );
}
