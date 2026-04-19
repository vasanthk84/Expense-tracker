/**
 * ProgressBar — colored fill bar.
 * tone: ok | warn | danger (auto-derives from pct if not provided)
 * size: sm | md
 */
export default function ProgressBar({ value = 0, tone, size = 'sm' }) {
  const pct = Math.max(0, Math.min(100, value));
  const derivedTone =
    tone || (pct >= 100 ? 'danger' : pct >= 90 ? 'warn' : 'ok');

  const wrapClass = size === 'md' ? 'bp-bar' : 'budget-bar';
  const fillClass = size === 'md' ? 'bp-bar-fill' : 'budget-bar-fill';
  const toneClass = derivedTone === 'ok' ? '' : derivedTone;

  return (
    <div className={wrapClass}>
      <div className={`${fillClass} ${toneClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
