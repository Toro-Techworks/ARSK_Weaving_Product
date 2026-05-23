import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import Button from './Button';
import { isLoomInactiveStatus, loomStatusTablePillClassName, normalizeLoomStatus } from '../utils/loomStatus';

const OVERLAY =
  'fixed inset-0 z-[10000] flex min-h-screen w-full items-center justify-center bg-black/50 p-4';

function TimelineRow({ item }) {
  const ongoing = !item.inactive_end_date;
  return (
    <li className="relative pl-5 pb-4 border-l-2 border-amber-200 last:pb-0">
      <span
        className={`absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full border border-white ${
          ongoing ? 'bg-amber-500' : 'bg-slate-300'
        }`}
      />
      <p className="text-sm font-medium text-gray-900">{item.inactive_reason || '—'}</p>
      {item.remarks ? <p className="text-xs text-gray-600 mt-0.5">{item.remarks}</p> : null}
      <p className="text-[11px] text-gray-500 mt-1">
        {item.inactive_since_display || '—'}
        {item.inactive_end_date
          ? ` → ${item.inactive_until_display || 'ended'}`
          : ' → present'}
        {item.downtime_days != null ? ` · ${item.downtime_days} days` : ''}
      </p>
    </li>
  );
}

/**
 * Shows current inactive period and history timeline for one loom.
 */
export function LoomInactiveRecordModal({ open, loomId, loomNumber, onClose }) {
  const [loading, setLoading] = useState(false);
  const [loom, setLoom] = useState(null);
  const [inactivity, setInactivity] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !loomId) {
      setLoom(null);
      setInactivity(null);
      setError(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/looms/${loomId}`)
      .then(({ data }) => {
        if (cancelled) return;
        setLoom(data.data);
        setInactivity(data.inactivity || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Could not load inactive record.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loomId]);

  if (!open || typeof document === 'undefined') return null;

  const openPeriod = loom?.current_inactive_period;
  const timeline = inactivity?.timeline || [];
  const label = loomNumber || loom?.loom_number || (loomId ? `Loom #${loomId}` : 'Loom');

  return createPortal(
    <div className={OVERLAY} role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="loom-inactive-record-title"
        className="w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 shrink-0">
          <div>
            <h3 id="loom-inactive-record-title" className="text-base font-semibold text-gray-900">
              Inactive record
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 flex-1">
          {loading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600 py-4">{error}</p>
          ) : (
            <>
              {loom ? (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
                  <span
                    className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-md border ${loomStatusTablePillClassName(
                      loom.status,
                    )}`}
                  >
                    {normalizeLoomStatus(loom.status)}
                  </span>
                </div>
              ) : null}

              {isLoomInactiveStatus(loom?.status) && openPeriod ? (
                <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 text-sm">
                  <p className="font-semibold text-amber-950">Current inactive period</p>
                  <p className="mt-1 text-gray-800">
                    <span className="text-gray-600">Inactive since:</span>{' '}
                    {openPeriod.inactive_since_display || openPeriod.inactive_since || '—'}
                  </p>
                  <p className="mt-0.5 text-gray-800">
                    <span className="text-gray-600">Reason:</span> {openPeriod.inactive_reason || '—'}
                  </p>
                  {openPeriod.remarks ? (
                    <p className="mt-0.5 text-gray-700">
                      <span className="text-gray-600">Remarks:</span> {openPeriod.remarks}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                History
                {inactivity?.total_inactive_days != null ? (
                  <span className="font-normal normal-case text-gray-400 ml-1">
                    ({inactivity.total_inactive_days} total inactive days)
                  </span>
                ) : null}
              </p>
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-500">No inactive periods recorded.</p>
              ) : (
                <ol className="mt-1">{timeline.map((item) => (
                  <TimelineRow key={item.id} item={item} />
                ))}</ol>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-3 shrink-0 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
