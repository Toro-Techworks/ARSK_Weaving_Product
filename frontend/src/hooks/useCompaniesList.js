import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

/** Shared in-memory cache so list page + modals do not refetch companies. */
let cachedCompanies = null;
let fetchPromise = null;

function fetchCompaniesList() {
  if (cachedCompanies) {
    return Promise.resolve(cachedCompanies);
  }
  if (!fetchPromise) {
    fetchPromise = api
      .get('/companies-list')
      .then(({ data }) => {
        const list = Array.isArray(data?.data) ? data.data : [];
        cachedCompanies = list;
        return list;
      })
      .catch((err) => {
        fetchPromise = null;
        throw err;
      });
  }
  return fetchPromise;
}

/** Invalidate after create/update/delete company elsewhere. */
export function invalidateCompaniesListCache() {
  cachedCompanies = null;
  fetchPromise = null;
}

/**
 * @returns {{ companies: Array<{ id: number, company_name: string }>, loading: boolean, companySelectOptions: Array<{ value: string, label: string }>, loadCompanyOptions: (input: string) => Promise<Array<{ value: string, label: string }>> }}
 */
export function useCompaniesList() {
  const [companies, setCompanies] = useState(() => cachedCompanies || []);
  const [loading, setLoading] = useState(!cachedCompanies);

  useEffect(() => {
    if (cachedCompanies) {
      setCompanies(cachedCompanies);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchCompaniesList()
      .then((list) => {
        if (!cancelled) setCompanies(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const companySelectOptions = useMemo(
    () =>
      (companies || []).map((c) => ({
        value: String(c.id),
        label: String(c.company_name || ''),
      })),
    [companies],
  );

  const loadCompanyOptions = useCallback(
    (inputValue, selectedValue = '') => {
      const q = String(inputValue || '').trim().toLowerCase();
      let list = companySelectOptions;
      if (q) {
        list = list.filter((o) => o.label.toLowerCase().includes(q));
      }
      list = list.slice(0, 80);
      const sel = companySelectOptions.find((o) => String(o.value) === String(selectedValue));
      if (sel && !list.some((o) => o.value === sel.value)) {
        list = [sel, ...list].slice(0, 81);
      }
      return Promise.resolve(list);
    },
    [companySelectOptions],
  );

  return {
    companies,
    loading,
    companySelectOptions,
    loadCompanyOptions,
  };
}
