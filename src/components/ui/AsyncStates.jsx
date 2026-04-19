/**
 * Async state UI helpers.
 */
import Icon from '../icons/Icon.jsx';

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading-pane">
      <div className="loading-spinner" />
      <div>{label}</div>
    </div>
  );
}

export function ErrorState({ error }) {
  return (
    <div className="error-pane">
      <strong>Something went wrong</strong>
      {error?.message || String(error)}
    </div>
  );
}

export function EmptyState({ icon = 'list', title, sub }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon name={icon} size={22} /></div>
      <div className="empty-state-title">{title}</div>
      {sub && <div className="empty-state-sub">{sub}</div>}
    </div>
  );
}

/**
 * AsyncBoundary — wraps children with loading/error checks.
 * Pass `state` = { loading, error, data }
 */
export function AsyncBoundary({ state, children, loadingLabel, emptyTitle, emptySub, emptyIcon }) {
  if (state.loading && state.data == null) return <Loading label={loadingLabel} />;
  if (state.error) return <ErrorState error={state.error} />;
  if (emptyTitle && (!state.data || (Array.isArray(state.data) && state.data.length === 0))) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} sub={emptySub} />;
  }
  return children;
}
