import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

function formatInactiveSince(period) {
  if (!period) return null;
  return period.inactive_since_display || period.inactive_since || null;
}

/**
 * Subtle info icon beside inactive badge — hover/click shows inactive period details.
 */
export function LoomInactiveInfoTip({ period, className = '' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const since = formatInactiveSince(period);
  const reason = period?.inactive_reason || null;
  const remarks = period?.remarks ? String(period.remarks).trim() : '';

  if (!since && !reason && !remarks) return null;

  return (
    <span ref={wrapRef} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full p-0.5 text-amber-700/80 hover:text-amber-900 hover:bg-amber-100/80 focus:outline-none focus:ring-1 focus:ring-amber-400"
        aria-label="Inactive period details"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
      {open ? (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-[50] mt-1 w-56 rounded-lg border border-amber-200/90 bg-white px-3 py-2 text-left text-[11px] leading-snug text-gray-700 shadow-lg"
        >
          {since ? (
            <p>
              <span className="font-semibold text-gray-900">Inactive since:</span> {since}
            </p>
          ) : null}
          {reason ? (
            <p className={since ? 'mt-1' : ''}>
              <span className="font-semibold text-gray-900">Reason:</span> {reason}
            </p>
          ) : null}
          {remarks ? (
            <p className="mt-1 text-gray-600">
              <span className="font-semibold text-gray-800">Remarks:</span> {remarks}
            </p>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}
