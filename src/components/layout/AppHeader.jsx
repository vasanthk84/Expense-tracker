/**
 * AppHeader — top-of-screen greeting + right-side action slot.
 */
export default function AppHeader({ label, title, right }) {
  return (
    <div className="app-header">
      <div>
        {label && <div className="app-greeting-label">{label}</div>}
        <div className="app-greeting-name">{title}</div>
      </div>
      {right}
    </div>
  );
}
