import Icon from '../icons/Icon.jsx';

/**
 * Insight — small banner with icon, title, and description.
 * Body can include JSX (e.g., <em> for highlighted values).
 * iconTone: default | primary
 */
export default function Insight({ icon, title, children, iconTone = 'default' }) {
  return (
    <div className="insight">
      <div className={`insight-icon ${iconTone === 'primary' ? 'primary' : ''}`}>
        <Icon name={icon} size={14} strokeWidth={1.6} />
      </div>
      <div className="insight-body">
        <div className="insight-title">{title}</div>
        <div className="insight-desc">{children}</div>
      </div>
    </div>
  );
}
