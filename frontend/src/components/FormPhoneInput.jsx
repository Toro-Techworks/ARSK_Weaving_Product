import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { countryCodes, flagEmoji, filterCountryCodes } from '../data/countryCodes';
import {
  composeInternationalPhone,
  parsePhoneToParts,
  findPhoneCountryByDial,
} from '../utils/phoneInternational';

/**
 * Phone with searchable static country list: trigger shows flag + dial code;
 * menu shows "🇮🇳 India (+91)" style rows.
 */
export function FormPhoneInput({
  label,
  value,
  onChange,
  required,
  error,
  className = '',
  disabled = false,
  id = 'phone',
  placeholder = 'Mobile number',
}) {
  const { dialCode, national } = useMemo(() => parsePhoneToParts(value), [value]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuRect, setMenuRect] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(menuSearch), 200);
    return () => clearTimeout(t);
  }, [menuSearch]);

  const country = useMemo(
    () => findPhoneCountryByDial(dialCode) || findPhoneCountryByDial('+91'),
    [dialCode],
  );
  const maxLen = country?.nationalLength ?? 10;

  const selectedRow = useMemo(
    () => countryCodes.find((c) => c.dial_code === dialCode) || countryCodes[0],
    [dialCode],
  );

  const listRows = useMemo(() => {
    const rows = filterCountryCodes(debouncedSearch);
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [debouncedSearch]);

  useEffect(() => {
    if (open) setMenuSearch('');
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuRect(null);
      return undefined;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = typeof window !== 'undefined' ? window.innerWidth : 360;
      const maxW = Math.min(vw - 16, 360);
      const minW = Math.max(r.width, 240);
      setMenuRect({
        top: r.bottom + 4,
        left: Math.min(r.left, vw - maxW - 8),
        minWidth: minW,
        maxWidth: maxW,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const t = e.target;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    // Use bubble phase `click` so option `onClick` runs before this handler (mousedown on document was closing the menu first).
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  const pickCountry = (row) => {
    if (!row?.dial_code) return;
    const cap = row.national_length ?? 10;
    const trimmedNat = national.slice(0, cap);
    onChange(composeInternationalPhone(row.dial_code, trimmedNat));
    setOpen(false);
  };

  const setNational = (raw) => {
    const d = String(raw || '').replace(/\D/g, '').slice(0, maxLen);
    onChange(composeInternationalPhone(dialCode, d));
  };

  const borderRing = error
    ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500'
    : 'border-gray-300 focus-within:border-brand focus-within:ring-brand';

  const triggerFlag = flagEmoji(selectedRow.code);

  return (
    <div className={className} ref={rootRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className={`flex rounded-lg border bg-white overflow-hidden focus-within:ring-1 ${borderRing}`}>
        <div className="relative z-10 shrink-0 border-r border-gray-200">
          <button
            ref={triggerRef}
            type="button"
            id={`${id}-country`}
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            className="flex h-full min-h-[42px] min-w-[4.5rem] items-center gap-1 px-2 py-2 text-sm font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-haspopup="listbox"
            aria-expanded={open}
            title="Country code"
          >
            {triggerFlag ? <span className="text-base leading-none" aria-hidden>{triggerFlag}</span> : null}
            <span className="tabular-nums">{dialCode}</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {open &&
            menuRect &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={menuRef}
                className="fixed z-[200] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                style={{
                  top: menuRect.top,
                  left: menuRect.left,
                  minWidth: menuRect.minWidth,
                  maxWidth: menuRect.maxWidth,
                }}
                role="presentation"
              >
                <div className="border-b border-gray-100 px-2 pb-2 pt-1">
                  <input
                    type="search"
                    autoComplete="off"
                    placeholder="Search country or code…"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    aria-label="Search country"
                  />
                </div>
                <ul className="max-h-56 overflow-auto py-1" role="listbox">
                  {listRows.length === 0 && (
                    <li className="px-3 py-2 text-sm text-gray-500" role="status">
                      No results
                    </li>
                  )}
                  {listRows.map((c) => {
                    const selected = c.dial_code === dialCode;
                    const fe = flagEmoji(c.code);
                    return (
                      <li key={`${c.code}-${c.dial_code}`} role="none">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                            selected ? 'bg-brand/5 font-medium text-brand' : 'text-gray-800'
                          }`}
                          onClick={() => pickCountry(c)}
                        >
                          {fe ? (
                            <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden>
                              {fe}
                            </span>
                          ) : (
                            <span className="w-5 shrink-0" aria-hidden />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-gray-900">
                              {c.name}{' '}
                              <span className="tabular-nums text-gray-600">({c.dial_code})</span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>,
              document.body,
            )}
        </div>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          value={national}
          onChange={(e) => setNational(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 disabled:bg-gray-50"
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
