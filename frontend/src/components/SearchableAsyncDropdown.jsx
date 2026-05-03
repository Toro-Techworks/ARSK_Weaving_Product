import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useDebouncedDropdownSearch } from '../hooks/useDebouncedDropdownSearch';
import { fetchGenericSearch } from '../services/api';

/**
 * Generic searchable list driven by fetchDropdownData (or custom fetcher) with debounce.
 * Use for GST lookup, company lookup, etc. Country dial is wired in FormPhoneInput.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} [props.resource] - passed to API as `resource` query param
 * @param {(q: string, o: { signal: AbortSignal, resource: string }) => Promise<Array<unknown>>} [props.fetcher]
 * @param {number} [props.minLength]
 * @param {number} [props.debounceMs]
 * @param {string} [props.searchPlaceholder]
 * @param {(item: unknown) => void} props.onSelect
 * @param {(item: unknown) => string | number} [props.getOptionKey]
 * @param {(item: unknown) => string} [props.getPrimaryLabel]
 * @param {(item: unknown) => string | undefined} [props.getSecondaryLabel]
 * @param {string} [props.emptyMessage]
 * @param {string} [props.belowMinHint] - shown when remote and query shorter than minLength
 * @param {string} [props.className] - list container
 * @param {string} [props.inputClassName]
 */
export function SearchableAsyncDropdown({
  open,
  resource = 'default',
  fetcher = fetchGenericSearch,
  minLength,
  debounceMs = 300,
  searchPlaceholder = 'Search…',
  onSelect,
  getOptionKey = (item) => {
    if (item && typeof item === 'object') {
      if ('id' in item && item.id != null) return item.id;
      if ('value' in item && item.value != null) return item.value;
    }
    return item;
  },
  getPrimaryLabel = (item) => {
    if (item && typeof item === 'object') {
      if ('label' in item && item.label != null) return String(item.label);
      if ('name' in item && item.name != null) return String(item.name);
    }
    return String(item ?? '');
  },
  getSecondaryLabel,
  emptyMessage = 'No results',
  belowMinHint = 'Type at least 2 characters to search',
  className = '',
  inputClassName = '',
}) {
  const {
    options,
    loading,
    search,
    setSearch,
    error,
    clearSearch,
    isRemote,
    minLength: effMin,
  } = useDebouncedDropdownSearch({
    resource,
    fetcher,
    minLength,
    debounceMs,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      clearSearch();
      setSearch('');
    }
  }, [open, clearSearch, setSearch]);

  if (!open) return null;

  const q = search.trim();
  const belowMin = isRemote && q.length < effMin;
  const showList = !belowMin && !error;

  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-lg ${className}`}>
      <div className="border-b border-gray-100 p-2">
        <div className="relative">
          <input
            type="search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${inputClassName}`}
          />
          {loading && (
            <Loader2
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
              aria-hidden
            />
          )}
        </div>
      </div>
      {error && (
        <p className="px-3 py-2 text-sm text-red-600" role="alert">
          {error}. Try again.
        </p>
      )}
      {belowMin && !error && (
        <p className="px-3 py-2 text-sm text-gray-500">{belowMinHint}</p>
      )}
      {showList && (
        <ul className="max-h-56 overflow-auto py-1" role="listbox">
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">{emptyMessage}</li>
          )}
          {options.map((item) => {
            const key = getOptionKey(item);
            const primary = getPrimaryLabel(item);
            const secondary = getSecondaryLabel?.(item);
            return (
              <li key={String(key)} role="none">
                <button
                  type="button"
                  role="option"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => onSelect(item)}
                >
                  <span className="block text-gray-900">{primary}</span>
                  {secondary ? (
                    <span className="text-xs text-gray-500">{secondary}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
