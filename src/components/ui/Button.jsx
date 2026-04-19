/**
 * Button — small or full-width.
 * variant: primary | secondary | text
 * size: sm | md (md is the full-width primary)
 */
export default function Button({
  variant = 'primary',
  size = 'sm',
  onClick,
  type = 'button',
  children,
  style
}) {
  if (size === 'md') {
    return (
      <button type={type} className="btn-primary" onClick={onClick} style={style}>
        {children}
      </button>
    );
  }

  const cls = [
    'btn-sm',
    variant === 'primary' && 'primary',
    variant === 'text' && 'text'
  ].filter(Boolean).join(' ');

  const textStyle = variant === 'text'
    ? { background: 'transparent', borderColor: 'transparent', color: 'var(--primary)' }
    : undefined;

  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      style={{ ...textStyle, ...style }}
    >
      {children}
    </button>
  );
}
