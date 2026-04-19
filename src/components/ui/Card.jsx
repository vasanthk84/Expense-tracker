/**
 * Card — base container with consistent padding, border, radius, shadow.
 * Variants: default | hero | chart | flush (no padding, for lists)
 */
export default function Card({ variant = 'default', className = '', style, children }) {
  const cls = [
    'card',
    variant === 'hero'  && 'card-hero',
    variant === 'chart' && 'chart-card',
    variant === 'flush' && '',
    className
  ].filter(Boolean).join(' ');

  const flushStyle = variant === 'flush' ? { padding: 0 } : undefined;

  return <div className={cls} style={{ ...flushStyle, ...style }}>{children}</div>;
}
