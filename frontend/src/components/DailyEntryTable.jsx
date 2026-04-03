import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Button from './Button';
import { fetchAllPaginated } from '../utils/pagination';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import SearchableSelect from './ui/SearchableSelect';
import { GENERIC_CODE_TYPES, FALLBACK_SHIFT_OPTIONS } from '../constants/genericCodeTypes';
import { useGenericCode } from '../hooks/useGenericCode';
import { formatOrderId } from '../utils/formatOrderId';
import {
  buildDateShiftColumns,
  canonicalizeShiftForPivot,
  makeDateShiftSlotKey,
} from '../utils/productionPivotReport';
import {
  ROW_METERS,
  ROW_ORDER,
  ROW_SL,
  ROW_WEAVER1,
  ROW_WEAVER2,
  buildFlatSelectableCells,
  makeChangedCellKey,
  makeSelectIdSlot,
  makeSelectIdWeaver,
  selectIdsFromRange,
} from '../utils/dailyEntryCells';
import { isLoomInactiveStatus, loomStatusPillClassName, normalizeLoomStatus } from '../utils/loomStatus';

/** Portal overlay above grid/transform contexts (matches Looms page pattern). */
const LOOM_STATUS_MODAL_OVERLAY =
  'fixed inset-0 z-[10000] flex min-h-screen w-full items-center justify-center bg-black/50 p-4';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Last N days including today (oldest → newest), YYYY-MM-DD. */
