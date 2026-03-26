/**
 * Pure helpers: API rows → pivot model (each date → Day + Night columns, grouped by loom).
 * Two global rows (Weaver 1 / Weaver 2) above all looms — names vary per date×shift column.
 * No React imports — safe to test and memoize.
 */

/** @typedef {{ date: string, loom_id: number|string, loom_number?: string, order_id?: number|string, order_from?: string|null, customer?: string|null, fabric_type?: string|null, shift?: string|null, production_meters?: number|string, efficiency_percentage?: number|string|null, weaver1_id?: number|string|null, weaver2_id?: number|string|null, weaver1_name?: string|null, weaver2_name?: string|null }} ProductionReportRow */

/** @typedef {{ key: string, date: string, shift: 'Day' | 'Night' }} DateShiftColumn */

const SHIFT_COLUMNS = /** @type {const} */ (['Day', 'Night']);

/**
 * @param {string} date
 * @param {'Day' | 'Night'} shift
 */
export function makeDateShiftSlotKey(date, shift) {
  return `${date}|${shift}`;
}

/**
 * @param {string} loomId
 * @param {string} slotKey
 */
export function matrixDraftKey(loomId, slotKey) {
  return `${loomId}|${slotKey}`;
}

/**
 * Map API shift string to pivot column (Day / Night only).
 * @param {string|null|undefined} raw
 * @returns {'Day' | 'Night' | null}
 */
export function canonicalizeShiftForPivot(raw) {
  const t = raw != null ? String(raw).trim() : '';
  if (!t || t === '—') return null;
  if (/^day$/i.test(t)) return 'Day';
  if (/^night$/i.test(t)) return 'Night';
  return null;
}

/**
 * Party label from yarn order: company (order_from), then customer, then design, then order id.
 * @param {ProductionReportRow} r
 */
export function partyLabelFromProductionRow(r) {
  const trim = (s) => (s != null && String(s).trim() ? String(s).trim() : '');
  const company = trim(r.order_from);
  const customer = trim(r.customer);
  const fabric = trim(r.fabric_type);
  const oid = r.order_id != null && r.order_id !== '' ? String(r.order_id) : '';

  if (company && customer && company !== customer) {
    return `${company} — ${customer}`;
  }
  if (company) return company;
  if (customer) return customer;
  if (fabric) return fabric;
  if (oid) return `Order ${oid}`;
  return '';
}

/**
 * Inclusive date list YYYY-MM-DD from fromStr to toStr.
 * @param {string} fromStr
 * @param {string} toStr
 * @returns {string[]}
 */
