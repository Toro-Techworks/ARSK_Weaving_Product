import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
  useDeferredValue,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

function parseTokens(str) {
  if (!str || !String(str).trim()) return [];
  return String(str)
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean);
}

function joinTokens(tokens) {
  return tokens.join('+');
}

/**
 * Multi-select colours stored as "Red+Blue+Green". Only values present in `options` can be added (dropdown + filter).
 * Typing filters the list; `+` opens the list; Backspace with empty filter removes the last chip.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(next: string) => void} props.onChange
 * @param {Array<{ value: string, label?: string }>} props.options
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 */
const MultiColourInput = forwardRef(function MultiColourInput(
  { value, onChange, options = [], disabled = false, placeholder = 'Add colour…', className = '', onKeyDown: onKeyDownProp },
  ref
) {
  const tokens = useMemo(() => parseTokens(value), [value]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 240 });
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const deferredQuery = useDeferredValue(query);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  const available = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return options.filter((o) => {
      const lab = String(o.label ?? o.value).toLowerCase();
      const val = String(o.value).toLowerCase();
      if (!q) return true;
      return lab.includes(q) || val.includes(q);
    });
  }, [options, deferredQuery]);

  useEffect(() => {
    if (highlight >= available.length) {
      setHighlight(Math.max(0, available.length - 1));
    }
  }, [available.length, highlight]);

  const positionMenu = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 4 + window.scrollY,
      left: r.left + window.scrollX,
      width: Math.max(220, r.width),
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    positionMenu();
    const onScroll = () => positionMenu();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const allowedSet = useMemo(() => new Set(options.map((o) => o.value)), [options]);

  const appendColour = useCallback(
    (raw) => {
      const v = typeof raw === 'string' ? raw : raw?.value;
      if (!v || !allowedSet.has(v)) return;
      if (tokens.includes(v)) {
        setQuery('');
        setOpen(false);
        return;
      }
      const next = tokens.length ? [...tokens, v] : [v];
      onChange(joinTokens(next));
      setQuery('');
      setOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [allowedSet, onChange, tokens]
  );

  const removeAt = useCallback(
    (idx) => {
      const next = tokens.filter((_, i) => i !== idx);
      onChange(next.length ? joinTokens(next) : '');
    },
    [onChange, tokens]
  );

  const handleKeyDown = (e) => {
    if (disabled) return;
    const isPlus =
      e.key === '+' || (e.key === '=' && e.shiftKey) || e.code === 'NumpadAdd';
    if (isPlus) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
      positionMenu();
      setHighlight(0);
      return;
    }
    if (e.key === 'ArrowDown') {
      if (!open) {
        setOpen(true);
        positionMenu();
      }
      e.preventDefault();
      e.stopPropagation();
      setHighlight((h) => Math.min(h + 1, Math.max(0, available.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      if (!open) return;
      e.preventDefault();
      e.stopPropagation();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (open && available[highlight]) {
        e.preventDefault();
        e.stopPropagation();
        appendColour(available[highlight].value);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setQuery('');
      return;
    }
    if (e.key === 'Backspace' && query === '' && tokens.length > 0) {
      e.preventDefault();
      removeAt(tokens.length - 1);
    }
    if (!e.defaultPrevented) {
      onKeyDownProp?.(e);
    }
  };

  const onInputChange = (e) => {
    if (disabled) return;
    const next = e.target.value;
    const currentTokens = parseTokens(value);
    if (next.includes('+')) {
      const rawParts = next.split('+');
      const complete = rawParts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
      const tail = rawParts[rawParts.length - 1] ?? '';
      let merged = [...currentTokens];
      for (const t of complete) {
        if (allowedSet.has(t) && !merged.includes(t)) merged.push(t);
      }
      const out = merged.length ? joinTokens(merged) : '';
      if (out !== value) onChange(out);
      setQuery(tail);
      setOpen(true);
      positionMenu();
      setHighlight(0);
      return;
    }
    setQuery(next);
    setOpen(true);
    positionMenu();
    setHighlight(0);
  };

  const onFocus = () => {
    if (disabled) return;
    setOpen(true);
    positionMenu();
  };

  const showMenu = open && !disabled;

  const menu = showMenu
    ? createPortal(
        <ul
          ref={menuRef}
          role="listbox"
          className="fixed z-[10050] max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          {available.length === 0 ? (
            <li className="px-3 py-2 text-gray-500">No matches</li>
          ) : (
            available.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={i === highlight}
                className={`cursor-pointer px-3 py-2 ${i === highlight ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50'}`}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  appendColour(opt.value);
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {opt.label ?? opt.value}
              </li>
            ))
          )}
        </ul>,
        document.body
      )
    : null;

  return (
    <div ref={rootRef} className={`relative min-w-[100px] ${className}`}>
      <div
        className={`flex min-h-[34px] flex-wrap items-center gap-1 rounded border px-1.5 py-1 text-sm ${
          disabled
            ? 'border-transparent bg-gray-50/80'
            : 'border-gray-200 bg-white focus-within:border-brand focus-within:ring-1 focus-within:ring-brand'
        }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {tokens.map((t, idx) => (
          <span
            key={`${t}-${idx}`}
            className="inline-flex max-w-full items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-gray-800"
          >
            <span className="truncate">{t}</span>
            {!disabled && (
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(idx);
                }}
                aria-label={`Remove ${t}`}
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={tokens.length ? '' : placeholder}
          className="min-w-[3.5rem] flex-1 border-0 bg-transparent p-0.5 outline-none placeholder:text-gray-400"
          autoComplete="off"
        />
      </div>
      {menu}
    </div>
  );
});

MultiColourInput.displayName = 'MultiColourInput';

export default MultiColourInput;
export { parseTokens, joinTokens };
