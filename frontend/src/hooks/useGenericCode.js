import { useState, useEffect, useMemo } from 'react';
import api from '../api/client';

/**
 * Human-friendly label for code_description (e.g. active → Active, open → Open).
 */
export function toSelectLabel(description) {
  const s = String(description ?? '');
  if (!s) return '';
  if (/^[a-z_]+$/.test(s)) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

/**
 * Fetch active generic codes for a code_type. Uses fallback on failure or empty response.
 *
 * @param {string} codeType - e.g. GENERIC_CODE_TYPES.SHIFT
 * @param {{ fallback?: Array<{value:string,label:string}>, enabled?: boolean, dropdownType?: string, includeInactive?: boolean }} options
 */
export function useGenericCode(codeType, options = {}) {
  const { fallback = [], enabled = true, dropdownType, includeInactive = false } = options;
  const fallbackKey = useMemo(() => JSON.stringify(fallback), [fallback]);

  const [selectOptions, setSelectOptions] = useState(fallback);
  const [loading, setLoading] = useState(Boolean(enabled && codeType));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !codeType) {
      setSelectOptions(fallback);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = {};
    if (dropdownType) {
      params.dropdown_type = dropdownType;
    }
    if (includeInactive) {
      params.include_inactive = 1;
    }

    api
      .get(`/generic-code/${encodeURIComponent(codeType)}`, { params })
      .then(({ data }) => {
        if (cancelled) return;
        const listRaw = Array.isArray(data?.data) ? data.data : [];
        const list = includeInactive
          ? listRaw
          : listRaw.filter((r) => r && r.is_active !== false);
        if (list.length === 0) {
          setSelectOptions(fallback);
          return;
        }
        setSelectOptions(
          list.map((r) => ({
            value: r.code_description,
            label: toSelectLabel(r.code_description),
          }))
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e);
        setSelectOptions(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [codeType, enabled, fallbackKey, dropdownType, includeInactive]);

  return { options: selectOptions, loading, error };
}
