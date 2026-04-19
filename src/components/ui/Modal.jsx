/**
 * Modal — bottom-sheet style modal for mobile.
 * Sits inside the phone frame (absolutely positioned).
 * If `open` is false, renders nothing.
 */
export default function Modal({ open, onClose, title, subtitle, children }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        {title && <div className="modal-title">{title}</div>}
        {subtitle && <div className="modal-sub">{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}
