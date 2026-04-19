/**
 * Segmented — tabbed control for switching time ranges, views, etc.
 * options: [{ id, label }]
 */
export default function Segmented({ options = [], value, onChange }) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <div
          key={opt.id}
          className={`seg-btn ${value === opt.id ? 'active' : ''}`}
          onClick={() => onChange?.(opt.id)}
        >
          {opt.label}
        </div>
      ))}
    </div>
  );
}
