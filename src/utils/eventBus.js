/**
 * eventBus.js — minimal pub/sub.
 * Used by mutation hooks to signal data changes so query hooks can refetch.
 */
const listeners = new Map(); // event -> Set<callback>

export const bus = {
  on(event, cb) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(cb);
    return () => listeners.get(event).delete(cb);
  },
  emit(event, payload) {
    listeners.get(event)?.forEach((cb) => cb(payload));
  }
};

export const EVENTS = {
  TXN_CHANGED:      'txn:changed',
  BUDGET_CHANGED:   'budget:changed',
  SETTINGS_CHANGED: 'settings:changed',
  DATA_RESET:       'data:reset'
};