export function enumerateDates(fromStr, toStr) {
  if (!fromStr || !toStr) return [];
  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T00:00:00`);
  if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) return [];
  const out = [];
  const cur = new Date(from);
  while (cur <= to) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Flat column descriptors: for each date, Day then Night.
 * @param {string[]} dates
 * @returns {DateShiftColumn[]}
 */
export function buildDateShiftColumns(dates) {
  /** @type {DateShiftColumn[]} */
  const out = [];
  for (const d of dates) {
    for (const shift of SHIFT_COLUMNS) {
      out.push({ key: makeDateShiftSlotKey(d, shift), date: d, shift });
    }
  }
  return out;
}

/** @param {string} d */
export function normalizeDateKey(d) {
  if (d == null) return '';
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Stable map key so API string/number loom ids match looms-list ids.
 * @param {unknown} id
 * @returns {string|number|null}
 */
export function normalizeLoomId(id) {
  if (id == null || id === '') return null;
  const n = Number(id);
  if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  return String(id);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Recompute calendar-day totals from per-slot shift meters.
 * @param {string[]} dates
 * @param {Record<string, number|null>} shiftMtrVals
 */
export function computeDateTotalsFromSlots(dates, shiftMtrVals) {
  /** @type {Record<string, number|null>} */
  const dateTotalVals = {};
  for (const d of dates) {
    let sum = 0;
    for (const sh of SHIFT_COLUMNS) {
      const k = makeDateShiftSlotKey(d, sh);
      const v = shiftMtrVals[k];
      if (v != null && v > 0) sum += v;
    }
    dateTotalVals[d] = sum > 0 ? round2(sum) : null;
  }
  return dateTotalVals;
}

/**
 * Weaver 1 / Weaver 2 labels for the whole matrix, one string per date×shift column
 * (unique names across all looms for that slot, comma-separated).
 * @param {ProductionReportRow[]} rows
 * @param {DateShiftColumn[]} dateShiftColumns
 */
export function buildGlobalWeaverSlotLabels(rows, dateShiftColumns) {
  const slotKeys = dateShiftColumns.map((c) => c.key);
  const slotSet = new Set(slotKeys);
  /** @type {Record<string, Set<string>>} */
  const w1 = Object.fromEntries(slotKeys.map((k) => [k, new Set()]));
  /** @type {Record<string, Set<string>>} */
  const w2 = Object.fromEntries(slotKeys.map((k) => [k, new Set()]));

  for (const r of rows || []) {
    const dk = normalizeDateKey(r.date);
    const colShift = canonicalizeShiftForPivot(r.shift);
    if (!colShift) continue;
    const slotKey = makeDateShiftSlotKey(dk, colShift);
    if (!slotSet.has(slotKey)) continue;
    const n1 = r.weaver1_name != null ? String(r.weaver1_name).trim() : '';
    const n2 = r.weaver2_name != null ? String(r.weaver2_name).trim() : '';
    if (n1) w1[slotKey].add(n1);
    if (n2) w2[slotKey].add(n2);
  }

  /** @type {Record<string, string>} */
  const weaver1 = {};
  /** @type {Record<string, string>} */
  const weaver2 = {};
  for (const k of slotKeys) {
    weaver1[k] = [...w1[k]].sort().join(', ') || '';
    weaver2[k] = [...w2[k]].sort().join(', ') || '';
  }
  return { weaver1, weaver2 };
}

/**
 * Apply inline matrix draft (party text + shift meters) and refresh summaries.
 * @param {ReturnType<typeof buildProductionPivotBundle>} bundle
 * @param {{ party: Record<string, string>, meters: Record<string, string> }} draft
 */
export function applyMatrixDraft(bundle, draft) {
  if (!bundle.dates.length) return bundle;
  const partyDraft = draft?.party || {};
  const metersDraft = draft?.meters || {};
  if (Object.keys(partyDraft).length === 0 && Object.keys(metersDraft).length === 0) {
    return bundle;
  }

  const loomBlocks = bundle.loomBlocks.map((block) => {
    const lid = String(block.loomId);
    /** @type {Record<string, string>} */
    const party = { ...block.party };
    /** @type {Record<string, number|null>} */
    const shiftMtr = { ...block.shiftMtr };

    for (const { key } of bundle.dateShiftColumns) {
      const dk = matrixDraftKey(lid, key);
      if (partyDraft[dk] !== undefined) party[key] = partyDraft[dk];
      const rawM = metersDraft[dk];
      if (rawM !== undefined && rawM !== '') {
        const n = Number(rawM);
        shiftMtr[key] = Number.isFinite(n) ? round2(n) : null;
      }
    }

    const dateTotal = computeDateTotalsFromSlots(bundle.dates, shiftMtr);

    return {
      ...block,
      party,
      shiftMtr,
      dateTotal,
    };
  });

  const model = { dates: bundle.dates, dateShiftColumns: bundle.dateShiftColumns, loomBlocks };
  const summaries = computeProductionSummaries(model);
  return { ...bundle, loomBlocks, summaries };
}

/**
 * @param {ProductionReportRow[]} rows
 * @param {string[]} dates
 * @param {{ id: number|string, loom_number?: string }[] | null | undefined} allLooms — when set, every listed loom gets a block (empty cells if no production)
 */
export function transformProductionToPivotModel(rows, dates, allLooms = null) {
  const dateSet = new Set(dates);
  const dateShiftColumns = buildDateShiftColumns(dates);
  const slotSet = new Set(dateShiftColumns.map((c) => c.key));

  /** @type {Map<string|number, { loom_number: string, bySlot: Map<string, { parties: Set<string>, meters: number }> }>} */
  const byLoom = new Map();

  for (const r of rows || []) {
    const lid = normalizeLoomId(r.loom_id);
    if (lid == null) continue;
    const dk = normalizeDateKey(r.date);
    if (!dateSet.has(dk)) continue;
    const colShift = canonicalizeShiftForPivot(r.shift);
    if (!colShift) continue;
    const slotKey = makeDateShiftSlotKey(dk, colShift);
    if (!slotSet.has(slotKey)) continue;

    if (!byLoom.has(lid)) {
      byLoom.set(lid, {
        loom_number: r.loom_number != null ? String(r.loom_number) : String(lid),
        bySlot: new Map(),
      });
    }
    const loom = byLoom.get(lid);
    if (!loom.bySlot.has(slotKey)) {
      loom.bySlot.set(slotKey, { parties: new Set(), meters: 0 });
    }
    const cell = loom.bySlot.get(slotKey);
    const party = partyLabelFromProductionRow(r);
    if (party) cell.parties.add(party);
    cell.meters += Number(r.production_meters ?? 0) || 0;
  }

  if (allLooms && allLooms.length > 0) {
    for (const l of allLooms) {
      const lid = normalizeLoomId(l.id);
      if (lid == null) continue;
      const name = l.loom_number != null ? String(l.loom_number) : String(l.id);
      if (!byLoom.has(lid)) {
        byLoom.set(lid, { loom_number: name, bySlot: new Map() });
      } else {
        const entry = byLoom.get(lid);
        entry.loom_number = name;
      }
    }
  }

  let loomIds;
  if (allLooms && allLooms.length > 0) {
    const listMap = new Map();
    for (const l of allLooms) {
      const lid = normalizeLoomId(l.id);
      if (lid == null) continue;
      listMap.set(lid, String(l.loom_number ?? l.id));
    }
    const listed = [...listMap.keys()].sort((a, b) =>
      listMap.get(a).localeCompare(listMap.get(b), undefined, { numeric: true, sensitivity: 'base' })
    );
    const extras = Array.from(byLoom.keys())
      .filter((id) => !listMap.has(id))
      .sort((a, b) =>
        byLoom.get(a).loom_number.localeCompare(byLoom.get(b).loom_number, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
    loomIds = [...listed, ...extras];
  } else {
    loomIds = Array.from(byLoom.keys()).sort((a, b) => {
      const na = byLoom.get(a).loom_number;
      const nb = byLoom.get(b).loom_number;
      return na.localeCompare(nb, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  const loomBlocks = loomIds.map((loomId) => {
    const { loom_number, bySlot } = byLoom.get(loomId);
    /** @type {Record<string, string>} */
    const partyVals = {};
    /** @type {Record<string, number|null>} */
    const shiftMtrVals = {};

    for (const { key } of dateShiftColumns) {
      const agg = bySlot.get(key);
      if (!agg) {
        partyVals[key] = '';
        shiftMtrVals[key] = null;
        continue;
      }
      partyVals[key] = Array.from(agg.parties).sort().join(', ') || '';
      shiftMtrVals[key] = agg.meters > 0 ? round2(agg.meters) : null;
    }

    const dateTotalVals = computeDateTotalsFromSlots(dates, shiftMtrVals);

    return {
      loomId,
      loomNumber: loom_number,
      party: partyVals,
      shiftMtr: shiftMtrVals,
      dateTotal: dateTotalVals,
    };
  });

  return {
    dates,
    dateShiftColumns,
    loomBlocks,
  };
}

/**
 * Footer summary: totals per Day/Night slot (one count per loom).
 * @param {ReturnType<typeof transformProductionToPivotModel>} model
 */
export function computeProductionSummaries(model) {
  const { dateShiftColumns, loomBlocks } = model;

  /** @type {Record<string, number>} */
  const totalMetersPerSlot = {};
  /** @type {Record<string, number>} */
  const activeLoomsPerSlot = {};
  /** @type {Record<string, number|null>} */
  const avgPerLoomPerSlot = {};

  for (const { key } of dateShiftColumns) {
    let sum = 0;
    let active = 0;
    for (const block of loomBlocks) {
      const v = block.shiftMtr[key];
      if (v != null && v > 0) {
        sum += v;
        active += 1;
      }
    }
    totalMetersPerSlot[key] = round2(sum);
    activeLoomsPerSlot[key] = active;
    avgPerLoomPerSlot[key] = active > 0 ? round2(sum / active) : null;
  }

  return {
    totalMetersPerSlot,
    activeLoomsPerSlot,
    avgPerLoomPerSlot,
  };
}

/**
 * @param {ProductionReportRow[]} rows
 * @param {string} fromStr
 * @param {string} toStr
 * @param {{ id: number|string, loom_number?: string }[] | null | undefined} allLooms
 */
export function buildProductionPivotBundle(rows, fromStr, toStr, allLooms = null) {
  const dates = enumerateDates(fromStr, toStr);
  if (!dates.length) {
    return {
      dates: [],
      dateShiftColumns: [],
      loomBlocks: [],
      globalWeavers: { weaver1: {}, weaver2: {} },
      summaries: {
        totalMetersPerSlot: {},
        activeLoomsPerSlot: {},
        avgPerLoomPerSlot: {},
      },
    };
  }
  const model = transformProductionToPivotModel(rows, dates, allLooms);
  const globalWeavers = buildGlobalWeaverSlotLabels(rows, model.dateShiftColumns);
  const summaries = computeProductionSummaries(model);
  return { ...model, summaries, globalWeavers };
}
