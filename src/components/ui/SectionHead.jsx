/**
 * SectionHead — title with optional right-aligned link/action.
 */
export default function SectionHead({ title, action, onActionClick }) {
  return (
    <div className="section-head">
      <span className="section-title">{title}</span>
      {action && (
        <span className="section-link" onClick={onActionClick}>{action}</span>
      )}
    </div>
  );
}
