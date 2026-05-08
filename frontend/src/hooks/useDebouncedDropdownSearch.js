import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchDropdownData, isRemoteDropdownConfigured } from '../services/api';

const DEFAULT_CACHE_LIMIT = 48;

/**
 * Debounced async search with loading, error, and simple LRU-ish cache.
 *
 * @param {object} [config]
 * @param {number} [config.debounceMs]
 * @param {number} [config.minLength] - min query length before calling API (remote only)
 * @param {string} [config.resource] - passed to fetchDropdownData (e.g. 'country-dial')
 * @param {(query: string, opt: { signal: AbortSignal, resource: string }) => Promise<Array<unknown>>} [config.fetcher]
 * @param {number} [config.cacheLimit]
 * @param {boolean} [config.enabled] - when false, no fetch (e.g. dropdown closed)
 */
export function useDebouncedDropdownSearch({
  debounceMs = 300,
  minLength,
  resource = 'default',
  fetcher,
  cacheLimit = DEFAULT_CACHE_LIMIT,
  enabled = true,
} = {}) {
  const remote = isRemoteDropdownConfigured();
  const effectiveMin = minLength !== undefined ? minLength : remote ? 2 : 0;
  const fetcherRef = useRef(fetcher ?? fetchDropdownData);
  fetcherRef.current = fetcher ?? fetchDropdownData;

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const cacheRef = useRef(new Map());
  const orderRef = useRef([]);

  const touchCache = useCallback(
    (key, value) => {
      const cache = cacheRef.current;
      const order = orderRef.current;
      cache.set(key, value);
      const i = order.indexOf(key);
      if (i >= 0) order.splice(i, 1);
      order.unshift(key);
      while (order.length > cacheLimit) {
        const last = order.pop();
        if (last) cache.delete(last);
      }
    },
    [cacheLimit],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let alive = true;
    /** @type {AbortController | null} */
    let ac = null;

    const q = String(search || '').trim();
    const delayDebounce = setTimeout(async () => {
      if (remote && q.length < effectiveMin) {
        if (!alive) return;
        setOptions([]);
        setLoading(false);
        setError(null);
        return;
      }

      const cacheKey = `${resource}:${q}`;
      if (cacheRef.current.has(cacheKey)) {
        if (!alive) return;
        setOptions(cacheRef.current.get(cacheKey) || []);
        setError(null);
        setLoading(false);
        return;
      }

      ac = new AbortController();
      if (!alive) return;
      setLoading(true);
      setError(null);

      try {
        const results = await fetcherRef.current(q, { signal: ac.signal, resource });
        if (!alive) return;
        const list = Array.isArray(results) ? results : [];
        touchCache(cacheKey, list);
        setOptions(list);
      } catch (e) {
        if (!alive || e?.name === 'AbortError') return;
        setOptions([]);
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        if (alive) setLoading(false);
      }
    }, debounceMs);

    return () => {
      alive = false;
      clearTimeout(delayDebounce);
      ac?.abort();
    };
  }, [enabled, search, debounceMs, effectiveMin, resource, remote, touchCache]);

  const clearSearch = useCallback(() => {
    setSearch('');
    setError(null);
  }, []);

  return {
    options,
    setOptions,
    loading,
    search,
    setSearch,
    error,
    setError,
    clearSearch,
    isRemote: remote,
    minLength: effectiveMin,
  };
}
