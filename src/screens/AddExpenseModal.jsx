import { useEffect, useState } from 'react';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/icons/Icon.jsx';
import { useCategories, useTransactionMutations } from '../hooks/useData.js';
import { useToast } from '../context/ToastContext.jsx';
import { todayISO } from '../utils/date.js';

const QUICK_CATEGORIES = ['dining', 'groceries', 'transport', 'shopping', 'utilities', 'subs'];

export default function AddExpenseModal({ open, onClose }) {
  const { data: categories } = useCategories();
  const { create } = useTransactionMutations();
  const toast = useToast();

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('dining');
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setAmount('');
      setMerchant('');
      setCategoryId('dining');
      setDate(todayISO());
      setError(null);
    }
  }, [open]);

  const quickCats = (categories || []).filter((c) => QUICK_CATEGORIES.includes(c.id));

  const submit = async () => {
    setError(null);
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return setError('Enter a valid amount');
    if (!merchant.trim())              return setError('Enter a merchant');

    setBusy(true);
    try {
      await create({
        date,
        merchant: merchant.trim(),
        amount: numAmount,
        category: categoryId,
        note: ''
      });
      toast.show('Expense added');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Add expense" subtitle="Track a new transaction manually">
      <div className="amount-field">
        <div className="amount-label">Amount</div>
        <div className="amount-display">
          <span className="amount-currency">$</span>
          <input
            className="amount-value"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
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
        <div className="cat-picker">
          {quickCats.map((c) => (
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

      <Button size="md" onClick={submit}>
        {busy ? 'Saving…' : 'Save expense'}
      </Button>
    </Modal>
  );
}
