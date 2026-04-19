import { useEffect, useState, useCallback, useRef } from 'react';
import { bus } from '../utils/eventBus.js';

/**
 * useApi(fn, deps, options)
 * - fn:    () => Promise<T>            — the API call to make
 * - deps:  array                       — dependency array; refetches when these change
 * - options.refetchOn: string[]        — bus event names that trigger refetch
 *
 * Returns: { data, loading, error, refetch }
 */
export function useApi(fn, deps = [], { refetchOn = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cancelled = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (!cancelled.current) setData(result);
    } catch (err) {
      if (!cancelled.current) setError(err);
    } finally {
      if (!cancelled.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    cancelled.current = false;
    fetchData();
    return () => {
      cancelled.current = true;
    };
  }, [fetchData]);

  // Subscribe to bus events for refetch
  useEffect(() => {
    const unsubs = refetchOn.map((event) => bus.on(event, () => fetchData()));
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchOn.join('|')]);

  return { data, loading, error, refetch: fetchData };
}
