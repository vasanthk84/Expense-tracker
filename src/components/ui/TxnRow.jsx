import CategoryIcon from './CategoryIcon.jsx';

/**
 * TxnRow — single transaction list item.
 * Accepts a txn object: { name, meta, amount, icon, tone, isIncome }
 */
export default function TxnRow({ txn, iconSize = 'md' }) {
  const { name, meta, amount, icon, tone = 'default', isIncome } = txn;
  const prefix = isIncome ? '+' : '−';
  const formatted = `${prefix}$${Math.abs(amount).toFixed(2)}`;

  return (
    <div className="txn">
      <CategoryIcon icon={icon} tone={tone} size={iconSize} />
      <div className="txn-body">
        <div className="txn-name">{name}</div>
        <div className="txn-meta">{meta}</div>
      </div>
      <div className={`txn-amount ${isIncome ? 'income' : ''}`}>{formatted}</div>
    </div>
  );
}
