/**
 * Chip — filter/tag pill, supports active state.
 */
export default function Chip({ active = false, onClick, children }) {
  return (
    <button
      type="button"
      className={`chip ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