function buildDateColumns(days = 7) {
  const list = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

function formatDayHeader(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y) return ymd;
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

function displayNum(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number' && Number.isFinite(v)) return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

function emptySlot() {
  return {
    id: null,
    meters: '',
    weaver1_id: '',
    weaver2_id: '',
    weaver1_name: '',
    weaver2_name: '',
    yarn_order_id: '',
    fabric_id: '',
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function normalizeMetersStr(m) {
  if (m === '' || m == null) return '';
  const n = Number(m);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : String(round2(n));
}

function isInteractiveCellTarget(t) {
  if (!t || typeof t.closest !== 'function') return false;
  return Boolean(t.closest('input, textarea, button, [role="combobox"], .erp-select__input'));
}

/**
 * Value for the global weaver row: single non-empty id across looms, ignoring looms with no id yet.
 * Empty only when all blank or when two different non-empty ids conflict.
 */
function globalWeaverValue(looms, slots, colKey, field) {
  const raw = looms.map((loom) => String(slots[String(loom.id)]?.[colKey]?.[field] ?? '').trim());
  const nonEmpty = raw.filter(Boolean);
  if (nonEmpty.length === 0) return '';
  const unique = [...new Set(nonEmpty)];
  return unique.length === 1 ? unique[0] : '';
}

function weaverOptionLabel(w) {
  if (!w) return '';
  return w.employee_code ? `${w.weaver_name} (${w.employee_code})` : w.weaver_name;
}

/** @param {import('../utils/productionPivotReport').DateShiftColumn} col */
function slotCellClass(col) {
  const base = 'border-r border-gray-100 px-1 py-0.5 align-top min-w-[7.5rem] max-w-[11rem]';
  if (col.shift === 'Night') return `${base} border-r-2 border-gray-300`;
  return base;
}

function slotNumCellClass(col) {
  const base = 'border-r border-gray-100 px-1 py-0.5 align-top min-w-[7.5rem]';
  if (col.shift === 'Night') return `${base} border-r-2 border-gray-300`;
  return base;
}

function slNumLabel(f, i) {
  if (f.sl_number) return f.design ? `${f.sl_number} · ${f.design}` : f.sl_number;
  return `SL ${i + 1}${f.design ? ` · ${f.design}` : ''}`;
}

function slFabricOptions(fabricsByOrderId, orderId) {
  const oid = orderId ? String(orderId) : '';
  if (!oid) return [];
  const list = (fabricsByOrderId[oid] || []).slice().sort((a, b) => Number(a.id) - Number(b.id));
  return list.map((f, i) => ({
    value: String(f.id),
    label: slNumLabel(f, i),
  }));
}

function fabricIdValidForSlot(s, fabricsByOrderId) {
  if (!s.fabric_id || !s.yarn_order_id) return true;
  const opts = slFabricOptions(fabricsByOrderId, s.yarn_order_id);
  return opts.some((o) => o.value === String(s.fabric_id));
}

const EditableLoomPivotRows = memo(function EditableLoomPivotRows({
  loom,
  dateShiftColumns,
  dates,
  fabricsByOrderId,
  orderOptions,
  ensureFabricsForOrder,
  slots,
  commitSlotPatch,
  canEdit,
  wrapRef,
  cellShellClass,
  onSelectPointerDown,
  onSelectPointerEnter,
  onLoomStatusBadgeClick,
}) {
  const lid = String(loom.id);
  const loomInactive = isLoomInactiveStatus(loom.status);
  const rowCanEdit = canEdit && !loomInactive;
  const loomAssignedOrderId = loom.yarn_order_id != null && loom.yarn_order_id !== '' ? String(loom.yarn_order_id) : '';
  const loomAssignedFabricId = loom.fabric_id != null && loom.fabric_id !== '' ? String(loom.fabric_id) : '';
  const isLoomLockedToAssignedProduct = Boolean(loomAssignedFabricId && loomAssignedOrderId);
  const loomAssignedOrderOption =
    isLoomLockedToAssignedProduct && orderOptions
      ? orderOptions.find((o) => o.value === loomAssignedOrderId) || { value: loomAssignedOrderId, label: loomAssignedOrderId }
      : null;

  const onKeyDown = (e) => {
    if (!wrapRef?.current || e.key !== 'Enter') return;
    e.preventDefault();
    const nodes = Array.from(wrapRef.current.querySelectorAll('input[type="number"]:not([disabled])'));
    const i = nodes.indexOf(document.activeElement);
    if (i >= 0) nodes[i + 1]?.focus();
  };

  return (
    <>
      <tr
        className={`bg-white hover:bg-slate-50/80 border-b border-gray-100 ${
          loomInactive ? 'opacity-90 bg-amber-50/20' : ''
        }`}
      >
        <td
          rowSpan={4}
          className={`sticky left-0 z-10 w-24 min-w-[5.5rem] bg-slate-50 border-r border-gray-200 px-2 py-2 align-top shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] ${
            loomInactive ? 'border-l-2 border-l-amber-400' : ''
          }`}
          title={loomInactive ? 'Inactive loom — grid cells are read-only. Use status to reactivate.' : undefined}
        >
          <div className="flex flex-col gap-1 items-start">
            <span className="font-bold text-gray-900 leading-tight whitespace-nowrap">
              {loom.loom_number ?? lid}
            </span>
            <button
              type="button"
              disabled={!canEdit || !onLoomStatusBadgeClick}
              title={
                canEdit && onLoomStatusBadgeClick
                  ? isLoomInactiveStatus(loom.status)
                    ? 'Click to reactivate this loom'
                    : 'Click to mark this loom inactive'
                  : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onLoomStatusBadgeClick?.(loom);
              }}
              className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-md border leading-none transition-opacity ${loomStatusPillClassName(
                loom.status,
              )} ${canEdit && onLoomStatusBadgeClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default opacity-95'}`}
            >
              {normalizeLoomStatus(loom.status)}
            </button>
          </div>
        </td>
        <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-white border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
          Order ID
        </td>
        {dateShiftColumns.map((col) => {
          const s = slots[lid]?.[col.key] ?? emptySlot();
          return (
            <td
              key={col.key}
              className={`${slotCellClass(col)} ${cellShellClass(lid, col.key, ROW_ORDER)}`}
              onMouseDown={(e) => onSelectPointerDown(e, makeSelectIdSlot(lid, col.key, ROW_ORDER))}
              onMouseEnter={() => onSelectPointerEnter(makeSelectIdSlot(lid, col.key, ROW_ORDER))}
            >
              <SearchableSelect
                options={isLoomLockedToAssignedProduct && loomAssignedOrderOption ? [loomAssignedOrderOption] : orderOptions}
                value={isLoomLockedToAssignedProduct ? loomAssignedOrderId : s.yarn_order_id || ''}
                onChange={(v) => {
                  if (isLoomLockedToAssignedProduct) return;
                  const oid = v || '';
                  commitSlotPatch(lid, col.key, { yarn_order_id: oid, fabric_id: '' });
                  if (oid) ensureFabricsForOrder(oid);
                }}
                placeholder="Order"
                isDisabled={!rowCanEdit || isLoomLockedToAssignedProduct}
                compact
                hideIndicators
                isClearable
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </td>
          );
        })}
      </tr>
      <tr
        className={`bg-slate-50/30 hover:bg-slate-50/50 border-b border-gray-100 ${loomInactive ? 'opacity-90 bg-amber-50/15' : ''}`}
      >
        <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-slate-50/30 border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
          SL No
        </td>
        {dateShiftColumns.map((col) => {
          const s = slots[lid]?.[col.key] ?? emptySlot();
          const oidForOptions = isLoomLockedToAssignedProduct ? loomAssignedOrderId : s.yarn_order_id || '';
          const slOpts = slFabricOptions(fabricsByOrderId, oidForOptions);
          const fixedSlOptions =
            isLoomLockedToAssignedProduct && loomAssignedFabricId
              ? slOpts.some((o) => o.value === loomAssignedFabricId)
                ? slOpts.filter((o) => o.value === loomAssignedFabricId)
                : [
                    {
                      value: loomAssignedFabricId,
                      label: loom.sl_number ? String(loom.sl_number) : `Line #${loomAssignedFabricId}`,
                    },
                  ]
              : slOpts;
          const slValue = isLoomLockedToAssignedProduct
            ? loomAssignedFabricId
            : fabricIdValidForSlot(s, fabricsByOrderId)
              ? s.fabric_id || ''
              : '';
          return (
            <td
              key={col.key}
              className={`${slotCellClass(col)} ${cellShellClass(lid, col.key, ROW_SL)}`}
              onMouseDown={(e) => onSelectPointerDown(e, makeSelectIdSlot(lid, col.key, ROW_SL))}
              onMouseEnter={() => onSelectPointerEnter(makeSelectIdSlot(lid, col.key, ROW_SL))}
            >
              <SearchableSelect
                options={fixedSlOptions}
                value={slValue}
                onChange={(v) => {
                  if (isLoomLockedToAssignedProduct) return;
                  commitSlotPatch(lid, col.key, { fabric_id: v || '' });
                }}
                placeholder={oidForOptions ? 'SL' : '—'}
                isDisabled={
                  !rowCanEdit ||
                  !oidForOptions ||
                  (isLoomLockedToAssignedProduct ? fixedSlOptions.length === 0 : fixedSlOptions.length === 0)
                }
                compact
                hideIndicators
                isClearable
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </td>
          );
        })}
      </tr>
      <tr
        className={`bg-slate-50/40 hover:bg-slate-50 border-b border-gray-100 ${loomInactive ? 'opacity-90 bg-amber-50/15' : ''}`}
      >
        <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-slate-50/40 border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
          Shift Mtr
        </td>
        {dateShiftColumns.map((col) => {
          const s = slots[lid]?.[col.key] ?? emptySlot();
          return (
            <td
              key={col.key}
              className={`${slotNumCellClass(col)} ${cellShellClass(lid, col.key, ROW_METERS)}`}
              onMouseDown={(e) => onSelectPointerDown(e, makeSelectIdSlot(lid, col.key, ROW_METERS))}
              onMouseEnter={() => onSelectPointerEnter(makeSelectIdSlot(lid, col.key, ROW_METERS))}
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={s.meters}
                onChange={(e) => commitSlotPatch(lid, col.key, { meters: e.target.value })}
                onKeyDown={onKeyDown}
                disabled={!rowCanEdit}
                placeholder="0"
                className="w-full px-1.5 py-1 text-xs font-mono tabular-nums text-right rounded border border-gray-200 focus:ring-1 focus:ring-brand focus:border-brand disabled:bg-gray-100"
              />
            </td>
          );
        })}
      </tr>
      <tr
        className={`bg-white hover:bg-slate-50/80 border-b-2 border-gray-300 ${loomInactive ? 'opacity-90 bg-amber-50/10' : ''}`}
      >
        <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-white border-r border-gray-200 px-2 py-1 text-gray-700 text-xs font-semibold uppercase tracking-wide shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
          Total Mtr (day)
        </td>
        {dates.map((d) => {
          const daySlots = dateShiftColumns.filter((c) => c.date === d);
          let sum = 0;
          daySlots.forEach((c) => {
            const s = slots[lid]?.[c.key] ?? emptySlot();
            const n = s.meters === '' || s.meters == null ? NaN : Number(s.meters);
            if (Number.isFinite(n) && n > 0) sum += n;
          });
          const total = sum > 0 ? round2(sum) : null;
          return (
            <td
              key={d}
              colSpan={2}
              className="border-r-2 border-gray-300 px-1.5 py-1 text-right font-mono text-xs tabular-nums text-gray-900 font-medium bg-slate-50/30"
            >
              {displayNum(total)}
            </td>
          );
        })}
      </tr>
    </>
  );
});

export function DailyEntryTable({ canEdit = true }) {
  useGenericCode(GENERIC_CODE_TYPES.SHIFT, { fallback: FALLBACK_SHIFT_OPTIONS });

  const dates = useMemo(() => buildDateColumns(7), []);
  const dateShiftColumns = useMemo(() => buildDateShiftColumns(dates), [dates]);
  const dateFrom = dates[0];
  const dateTo = dates[dates.length - 1];

  const [looms, setLooms] = useState([]);
  const [weavers, setWeavers] = useState([]);
  const [yarnOrders, setYarnOrders] = useState([]);
  const [slots, setSlots] = useState({});
  const [fabricsByOrderId, setFabricsByOrderId] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedCells, setEditedCells] = useState({});
  const [loomStatusModalLoom, setLoomStatusModalLoom] = useState(null);
  const [inactiveReasonDraft, setInactiveReasonDraft] = useState('');
  const [loomStatusSaving, setLoomStatusSaving] = useState(false);
  const [selectedIdsArr, setSelectedIdsArr] = useState([]);
  const [savingSelectIds, setSavingSelectIds] = useState([]);
  const wrapRef = useRef(null);
  const fetchedFabricsRef = useRef(new Set());
  const baselineRef = useRef({});
  const selectionDragRef = useRef(false);
  const selectionAnchorFlatRef = useRef(null);
  const [dragSelectActive, setDragSelectActive] = useState(false);

  const flatCells = useMemo(() => buildFlatSelectableCells(looms, dateShiftColumns), [looms, dateShiftColumns]);

  const selectedSet = useMemo(() => new Set(selectedIdsArr), [selectedIdsArr]);

  const flatIndexBySelectId = useMemo(() => {
    const m = new Map();
    flatCells.forEach((c) => m.set(c.selectId, c.flatIndex));
    return m;
  }, [flatCells]);

  const initEmptySlots = useCallback((loomList) => {
    const next = {};
    for (const loom of loomList) {
      const lid = String(loom.id);
      next[lid] = {};
      const defaultOid = loom.yarn_order_id != null && loom.yarn_order_id !== '' ? String(loom.yarn_order_id) : '';
      const defaultFabricId = loom.fabric_id != null && loom.fabric_id !== '' ? String(loom.fabric_id) : '';
      for (const col of dateShiftColumns) {
        next[lid][col.key] = { ...emptySlot(), yarn_order_id: defaultOid, fabric_id: defaultFabricId };
      }
    }
    return next;
  }, [dateShiftColumns]);

  const prefetchFabricsForOrders = useCallback(async (orderIds) => {
    const uniq = [...new Set(orderIds.map((x) => String(x)).filter(Boolean))];
    await Promise.all(
      uniq.map(async (oid) => {
        if (fetchedFabricsRef.current.has(oid)) return;
        fetchedFabricsRef.current.add(oid);
        try {
          const fabrics = await fetchAllPaginated(api, `/fabrics/yarn-order/${oid}`, { perPage: 200 });
          setFabricsByOrderId((p) => ({ ...p, [oid]: fabrics }));
        } catch {
          setFabricsByOrderId((p) => ({ ...p, [oid]: [] }));
        }
      })
    );
  }, []);

  const ensureFabricsForOrder = useCallback(
    (orderId) => {
      if (orderId) prefetchFabricsForOrders([orderId]);
    },
    [prefetchFabricsForOrders]
  );

  const loadData = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) setLoading(true);
    try {
      const [loomList, weaverList, entries, yarnOrdersList] = await Promise.all([
        api.get('/looms-list').then((r) => r.data?.data || []).catch(() => []),
        fetchAllPaginated(api, '/weavers', { perPage: 200 }).catch(() => []),
        fetchAllPaginated(api, '/loom-entries', {
          perPage: 100,
          date_from: dateFrom,
          date_to: dateTo,
        }).catch(() => []),
        fetchAllPaginated(api, '/yarn-orders', { perPage: 200 }).catch(() => []),
      ]);

      const sortedLooms = [...loomList].sort((a, b) =>
        String(a.loom_number ?? '').localeCompare(String(b.loom_number ?? ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );

      setLooms(sortedLooms);
      setWeavers(weaverList);
      setYarnOrders(yarnOrdersList || []);

      const nextSlots = initEmptySlots(sortedLooms);
      (entries || []).forEach((e) => {
        const ds = e.date ? String(e.date).slice(0, 10) : '';
        if (!ds || !dates.includes(ds)) return;
        const sh = canonicalizeShiftForPivot(e.shift);
        if (!sh) return;
        const key = makeDateShiftSlotKey(ds, sh);
        const lid = String(e.loom_id);
        if (!nextSlots[lid]?.[key]) return;
        const prev = nextSlots[lid][key];
        nextSlots[lid][key] = {
          id: e.id,
          meters:
            e.production != null ? String(e.production) : e.meters_produced != null ? String(e.meters_produced) : '',
          weaver1_id: e.weaver1_id != null ? String(e.weaver1_id) : '',
          weaver2_id: e.weaver2_id != null ? String(e.weaver2_id) : '',
          weaver1_name: e.weaver1_name != null && e.weaver1_name !== '' ? String(e.weaver1_name) : '',
          weaver2_name: e.weaver2_name != null && e.weaver2_name !== '' ? String(e.weaver2_name) : '',
          yarn_order_id:
            e.yarn_order_id != null && e.yarn_order_id !== '' ? String(e.yarn_order_id) : prev.yarn_order_id || '',
          fabric_id: e.fabric_id != null && e.fabric_id !== '' ? String(e.fabric_id) : prev.fabric_id || '',
        };
      });
      setSlots(nextSlots);

      const orderIdsToPrefetch = new Set((yarnOrdersList || []).map((y) => String(y.id)));
      sortedLooms.forEach((l) => {
        if (l.yarn_order_id) orderIdsToPrefetch.add(String(l.yarn_order_id));
      });
      Object.keys(nextSlots).forEach((lid) => {
        dateShiftColumns.forEach((col) => {
          const oid = nextSlots[lid][col.key]?.yarn_order_id;
          if (oid) orderIdsToPrefetch.add(String(oid));
        });
      });
      await prefetchFabricsForOrders([...orderIdsToPrefetch]);
      baselineRef.current = JSON.parse(JSON.stringify(nextSlots));
      setEditedCells({});
    } catch {
      toast.error('Failed to load daily entries');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dateFrom, dateTo, dates, dateShiftColumns, initEmptySlots, prefetchFabricsForOrders]);

  const syncDirtyForSlot = useCallback(
    (loomId, colKey, slot) => {
      const col = dateShiftColumns.find((c) => c.key === colKey);
      if (!col) return;
      const baseSlot = baselineRef.current[loomId]?.[colKey] ?? emptySlot();
      const specs = [
        { row: ROW_ORDER, field: 'yarn_order_id', get: (s) => String(s.yarn_order_id ?? '') },
        { row: ROW_SL, field: 'fabric_id', get: (s) => String(s.fabric_id ?? '') },
        { row: ROW_METERS, field: 'meters', get: (s) => normalizeMetersStr(s.meters) },
        { row: ROW_WEAVER1, field: 'weaver1_id', get: (s) => String(s.weaver1_id ?? '') },
        { row: ROW_WEAVER2, field: 'weaver2_id', get: (s) => String(s.weaver2_id ?? '') },
      ];
      setEditedCells((prev) => {
        const next = { ...prev };
        for (const spec of specs) {
          const key = makeChangedCellKey(loomId, col.date, col.shift, spec.row, spec.field);
          const oldV = spec.get(baseSlot);
          const newV = spec.get(slot);
          if (oldV === newV) {
            delete next[key];
          } else {
            next[key] = {
              field: spec.field,
              value: newV,
              loomId: Number(loomId),
              date: col.date,
              shift: col.shift,
            };
          }
        }
        return next;
      });
    },
    [dateShiftColumns]
  );

  const commitSlotPatch = useCallback(
    (loomId, colKey, patch) => {
      setSlots((prev) => {
        const cur = prev[loomId]?.[colKey] ?? emptySlot();
        const nextSlot = { ...cur, ...patch };
        const next = { ...prev, [loomId]: { ...prev[loomId], [colKey]: nextSlot } };
        // Track edited cells immediately so fast consecutive edits + Save don't race.
        syncDirtyForSlot(loomId, colKey, nextSlot);
        return next;
      });
    },
    [syncDirtyForSlot]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRefreshOnSameMenuClick(loadData);

  const sortLoomsList = useCallback((list) => {
    return [...list].sort((a, b) =>
      String(a.loom_number ?? '').localeCompare(String(b.loom_number ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
  }, []);

  const openLoomStatusModal = useCallback((loom) => {
    setInactiveReasonDraft('');
    setLoomStatusModalLoom(loom);
  }, []);

  const closeLoomStatusModal = useCallback(() => {
    if (loomStatusSaving) return;
    setLoomStatusModalLoom(null);
    setInactiveReasonDraft('');
  }, [loomStatusSaving]);

  useEffect(() => {
    if (!loomStatusModalLoom) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeLoomStatusModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loomStatusModalLoom, closeLoomStatusModal]);

  const submitLoomStatusChange = useCallback(async () => {
    if (!loomStatusModalLoom || !canEdit) return;
    const lid = String(loomStatusModalLoom.id);
    const isInactive = isLoomInactiveStatus(loomStatusModalLoom.status);
    if (!isInactive) {
      const reason = inactiveReasonDraft.trim();
      if (!reason) {
        toast.error('Please enter a reason for marking this loom inactive.');
        return;
      }
      setLoomStatusSaving(true);
      try {
        const { data: body } = await api.put(`/looms/${loomStatusModalLoom.id}`, {
          status: 'Inactive',
          inactive_reason: reason,
        });
        const updated = body?.data;
        toast.success('Loom marked inactive');
        setLooms((prev) =>
          sortLoomsList(
            prev.map((l) => {
              if (String(l.id) !== lid) return l;
              return updated ? { ...l, ...updated } : { ...l, status: 'Inactive', inactive_reason: reason };
            }),
          ),
        );
        setLoomStatusModalLoom(null);
        setInactiveReasonDraft('');
      } catch (e) {
        toast.error(e.response?.data?.message || 'Could not update loom');
      } finally {
        setLoomStatusSaving(false);
      }
      return;
    }

    setLoomStatusSaving(true);
    try {
      const { data: body } = await api.put(`/looms/${loomStatusModalLoom.id}`, { status: 'Active' });
      const updated = body?.data;
      toast.success('Loom set to Active');
      if (updated) {
        setLooms((prev) =>
          sortLoomsList(
            prev.map((l) => (String(l.id) === lid ? { ...l, ...updated } : l)),
          ),
        );
      }
      setLoomStatusModalLoom(null);
      setInactiveReasonDraft('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update loom');
    } finally {
      setLoomStatusSaving(false);
    }
  }, [
    loomStatusModalLoom,
    inactiveReasonDraft,
    baselineRef,
    canEdit,
    sortLoomsList,
  ]);

  const weaverOptions = useMemo(() => {
    const opts = (weavers || []).map((w) => ({
      value: String(w.id),
      label: weaverOptionLabel(w),
    }));
    const seen = new Set(opts.map((o) => o.value));
    const extra = [];
    for (const loom of looms) {
      const lid = String(loom.id);
      for (const col of dateShiftColumns) {
        const s = slots[lid]?.[col.key];
        if (!s) continue;
        const id1 = s.weaver1_id ? String(s.weaver1_id) : '';
        if (id1 && !seen.has(id1)) {
          seen.add(id1);
          extra.push({ value: id1, label: s.weaver1_name || `Weaver #${id1}` });
        }
        const id2 = s.weaver2_id ? String(s.weaver2_id) : '';
        if (id2 && !seen.has(id2)) {
          seen.add(id2);
          extra.push({ value: id2, label: s.weaver2_name || `Weaver #${id2}` });
        }
      }
    }
    return [...opts, ...extra];
  }, [weavers, looms, dateShiftColumns, slots]);

  const orderOptions = useMemo(
    () =>
      (yarnOrders || []).map((o) => ({
        value: String(o.id),
        label: formatOrderId(o, o.created_at || o.po_date),
      })),
    [yarnOrders]
  );

  const setGlobalWeaver = useCallback(
    (colKey, field, value) => {
      const nameField = field === 'weaver1_id' ? 'weaver1_name' : 'weaver2_name';
      const w = value ? weavers.find((x) => String(x.id) === String(value)) : null;
      const nameVal = weaverOptionLabel(w);
      setSlots((prev) => {
        const next = { ...prev };
        for (const loom of looms) {
          if (isLoomInactiveStatus(loom.status)) continue;
          const lid = String(loom.id);
          if (!next[lid]) continue;
          const cur = next[lid][colKey] ?? emptySlot();
          const nextSlot = { ...cur, [field]: value || '', [nameField]: nameVal };
          next[lid] = { ...next[lid], [colKey]: nextSlot };
          syncDirtyForSlot(lid, colKey, nextSlot);
        }
        return next;
      });
    },
    [looms, weavers, syncDirtyForSlot]
  );

  const applySelectionIndices = useCallback(
    (idxFrom, idxTo) => {
      const set = selectIdsFromRange(flatCells, idxFrom, idxTo);
      setSelectedIdsArr([...set]);
    },
    [flatCells]
  );

  const onSelectPointerDown = useCallback(
    (e, selectId) => {
      if (!canEdit || e.button !== 0) return;
      if (isInteractiveCellTarget(e.target)) return;
      e.preventDefault();
      const idx = flatIndexBySelectId.get(selectId);
      if (idx === undefined) return;
      if (e.shiftKey && selectionAnchorFlatRef.current != null) {
        applySelectionIndices(selectionAnchorFlatRef.current, idx);
      } else {
        selectionAnchorFlatRef.current = idx;
        setSelectedIdsArr([selectId]);
      }
      selectionDragRef.current = true;
      setDragSelectActive(true);
    },
    [applySelectionIndices, canEdit, flatIndexBySelectId]
  );

  const onSelectPointerEnter = useCallback(
    (selectId) => {
      if (!selectionDragRef.current || !canEdit) return;
      const idx = flatIndexBySelectId.get(selectId);
      if (idx === undefined || selectionAnchorFlatRef.current == null) return;
      applySelectionIndices(selectionAnchorFlatRef.current, idx);
    },
    [applySelectionIndices, canEdit, flatIndexBySelectId]
  );

  useEffect(() => {
    const up = () => {
      selectionDragRef.current = false;
      setDragSelectActive(false);
    };
    document.addEventListener('mouseup', up);
    return () => document.removeEventListener('mouseup', up);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedIdsArr([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cellShellClass = useCallback(
    (loomId, colKey, rowType) => {
      const sid =
        rowType === ROW_WEAVER1 || rowType === ROW_WEAVER2
          ? makeSelectIdWeaver(colKey, rowType)
          : makeSelectIdSlot(String(loomId), colKey, rowType);
      const parts = [];
      if (selectedSet.has(sid)) parts.push('bg-sky-100/70');
      // Highlight edited cells (light amber). For the global weaver rows (loomId is null),
      // highlight if any loom has an edited cell for that date+shift+weaver field.
      const field =
        rowType === ROW_ORDER
          ? 'yarn_order_id'
          : rowType === ROW_SL
            ? 'fabric_id'
            : rowType === ROW_METERS
              ? 'meters'
              : rowType === ROW_WEAVER1
                ? 'weaver1_id'
                : rowType === ROW_WEAVER2
                  ? 'weaver2_id'
                  : null;
      if (field) {
        if (loomId != null) {
          const colMeta = dateShiftColumns.find((c) => c.key === colKey);
          if (colMeta) {
            const cellId = makeChangedCellKey(String(loomId), colMeta.date, colMeta.shift, rowType, field);
            if (editedCells[cellId]) parts.push('bg-amber-100/60');
          }
        } else {
          const colMeta = dateShiftColumns.find((c) => c.key === colKey);
          if (colMeta) {
            const anyEdited = Object.values(editedCells).some(
              (c) => c.field === field && c.date === colMeta.date && c.shift === colMeta.shift,
            );
            if (anyEdited) parts.push('bg-amber-100/60');
          }
        }
      }
      if (savingSelectIds.includes(sid)) parts.push('ring-1 ring-brand/50 ring-inset');
      return parts.join(' ');
    },
    [selectedSet, savingSelectIds, editedCells, dateShiftColumns]
  );

  const editedCount = useMemo(() => Object.keys(editedCells).length, [editedCells]);

  const saveBulk = async () => {
    // Always persist every dirty cell. Selection is for highlight/navigation only; scoping
    // saves to the selection caused most edits to be skipped after the last cell click.
    const inactiveLoomIds = new Set(
      looms.filter((l) => isLoomInactiveStatus(l.status)).map((l) => Number(l.id)),
    );
    const toSave = Object.values(editedCells).filter((c) => !inactiveLoomIds.has(Number(c.loomId)));
    if (editedCount === 0) {
      toast.error('No changes to save');
      return;
    }
    if (toSave.length === 0) {
      toast.error('Nothing to save — inactive looms are read-only');
      return;
    }

    const payload = toSave.map((c) => ({
      loomId: c.loomId,
      date: c.date,
      shift: c.shift,
      field: c.field,
      value:
        c.value === '' || c.value == null ? null : c.field === 'meters' ? Number(c.value) : Number(c.value),
    }));

    const byFieldToRow = {
      yarn_order_id: ROW_ORDER,
      fabric_id: ROW_SL,
      meters: ROW_METERS,
      weaver1_id: ROW_WEAVER1,
      weaver2_id: ROW_WEAVER2,
    };
    const highlightIdSet = new Set();
    for (const c of toSave) {
      const colKey = makeDateShiftSlotKey(c.date, c.shift);
      const rowType = byFieldToRow[c.field];
      if (!rowType) continue;
      if (rowType === ROW_WEAVER1 || rowType === ROW_WEAVER2) {
        highlightIdSet.add(makeSelectIdWeaver(colKey, rowType));
      } else {
        highlightIdSet.add(makeSelectIdSlot(String(c.loomId), colKey, rowType));
      }
    }
    setSavingSelectIds(Array.from(highlightIdSet));
    setSaving(true);
    const tid = toast.loading(`Saving ${payload.length} change${payload.length === 1 ? '' : 's'}…`);
    try {
      const { data: body } = await api.post('/loom-production/batch-update', payload);
      const respPayload = body?.data || {};
      const entries = respPayload.entries || [];
      const deleted = respPayload.deleted || [];

      const loomById = Object.fromEntries(looms.map((l) => [String(l.id), l]));

      setSlots((prev) => {
        const next = { ...prev };
        for (const e of entries) {
          const lid = String(e.loom_id);
          if (!next[lid]) continue;
          const sh = canonicalizeShiftForPivot(e.shift);
          if (!sh) continue;
          const ck = makeDateShiftSlotKey(String(e.date).slice(0, 10), sh);
          const prevRow = next[lid][ck] ?? emptySlot();
          const merged = {
            id: e.id,
            meters:
              e.production != null ? String(e.production) : e.meters_produced != null ? String(e.meters_produced) : '',
            weaver1_id: e.weaver1_id != null ? String(e.weaver1_id) : '',
            weaver2_id: e.weaver2_id != null ? String(e.weaver2_id) : '',
            weaver1_name: e.weaver1_name != null && e.weaver1_name !== '' ? String(e.weaver1_name) : '',
            weaver2_name: e.weaver2_name != null && e.weaver2_name !== '' ? String(e.weaver2_name) : '',
            yarn_order_id:
              e.yarn_order_id != null && e.yarn_order_id !== ''
                ? String(e.yarn_order_id)
                : prevRow.yarn_order_id || '',
            fabric_id: e.fabric_id != null && e.fabric_id !== '' ? String(e.fabric_id) : '',
          };
          next[lid] = { ...next[lid], [ck]: merged };
          if (!baselineRef.current[lid]) baselineRef.current[lid] = {};
          baselineRef.current[lid][ck] = JSON.parse(JSON.stringify(merged));
        }
        for (const d of deleted) {
          const lid = String(d.loom_id);
          const dateStr = d.date ? String(d.date).slice(0, 10) : '';
          const sh = canonicalizeShiftForPivot(d.shift);
          if (!sh || !dateStr || !next[lid]) continue;
          const ck = makeDateShiftSlotKey(dateStr, sh);
          const loom = loomById[lid];
          const defaultOid =
            loom?.yarn_order_id != null && loom.yarn_order_id !== '' ? String(loom.yarn_order_id) : '';
          const cleared = { ...emptySlot(), yarn_order_id: defaultOid };
          next[lid] = { ...next[lid], [ck]: cleared };
          if (!baselineRef.current[lid]) baselineRef.current[lid] = {};
          baselineRef.current[lid][ck] = JSON.parse(JSON.stringify(cleared));
        }
        return next;
      });

      setEditedCells({});
      setSelectedIdsArr([]);
      toast.success(`Saved ${toSave.length} change${toSave.length === 1 ? '' : 's'}`, { id: tid });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed', { id: tid });
    } finally {
      setSaving(false);
      setSavingSelectIds([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!looms.length) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Daily Entry</h2>
        <p className="text-sm text-gray-500">No active looms. Add looms in master data.</p>
      </div>
    );
  }

  const statusModalNode =
    loomStatusModalLoom && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={LOOM_STATUS_MODAL_OVERLAY}
            role="presentation"
            onClick={closeLoomStatusModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="loom-status-modal-title"
              className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
                <h3 id="loom-status-modal-title" className="text-base font-semibold text-gray-900">
                  {isLoomInactiveStatus(loomStatusModalLoom.status)
                    ? `Reactivate loom ${loomStatusModalLoom.loom_number ?? loomStatusModalLoom.id}?`
                    : `Mark loom ${loomStatusModalLoom.loom_number ?? loomStatusModalLoom.id} inactive?`}
                </h3>
                <button
                  type="button"
                  onClick={closeLoomStatusModal}
                  disabled={loomStatusSaving}
                  className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-4 py-3 space-y-3">
                {isLoomInactiveStatus(loomStatusModalLoom.status) ? (
                  <>
                    {loomStatusModalLoom.inactive_reason ? (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-800">Current reason: </span>
                        {loomStatusModalLoom.inactive_reason}
                      </p>
                    ) : null}
                    <p className="text-sm text-gray-600">
                      This loom will return to <strong>Active</strong> and the inactive reason will be cleared on the
                      server.
                    </p>
                  </>
                ) : (
                  <>
                    <label htmlFor="loom-inactive-reason" className="block text-sm font-medium text-gray-800">
                      Reason <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="loom-inactive-reason"
                      rows={3}
                      value={inactiveReasonDraft}
                      onChange={(e) => setInactiveReasonDraft(e.target.value)}
                      disabled={loomStatusSaving}
                      placeholder="Explain why this loom is inactive…"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-50"
                    />
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
                <Button type="button" variant="secondary" onClick={closeLoomStatusModal} disabled={loomStatusSaving}>
                  Cancel
                </Button>
                <Button type="button" onClick={submitLoomStatusChange} disabled={loomStatusSaving}>
                  {loomStatusSaving
                    ? 'Saving…'
                    : isLoomInactiveStatus(loomStatusModalLoom.status)
                      ? 'Set Active'
                      : 'Mark inactive'}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="space-y-3" ref={wrapRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Entry</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Rolling 7 days: {formatDayHeader(dateFrom)} – {formatDayHeader(dateTo)} ({dateFrom} to {dateTo})
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={saveBulk}
            disabled={saving || editedCount === 0}
            className="gap-1.5"
            title="Saves every edited cell. Highlight range: drag / Shift+click on cell padding (Esc clears)."
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : editedCount ? `Save (${editedCount})` : 'Save'}
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden">
        <div
          className={`overflow-x-auto max-h-[min(78vh,1200px)] overflow-y-auto ${
            selectionDragRef.current ? 'select-none' : ''
          }`}
        >
          <table className="min-w-max w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-gray-200">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 w-24 min-w-[5.5rem] bg-slate-100 border-r border-b border-gray-300 px-2 py-2 text-left font-bold text-gray-900 align-middle shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                >
                  Loom
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-24 z-20 w-28 min-w-[6.5rem] bg-slate-100 border-r border-b border-gray-300 px-2 py-2 text-left font-bold text-gray-900 align-middle shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                >
                  Row
                </th>
                {dates.map((d) => (
                  <th
                    key={d}
                    colSpan={2}
                    className="border-r-2 border-gray-300 border-b border-gray-300 px-1 py-2 text-center font-semibold text-gray-800 whitespace-nowrap"
                    title={d}
                  >
                    {formatDayHeader(d)}
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-100 border-b border-gray-300">
                {dateShiftColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-1 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600 border-b border-gray-300 ${
                      col.shift === 'Night' ? 'border-r-2 border-gray-300' : 'border-r border-gray-200'
                    }`}
                    title={`${col.date} · ${col.shift}`}
                  >
                    {col.shift}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-violet-50/70 border-b border-violet-100">
                <td
                  rowSpan={2}
                  className="sticky left-0 z-10 w-24 min-w-[5.5rem] bg-violet-50/90 border-r border-violet-200 px-2 py-1 align-middle text-center text-[11px] font-semibold text-violet-900 uppercase tracking-wide shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"
                >
                  Weavers
                </td>
                <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-violet-50/90 border-r border-violet-200 px-2 py-1 pl-4 font-medium text-violet-950 text-xs shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  Weaver 1
                </td>
                {dateShiftColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`text-xs text-violet-950 px-0.5 py-0.5 align-top ${
                      col.shift === 'Night' ? 'border-r-2 border-violet-200' : 'border-r border-violet-100'
                    } ${cellShellClass(null, col.key, ROW_WEAVER1)}`}
                    onMouseDown={(e) => onSelectPointerDown(e, makeSelectIdWeaver(col.key, ROW_WEAVER1))}
                    onMouseEnter={() => onSelectPointerEnter(makeSelectIdWeaver(col.key, ROW_WEAVER1))}
                  >
                    <SearchableSelect
                      options={weaverOptions}
                      value={globalWeaverValue(looms, slots, col.key, 'weaver1_id')}
                      onChange={(v) => setGlobalWeaver(col.key, 'weaver1_id', v)}
                      placeholder="W1"
                      isDisabled={!canEdit}
                      compact
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    />
                  </td>
                ))}
              </tr>
              <tr className="bg-violet-50/50 border-b-2 border-gray-300">
                <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-violet-50/80 border-r border-violet-200 px-2 py-1 pl-4 font-medium text-violet-950 text-xs shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  Weaver 2
                </td>
                {dateShiftColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`text-xs text-violet-950 px-0.5 py-0.5 align-top ${
                      col.shift === 'Night' ? 'border-r-2 border-violet-200' : 'border-r border-violet-100'
                    } ${cellShellClass(null, col.key, ROW_WEAVER2)}`}
                    onMouseDown={(e) => onSelectPointerDown(e, makeSelectIdWeaver(col.key, ROW_WEAVER2))}
                    onMouseEnter={() => onSelectPointerEnter(makeSelectIdWeaver(col.key, ROW_WEAVER2))}
                  >
                    <SearchableSelect
                      options={weaverOptions}
                      value={globalWeaverValue(looms, slots, col.key, 'weaver2_id')}
                      onChange={(v) => setGlobalWeaver(col.key, 'weaver2_id', v)}
                      placeholder="W2"
                      isDisabled={!canEdit}
                      compact
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    />
                  </td>
                ))}
              </tr>
              {looms.map((loom) => (
                <EditableLoomPivotRows
                  key={String(loom.id)}
                  loom={loom}
                  dateShiftColumns={dateShiftColumns}
                  dates={dates}
                  orderOptions={orderOptions}
                  fabricsByOrderId={fabricsByOrderId}
                  ensureFabricsForOrder={ensureFabricsForOrder}
                  slots={slots}
                  commitSlotPatch={commitSlotPatch}
                  cellShellClass={cellShellClass}
                  onSelectPointerDown={onSelectPointerDown}
                  onSelectPointerEnter={onSelectPointerEnter}
                  canEdit={canEdit}
                  wrapRef={wrapRef}
                  onLoomStatusBadgeClick={canEdit ? openLoomStatusModal : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-500 px-3 py-2 border-t border-gray-200 bg-gray-50">
          <strong>Weaver 1 / 2</strong>: choose once per date and shift — applied to every loom for that slot. Per loom, pick{' '}
          <strong>Order ID</strong> and <strong>SL No</strong> (SL options follow the order above). <strong>Shift Mtr</strong> is meters only.{' '}
          Click or drag empty parts of cells (not inputs/dropdowns) to highlight a range; Shift+click extends; Esc clears.{' '}
          <strong>Save</strong> sends all edited cells in one request. Persists this 7-day window.{' '}
          <strong>Status</strong> badge (per loom): click to mark inactive (reason required) or reactivate.
        </p>
      </div>
      {statusModalNode}
    </div>
  );
}

export default DailyEntryTable;
