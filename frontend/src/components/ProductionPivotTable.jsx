import React, { memo } from 'react';

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

/** @param {import('../utils/productionPivotReport').DateShiftColumn} col */
function slotCellClass(col) {
  const base = 'border-r border-gray-100 px-1 py-0.5 align-top min-w-[7.5rem] max-w-[11rem]';
  if (col.shift === 'Night') return `${base} border-r-2 border-gray-300`;
  return base;
}

/** @param {import('../utils/productionPivotReport').DateShiftColumn} col */
function slotNumCellClass(col) {
  const base = 'border-r border-gray-100 px-1 py-0.5 align-middle';
  if (col.shift === 'Night') return `${base} border-r-2 border-gray-300`;
  return base;
}

/** Read-only report cell for text (order id, SL). */
function ReadOnlyTextCell({ value, title }) {
  const s = value != null && String(value).trim() !== '' ? String(value).trim() : '';
  return (
    <div
      className="w-full min-h-[1.5rem] text-xs text-gray-900 px-1 py-0.5 whitespace-pre-wrap break-words bg-gray-50/60 rounded border border-transparent"
      title={title || (s || undefined)}
    >
      {s || '—'}
    </div>
  );
}

const LoomPivotRows = memo(function LoomPivotRows({
  block,
  dateShiftColumns,
  dates,
}) {
  return (
    <>
      <tr className="bg-white hover:bg-slate-50/80 border-b border-gray-100">
        <td
          rowSpan={4}
          className="sticky left-0 z-10 w-24 min-w-[5.5rem] bg-slate-50 border-r border-gray-200 px-2 py-1 align-middle font-bold text-gray-900 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"
        >
          {block.loomNumber}
        </td>
        <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-white border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
          Order ID
        </td>
        {dateShiftColumns.map((col) => (
          <td key={col.key} className={slotCellClass(col)}>
            <ReadOnlyTextCell value={block.orderId[col.key] ?? ''} />
          </td>
        ))}
      </tr>
      <tr className="bg-slate-50/30 hover:bg-slate-50/50 border-b border-gray-100">
        <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-slate-50/30 border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
          SL No
        </td>
        {dateShiftColumns.map((col) => (
          <td key={col.key} className={slotCellClass(col)}>
            <ReadOnlyTextCell value={block.slNo[col.key] ?? ''} />
          </td>
        ))}
      </tr>
      <tr className="bg-slate-50/40 hover:bg-slate-50 border-b border-gray-100">
        <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-slate-50/40 border-r border-gray-200 px-2 py-1 text-gray-600 text-xs font-medium uppercase tracking-wide shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
          Shift Mtr
        </td>
        {dateShiftColumns.map((col) => (
          <td key={col.key} className={slotNumCellClass(col)}>
            <div className="w-full text-right text-xs font-mono tabular-nums text-gray-900 px-1 py-0.5 bg-gray-50/60 rounded min-h-[1.5rem] flex items-center justify-end">
              {block.shiftMtr[col.key] != null && block.shiftMtr[col.key] !== ''
                ? displayNum(block.shiftMtr[col.key])
                : '—'}
            </div>
          </td>
        ))}
      </tr>
      <tr className="bg-white hover:bg-slate-50/80 border-b-2 border-gray-300">
        <td className="sticky left-24 z-10 w-28 min-w-[6.5rem] bg-white border-r border-gray-200 px-2 py-1 text-gray-700 text-xs font-semibold uppercase tracking-wide shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
          Total Mtr (day)
        </td>
        {dates.map((d) => (
          <td
            key={d}
            colSpan={2}
            className="border-r-2 border-gray-300 px-1.5 py-1 text-right font-mono text-xs tabular-nums text-gray-900 font-medium bg-slate-50/30"
          >
            {displayNum(block.dateTotal[d])}
          </td>
        ))}
      </tr>
    </>
  );
});

/**
 * @param {{ bundle: ReturnType<import('../utils/productionPivotReport').buildProductionPivotBundle> }} props
 */
function ProductionPivotTableInner({ bundle }) {
  const { dates, dateShiftColumns, loomBlocks, summaries, globalWeavers } = bundle;

  if (!dates.length) {
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

  return (
    <div className="rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[min(78vh,1200px)] overflow-y-auto">
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
                  className={`text-xs text-violet-950 px-1.5 py-1 align-top whitespace-pre-wrap ${
                    col.shift === 'Night' ? 'border-r-2 border-violet-200' : 'border-r border-violet-100'
                  }`}
                  title={gw1[col.key] || undefined}
                >
                  {gw1[col.key] || '—'}
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
              <LoomPivotRows
                key={String(block.loomId)}
                block={block}
                dateShiftColumns={dateShiftColumns}
                dates={dates}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-amber-50/90 border-t-2 border-amber-200">
              <td
                colSpan={2}
                className="sticky left-0 z-10 bg-amber-50 border-r border-amber-200 px-2 py-1.5 font-semibold text-amber-950 text-xs uppercase tracking-wide"
              >
                Total shift m
              </td>
              {dateShiftColumns.map((col) => (
                <td
                  key={col.key}
                  className={`px-1.5 py-1.5 text-right font-mono text-xs font-semibold tabular-nums text-amber-950 ${
                    col.shift === 'Night' ? 'border-r-2 border-amber-200' : 'border-r border-amber-100'
                  }`}
                >
                  {displayNum(summaries.totalMetersPerSlot[col.key])}
                </td>
              ))}
            </tr>
            <tr className="bg-amber-50/70 border-b border-amber-100">
              <td
                colSpan={2}
                className="sticky left-0 z-10 bg-amber-50 border-r border-amber-200 px-2 py-1.5 font-semibold text-amber-950 text-xs uppercase tracking-wide"
              >
                Active looms
              </td>
              {dateShiftColumns.map((col) => (
                <td
                  key={col.key}
                  className={`px-1.5 py-1.5 text-right font-mono text-xs tabular-nums text-amber-950 ${
                    col.shift === 'Night' ? 'border-r-2 border-amber-200' : 'border-r border-amber-100'
                  }`}
                >
                  {summaries.activeLoomsPerSlot[col.key] ?? 0}
                </td>
              ))}
            </tr>
            <tr className="bg-amber-100/80 border-b border-amber-200">
              <td
                colSpan={2}
                className="sticky left-0 z-10 bg-amber-100 border-r border-amber-200 px-2 py-1.5 font-semibold text-amber-950 text-xs uppercase tracking-wide"
              >
                Avg / loom
              </td>
              {dateShiftColumns.map((col) => {
                const v = summaries.avgPerLoomPerSlot[col.key];
                return (
                  <td
                    key={col.key}
                    className={`px-1.5 py-1.5 text-right font-mono text-xs tabular-nums text-amber-950 ${
                      col.shift === 'Night' ? 'border-r-2 border-amber-200' : 'border-r border-amber-100'
                    }`}
                  >
                    {v == null ? '' : displayNum(v)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-gray-500 px-3 py-2 border-t border-gray-200 bg-gray-50">
        <strong>Weaver 1</strong> and <strong>Weaver 2</strong> are shared rows for the whole matrix. Each loom shows <strong>Order ID</strong>, <strong>SL No</strong> (fabric line numbers for that order), <strong>Shift Mtr</strong>, and <strong>Total Mtr (day)</strong> — all read-only from production data.
      </p>
    </div>
  );
}

export const ProductionPivotTable = memo(ProductionPivotTableInner);

export default ProductionPivotTable;
