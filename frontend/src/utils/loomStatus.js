/**
 * Normalizes `looms.status` from the API / DB for display and branching.
 * Generic codes may send Active/Inactive with varying case.
 */
export function normalizeLoomStatus(status) {
  if (status == null || status === '') return 'Active';
  const s = String(status).trim();
  if (/^inactive$/i.test(s)) return 'Inactive';
  if (/^active$/i.test(s)) return 'Active';
  return s;
}

export function isLoomInactiveStatus(status) {
  return normalizeLoomStatus(status) === 'Inactive';
}

/** Compact pill (Daily Entry loom column). */
export function loomStatusPillClassName(status) {
  return isLoomInactiveStatus(status)
    ? 'bg-amber-50 text-amber-900 border-amber-200'
    : 'bg-emerald-50/90 text-emerald-800 border-emerald-200/90';
}

/** Slightly larger pill (Looms table / modals). */
export function loomStatusTablePillClassName(status) {
  return isLoomInactiveStatus(status)
    ? 'bg-amber-50 text-amber-900 border-amber-200'
    : 'bg-emerald-50/90 text-emerald-800 border-emerald-200/90';
}
