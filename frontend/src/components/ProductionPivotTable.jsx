import React, { memo } from 'react';
import { isLoomInactiveStatus, loomStatusPillClassName, normalizeLoomStatus } from '../utils/loomStatus';
import { canonicalizeShiftForPivot, configForColumn } from '../utils/productionPivotReport';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function displayConfigField(v) {
  if (v == null) return '-';
  const s = String(v).trim();
  return s === '' ? '-' : s;
}

/** Loom config API first, then production row aggregates for that day/night slot. */
function slotMetaDisplay(conf, block, col, field) {
  const fromConf = conf[field];
  if (fromConf != null && String(fromConf).trim() !== '') return displayConfigField(fromConf);
  const blockVal = field === 'order_id' ? block.orderId?.[col.key] : block.customer?.[col.key];
  if (blockVal != null && String(blockVal).trim() !== '') return displayConfigField(blockVal);
  return displayConfigField(null);
}

function configRowCellClass(col) {
  const base = 'border-r border-gray-100 px-2 py-1.5 align-middle text-sm text-gray-900 text-center';
  if (col.shift === 'Night') return `${base} border-r-2 border-gray-300`;
  return base;
}

function slotNumCellClass(col) {
  const base = 'border-r border-gray-100 px-1 py-0.5 align-top min-w-[7.5rem]';
  if (col.shift === 'Night') return `${base} border-r-2 border-gray-300`;
  return base;
}

/** Read-only value cell — matches Daily Entry disabled input appearance. */
function ReadOnlyValueCell({ value, align = 'right', mono = false }) {
  const s = value != null && value !== '' ? displayNum(value) : '';
  return (
    <div
      className={`w-full px-1.5 py-1 text-xs tabular-nums rounded border border-gray-200 bg-gray-100 text-gray-900 min-h-[1.75rem] flex items-center ${
        align === 'right' ? 'justify-end' : 'justify-center'
      } ${mono ? 'font-mono' : ''}`}
    >
      {s || '—'}
    </div>
  );
}

