import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';
import SearchableSelect from './ui/SearchableSelect';
import { LOOM_INACTIVE_REASONS } from '../constants/loomInactiveReasons';

const OVERLAY =
  'fixed inset-0 z-[10000] flex min-h-screen w-full items-center justify-center bg-black/50 p-4';

/**
 * Modal for marking a loom inactive (reason required + optional remarks).
 */
export function LoomInactiveModal({
  open,
  loomLabel,
  saving = false,
  onClose,
  onConfirm,
  reasonOptions = LOOM_INACTIVE_REASONS,
}) {
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setRemarks('');
    }
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const options = reasonOptions.map((r) => ({ value: r, label: r }));

  const handleConfirm = () => {
    const r = String(reason || '').trim();
    if (!r) return;
    onConfirm({ inactive_reason: r, remarks: String(remarks || '').trim() });
  };

  return createPortal(
    <div className={OVERLAY} role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="loom-inactive-modal-title"
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <h3 id="loom-inactive-modal-title" className="text-base font-semibold text-gray-900">
            Mark Loom as Inactive
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {loomLabel ? (
          <p className="px-4 pt-3 text-sm text-gray-600">
            Loom: <span className="font-medium text-gray-900">{loomLabel}</span>
          </p>
        ) : null}
        <div className="px-4 py-3 space-y-3">
          <div className="space-y-1">
            <label htmlFor="loom-inactive-reason-select" className="block text-sm font-medium text-gray-800">
              Reason <span className="text-red-600">*</span>
            </label>
            <SearchableSelect
              inputId="loom-inactive-reason-select"
              options={options}
              value={reason}
              onChange={(v) => setReason(v ? String(v) : '')}
              placeholder="Select reason"
              isDisabled={saving}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="loom-inactive-remarks" className="block text-sm font-medium text-gray-800">
              Remarks
            </label>
            <textarea
              id="loom-inactive-remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={saving}
              placeholder="Optional details…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-50"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={saving || !String(reason).trim()}>
            {saving ? 'Saving…' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
