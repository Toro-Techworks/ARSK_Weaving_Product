/**
 * External / configurable dropdown search API.
 * Set VITE_DROPDOWN_SEARCH_URL in .env — see fetchDropdownData.
 */

import { PHONE_COUNTRIES } from '../utils/phoneInternational';

/** @type {string} */
const SEARCH_URL = (import.meta.env.VITE_DROPDOWN_SEARCH_URL || '').trim();

/**
 * True when VITE_DROPDOWN_SEARCH_URL is set (remote search enabled).
 */
export function isRemoteDropdownConfigured() {
  return SEARCH_URL.length > 0;
}

/**
 * Normalize one API row to { dialCode, name, nationalLength }.
 * @param {Record<string, unknown>} raw
 * @returns {{ dialCode: string, name: string, nationalLength: number } | null}
 */
function normalizeDialItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const dialCode =
    raw.dialCode ??
    raw.dial_code ??
    (typeof raw.value === 'string' && raw.value.startsWith('+') ? raw.value : null);
  const name = raw.name ?? raw.label ?? raw.country ?? '';
  const nationalLength = Number(raw.nationalLength ?? raw.national_length ?? raw.max_length ?? 10) || 10;
  if (!dialCode || !String(dialCode).startsWith('+')) return null;
  return { dialCode: String(dialCode), name: String(name), nationalLength };
}

/**
 * Extract results array from common API shapes.
 * @param {unknown} data
 * @returns {unknown[]}
 */
function extractResultsArray(data) {
  if (!data || typeof data !== 'object') return [];
  const d = /** @type {Record<string, unknown>} */ (data);
  if (Array.isArray(d.results)) return d.results;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(data)) return data;
  return [];
}

/**
 * Client-side filter when no remote URL is configured (offline / dev).
 * @param {string} query
 * @returns {typeof PHONE_COUNTRIES}
 */
export function filterLocalPhoneCountries(query) {
  const q = String(query || '').trim();
  if (!q) return [...PHONE_COUNTRIES];
  const lower = q.toLowerCase();
  const compact = q.replace(/\s/g, '');
  return PHONE_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.dialCode.includes(compact) ||
      (c.isoCode && c.isoCode.toLowerCase().includes(lower)),
  );
}

/**
 * Build request URL from VITE_DROPDOWN_SEARCH_URL.
 * Supports:
 * - Template: https://api.example.com/search?q={query}&type={resource}
 * - Base: https://api.example.com/search  → appends ?q=…&resource=…
 *
 * @param {string} query
 * @param {string} [resource] - e.g. 'country-dial', 'gst', 'company'
 */
function buildSearchUrl(query, resource = 'default') {
  const q = encodeURIComponent(query);
  const r = encodeURIComponent(resource);
  if (SEARCH_URL.includes('{query}')) {
    return SEARCH_URL.replaceAll('{query}', q).replaceAll('{resource}', r);
  }
  const hasQuery = SEARCH_URL.includes('?');
  return `${SEARCH_URL}${hasQuery ? '&' : '?'}q=${q}&resource=${r}`;
}

/**
 * Fetch dropdown options from the configured API.
 * When VITE_DROPDOWN_SEARCH_URL is unset, returns filterLocalPhoneCountries(query) (no network).
 *
 * Expected JSON shapes (any): { results: [...] }, { data: [...] }, or raw array.
 * Each item: { dialCode, name, nationalLength } or dial_code / label / national_length.
 *
 * @param {string} query
 * @param {{ signal?: AbortSignal, resource?: string }} [options]
 * @returns {Promise<Array<{ dialCode: string, name: string, nationalLength: number }>>}
 */
export async function fetchDropdownData(query, options = {}) {
  const { signal, resource = 'default' } = options;
  const q = String(query || '').trim();

  if (!SEARCH_URL) {
    return filterLocalPhoneCountries(q);
  }

  const url = buildSearchUrl(q, resource);
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Search failed (${res.status})`);
  }

  const data = await res.json();
  const rows = extractResultsArray(data);
  const out = [];
  for (const row of rows) {
    const item = normalizeDialItem(/** @type {Record<string, unknown>} */ (row));
    if (item) out.push(item);
  }
  return out;
}

/**
 * Same endpoint as fetchDropdownData but returns the raw `results` array (no dial-code normalization).
 * Use with SearchableAsyncDropdown for GST, company, or other lookups.
 *
 * @param {string} query
 * @param {{ signal?: AbortSignal, resource?: string }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function fetchGenericSearch(query, options = {}) {
  const { signal, resource = 'default' } = options;
  const q = String(query || '').trim();

  if (!SEARCH_URL) {
    return [];
  }

  const url = buildSearchUrl(q, resource);
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Search failed (${res.status})`);
  }

  const data = await res.json();
  return extractResultsArray(data);
}