const LoomReportRows = memo(function LoomReportRows({
  block,
  loomMeta,
  dateShiftColumns,
  dates,
  loomConfigByDate,
}) {
  const lid = String(block.loomId);
  const loomInactive = loomMeta ? isLoomInactiveStatus(loomMeta.status) : false;
  const loomNumber = block.loomNumber || loomMeta?.loom_number || lid;

  const rowBg = (variant) => {
    if (loomInactive) return 'bg-amber-50';
    if (variant === 'weave') return 'bg-slate-50/80';
    if (variant === 'mtr') return 'bg-slate-100';
    return 'bg-white';
  };

  return (
    <>
      <tr className={`border-b border-gray-100 ${rowBg('design')} hover:bg-slate-50/80`}>
        <td
          rowSpan={7}
          className={`sticky left-0 z-[30] w-24 min-w-[5.5rem] border-r border-gray-200 px-2 py-2 align-top shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)] ${
            loomInactive ? 'border-l-2 border-l-amber-400' : ''
          }`}
          style={{ backgroundColor: loomInactive ? '#fffbeb' : '#f8fafc' }}
        >
          <div className="flex flex-col gap-1 items-start">
            <span className="font-bold text-gray-900 leading-tight whitespace-nowrap">{loomNumber}</span>
            {loomMeta?.status ? (
              <span
                className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-md border leading-none ${loomStatusPillClassName(
                  loomMeta.status,
                )}`}
              >
                {normalizeLoomStatus(loomMeta.status)}
              </span>
            ) : null}
          </div>
        </td>
        <td
          className="sticky left-24 z-[30] w-28 min-w-[6.5rem] border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
          style={{ backgroundColor: loomInactive ? '#fffbeb' : '#ffffff' }}
        >
          Design
        </td>
        {dateShiftColumns.map((col) => {
          const conf = configForColumn(loomConfigByDate, lid, col);
          return (
            <td key={`design-${col.key}`} className={configRowCellClass(col)}>
              <span className="tabular-nums">{displayConfigField(conf.design)}</span>
            </td>
          );
        })}
      </tr>
      <tr className={`border-b border-gray-100 ${rowBg('weave')} hover:bg-slate-50/80`}>
        <td
          className="sticky left-24 z-[30] w-28 min-w-[6.5rem] border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
          style={{ backgroundColor: loomInactive ? '#fffbeb' : '#f1f5f9' }}
        >
          Weave Tech
        </td>
        {dateShiftColumns.map((col) => {
          const conf = configForColumn(loomConfigByDate, lid, col);
          return (
            <td key={`weave-${col.key}`} className={configRowCellClass(col)}>
              <span className="tabular-nums">{displayConfigField(conf.weave_tech)}</span>
            </td>
          );
        })}
      </tr>
      <tr className={`border-b border-gray-100 ${rowBg('design')} hover:bg-slate-50/80`}>
        <td
          className="sticky left-24 z-[30] w-28 min-w-[6.5rem] border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
          style={{ backgroundColor: loomInactive ? '#fffbeb' : '#ffffff' }}
        >
          Colour
        </td>
        {dateShiftColumns.map((col) => {
          const conf = configForColumn(loomConfigByDate, lid, col);
          return (
            <td key={`colour-${col.key}`} className={configRowCellClass(col)}>
              <span className="tabular-nums">{displayConfigField(conf.colour)}</span>
            </td>
          );
        })}
      </tr>
      <tr className={`border-b border-gray-100 ${rowBg('design')} hover:bg-slate-50/80`}>
        <td
          className="sticky left-24 z-[30] w-28 min-w-[6.5rem] border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
          style={{ backgroundColor: loomInactive ? '#fffbeb' : '#ffffff' }}
        >
          Order ID
        </td>
        {dateShiftColumns.map((col) => {
          const conf = configForColumn(loomConfigByDate, lid, col);
          return (
            <td key={`order-${col.key}`} className={configRowCellClass(col)}>
              <span className="tabular-nums font-mono text-xs">{slotMetaDisplay(conf, block, col, 'order_id')}</span>
            </td>
          );
        })}
      </tr>
      <tr className={`border-b border-gray-100 ${rowBg('weave')} hover:bg-slate-50/80`}>
        <td
          className="sticky left-24 z-[30] w-28 min-w-[6.5rem] border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
          style={{ backgroundColor: loomInactive ? '#fffbeb' : '#f1f5f9' }}
        >
          Customer
        </td>
        {dateShiftColumns.map((col) => {
          const conf = configForColumn(loomConfigByDate, lid, col);
          return (
            <td key={`customer-${col.key}`} className={configRowCellClass(col)}>
              <span className="tabular-nums">{slotMetaDisplay(conf, block, col, 'customer')}</span>
            </td>
          );
        })}
      </tr>
      <tr className={`border-b border-gray-100 ${rowBg('mtr')}`}>
        <td
          className="sticky left-24 z-[30] w-28 min-w-[6.5rem] border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
          style={{ backgroundColor: loomInactive ? '#fffbeb' : '#e2e8f0' }}
        >
          Shift Mtr
        </td>
        {dateShiftColumns.map((col) => (
          <td key={col.key} className={slotNumCellClass(col)}>
            <ReadOnlyValueCell value={block.shiftMtr[col.key]} mono />
          </td>
        ))}
      </tr>
      <tr className={`border-b-2 border-gray-300 ${rowBg('design')} hover:bg-slate-50/80`}>
        <td
          className="sticky left-24 z-[30] w-28 min-w-[6.5rem] border-r border-gray-200 px-2 py-1 text-gray-700 text-xs font-semibold uppercase tracking-wide shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
          style={{ backgroundColor: loomInactive ? '#fffbeb' : '#f8fafc' }}
        >
          Total Mtr (day)
        </td>
        {dates.map((d) => {
          const dayCols = dateShiftColumns.filter((c) => c.date === d);
          const colSpan = dayCols.length || 2;
          return (
            <td
              key={d}
              colSpan={colSpan}
              className="border-r-2 border-gray-300 px-1.5 py-1 text-right font-mono text-xs tabular-nums text-gray-900 font-medium bg-gray-50/80"
            >
              {displayNum(block.dateTotal[d]) || '—'}
            </td>
          );
        })}
      </tr>
    </>
  );
});

/**
 * Production report grid — same layout as Daily Entry (read-only).
 * @param {{ bundle: object, loomConfigByDate: object, looms: array, shiftFilter?: string }} props
 */
function footerCellClass(col) {
  const base = 'border-r border-amber-200 px-1.5 py-1.5 text-right font-mono text-xs tabular-nums text-amber-950 font-semibold';
  if (col.shift === 'Night') return `${base} border-r-2 border-amber-300`;
  return base;
}

export function SummaryFooterRows({ displayColumns, summaries }) {
  const totalMetersPerSlot = summaries?.totalMetersPerSlot ?? {};
  const activeLoomsPerSlot = summaries?.activeLoomsPerSlot ?? {};

  const rows = [
    { label: 'Total Day Mtr', get: (col) => (col.shift === 'Day' ? totalMetersPerSlot[col.key] : null) },
    { label: 'Total Night Mtr', get: (col) => (col.shift === 'Night' ? totalMetersPerSlot[col.key] : null) },
    { label: 'Looms woven', get: (col) => activeLoomsPerSlot[col.key] ?? null, integer: true },
  ];

  return rows.map((row) => (
    <tr key={row.label} className="border-t border-amber-200 bg-amber-50/90">
      <td
        colSpan={2}
        className="sticky left-0 z-[30] border-r border-amber-200 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
        style={{ backgroundColor: '#fffbeb' }}
      >
        {row.label}
      </td>
      {displayColumns.map((col) => {
        const v = row.get(col);
        const text =
          v == null || v === ''
            ? '—'
            : row.integer
              ? String(v)
              : displayNum(v) || '—';
        return (
          <td key={`${row.label}-${col.key}`} className={footerCellClass(col)} title={`${col.date} · ${col.shift}`}>
            {text}
          </td>
        );
      })}
    </tr>
  ));
}

function ProductionPivotTableInner({ bundle, loomConfigByDate = {}, looms = [], shiftFilter = '' }) {
  const { dates, dateShiftColumns, loomBlocks, globalWeavers, summaries } = bundle;

  const displayColumns = React.useMemo(() => {
    if (!shiftFilter) return dateShiftColumns;
    const canon = canonicalizeShiftForPivot(shiftFilter);
    if (!canon) return dateShiftColumns;
    return dateShiftColumns.filter((c) => c.shift === canon);
  }, [dateShiftColumns, shiftFilter]);

  const displayDates = React.useMemo(() => {
    if (!displayColumns.length) return dates;
    return [...new Set(displayColumns.map((c) => c.date))];
  }, [displayColumns, dates]);

  const loomMetaById = React.useMemo(() => {
    const m = new Map();
    (looms || []).forEach((l) => m.set(String(l.id), l));
    return m;
  }, [looms]);

  if (!displayDates.length) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
        Select a valid date range to build the report.
      </p>
    );
  }

  if (!loomBlocks.length) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
        No production rows in this range for the selected filters.
      </p>
    );
  }

  const gw1 = globalWeavers?.weaver1 ?? {};
  const gw2 = globalWeavers?.weaver2 ?? {};
  const shiftsPerDate = displayDates.length
    ? Math.max(...displayDates.map((d) => displayColumns.filter((c) => c.date === d).length), 1)
    : 2;

  return (
    <div className="rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[min(78vh,1200px)] overflow-y-auto">
        <table className="min-w-max w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-gray-200">
              <th
                rowSpan={2}
                className="sticky left-0 z-[40] w-24 min-w-[5.5rem] border-r border-b border-gray-300 px-2 py-2 text-left font-bold text-gray-900 align-middle shadow-[2px_0_6px_-2px_rgba(15,23,42,0.14)]"
                style={{ backgroundColor: '#f1f5f9' }}
              >
                Loom
              </th>
              <th
                rowSpan={2}
                className="sticky left-24 z-[40] w-28 min-w-[6.5rem] border-r border-b border-gray-300 px-2 py-2 text-left font-bold text-gray-900 align-middle shadow-[2px_0_6px_-2px_rgba(15,23,42,0.14)]"
                style={{ backgroundColor: '#f1f5f9' }}
              >
                Row
              </th>
              {displayDates.map((d) => (
                <th
                  key={d}
                  colSpan={shiftsPerDate}
                  className="border-r-2 border-gray-300 border-b border-gray-300 px-1 py-2 text-center font-semibold text-gray-800 whitespace-nowrap"
                  title={d}
                >
                  {formatDayHeader(d)}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-100 border-b border-gray-300">
              {displayColumns.map((col) => (
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
            <tr className="border-b border-violet-200" style={{ backgroundColor: '#f5f3ff' }}>
              <td
                rowSpan={2}
                className="sticky left-0 z-[30] w-24 min-w-[5.5rem] border-r border-violet-200 px-2 py-1 align-middle text-center text-[11px] font-semibold text-violet-900 uppercase tracking-wide shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
                style={{ backgroundColor: '#f5f3ff' }}
              >
                Weavers
              </td>
              <td
                className="sticky left-24 z-[30] w-28 min-w-[6.5rem] border-r border-violet-200 px-2 py-1 pl-4 font-medium text-violet-950 text-xs shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
                style={{ backgroundColor: '#f5f3ff' }}
              >
                Weaver 1
              </td>
              {displayColumns.map((col) => (
                <td
                  key={col.key}
                  className={`text-xs text-violet-950 px-1.5 py-1 align-top whitespace-pre-wrap ${
                    col.shift === 'Night' ? 'border-r-2 border-violet-200' : 'border-r border-violet-100'
                  }`}
                  title={gw1[col.key] || undefined}
                >
                  {gw1[col.key] || '—'}
                </td>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-300" style={{ backgroundColor: '#f5f3ff' }}>
              <td
                className="sticky left-24 z-[30] w-28 min-w-[6.5rem] border-r border-violet-200 px-2 py-1 pl-4 font-medium text-violet-950 text-xs shadow-[2px_0_6px_-2px_rgba(15,23,42,0.12)]"
                style={{ backgroundColor: '#f5f3ff' }}
              >
                Weaver 2
              </td>
              {displayColumns.map((col) => (
                <td
                  key={col.key}
                  className={`text-xs text-violet-950 px-1.5 py-1 align-top whitespace-pre-wrap ${
                    col.shift === 'Night' ? 'border-r-2 border-violet-200' : 'border-r border-violet-100'
                  }`}
                  title={gw2[col.key] || undefined}
                >
                  {gw2[col.key] || '—'}
                </td>
              ))}
            </tr>
            {loomBlocks.map((block) => (
              <LoomReportRows
                key={String(block.loomId)}
                block={block}
                loomMeta={loomMetaById.get(String(block.loomId))}
                dateShiftColumns={displayColumns}
                dates={displayDates}
                loomConfigByDate={loomConfigByDate}
              />
            ))}
            {summaries ? <SummaryFooterRows displayColumns={displayColumns} summaries={summaries} /> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const ProductionPivotTable = memo(ProductionPivotTableInner);

export default ProductionPivotTable;
