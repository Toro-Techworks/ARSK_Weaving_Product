/** Row identifiers for daily entry grid + API bulk payload. */
export const ROW_ORDER = 'order';
export const ROW_SL = 'sl';
export const ROW_METERS = 'meters';
export const ROW_WEAVER1 = 'weaver1';
export const ROW_WEAVER2 = 'weaver2';

/**
 * Dirty-tracker key.
 * Requirement: `${loomId}_${date}_${shift}_${field}` (underscores; dates contain `-`).
 *
 * Note: we keep the `row` argument for backwards compatibility with existing callers,
 * but it is not included in the returned id.
 */
export function makeChangedCellKey(loomId, date, shift, row, field) {
  return `${loomId}_${date}_${shift}_${field}`;
}

export function makeSelectIdSlot(loomId, colKey, row) {
  return `slot:${loomId}:${colKey}:${row}`;
}

export function makeSelectIdWeaver(colKey, weaverRow) {
  return `weaver:${colKey}:${weaverRow}`;
}

export function changeRecordMatchesSelection(rec, selectedSet) {
  if (!selectedSet || selectedSet.size === 0) return true;
  const colKey = `${rec.date}|${rec.shift}`;
  if (rec.row === ROW_WEAVER1 || rec.row === ROW_WEAVER2) {
    return selectedSet.has(makeSelectIdWeaver(colKey, rec.row));
  }
  return selectedSet.has(makeSelectIdSlot(String(rec.loomId), colKey, rec.row));
}

export function changeRecordToSelectId(rec) {
  const colKey = `${rec.date}|${rec.shift}`;
  if (rec.row === ROW_WEAVER1 || rec.row === ROW_WEAVER2) {
    return makeSelectIdWeaver(colKey, rec.row);
  }
  return makeSelectIdSlot(String(rec.loomId), colKey, rec.row);
}

/** Flat ordering for shift+click and drag range (matches DOM reading order). */
export function buildFlatSelectableCells(looms, dateShiftColumns) {
  const out = [];
  for (const col of dateShiftColumns) {
    out.push({ selectId: makeSelectIdWeaver(col.key, ROW_WEAVER1), kind: 'weaver' });
  }
  for (const col of dateShiftColumns) {
    out.push({ selectId: makeSelectIdWeaver(col.key, ROW_WEAVER2), kind: 'weaver' });
  }
  for (const loom of looms) {
    const lid = String(loom.id);
    for (const col of dateShiftColumns) {
      out.push({ selectId: makeSelectIdSlot(lid, col.key, ROW_ORDER), kind: 'slot' });
      out.push({ selectId: makeSelectIdSlot(lid, col.key, ROW_SL), kind: 'slot' });
      out.push({ selectId: makeSelectIdSlot(lid, col.key, ROW_METERS), kind: 'slot' });
    }
  }
  return out.map((item, flatIndex) => ({ ...item, flatIndex }));
}

export function selectIdsFromRange(flatCells, indexA, indexB) {
  const lo = Math.min(indexA, indexB);
  const hi = Math.max(indexA, indexB);
  const set = new Set();
  for (let i = lo; i <= hi; i += 1) {
    const c = flatCells[i];
    if (c) set.add(c.selectId);
  }
  return set;
}
