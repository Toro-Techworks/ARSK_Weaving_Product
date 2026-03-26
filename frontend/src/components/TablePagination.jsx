import React from 'react';
import Button from './Button';
import SearchableSelect from './ui/SearchableSelect';

const PER_PAGE_OPTIONS = [10, 25, 50];

/**
 * ERP-style table footer: "Showing x–y of z", prev/next, page numbers, optional rows-per-page.
 */
export function TablePagination({
  page,
  lastPage,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  disabled = false,
  className = '',
  showPerPageSelector = true,
  maxPageButtons = 5,
}) {
  const safeTotal = Number(total) || 0;
  const safePerPage = Number(perPage) || 10;
  const safePage = Number(page) || 1;
  const safeLast = Math.max(1, Number(lastPage) || 1);
  const from = safeTotal === 0 ? 0 : (safePage - 1) * safePerPage + 1;
  const to = Math.min(safePage * safePerPage, safeTotal);

  const go = (p) => {
    const next = Math.min(Math.max(1, p), safeLast);
    if (next !== safePage) onPageChange(next);
  };

  let startBtn = Math.max(1, safePage - Math.floor(maxPageButtons / 2));
  let endBtn = Math.min(safeLast, startBtn + maxPageButtons - 1);
  if (endBtn - startBtn + 1 < maxPageButtons) {
    startBtn = Math.max(1, endBtn - maxPageButtons + 1);
  }
  const pageButtons = [];
  for (let i = startBtn; i <= endBtn; i += 1) {
    pageButtons.push(i);
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-gray-200 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
        <span>
          {safeTotal === 0
            ? 'No rows'
            : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${safeTotal.toLocaleString()}`}
        </span>
        {showPerPageSelector && onPerPageChange && (
          <label className="inline-flex items-center gap-2">
            <span className="text-gray-500 whitespace-nowrap">Rows per page</span>
            <div className="min-w-[110px]">
              <SearchableSelect
                options={PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                value={String(safePerPage)}
                onChange={(v) => onPerPageChange(Number(v))}
                placeholder="Rows"
                isClearable={false}
                isDisabled={disabled}
              />
            </div>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="!px-3 !py-1.5 text-sm" disabled={disabled || safePage <= 1} onClick={() => go(safePage - 1)}>
          Previous
        </Button>
        <div className="flex flex-wrap items-center gap-1">
          {pageButtons.map((num) => (
            <button
              key={num}
              type="button"
              disabled={disabled}
              onClick={() => go(num)}
              className={`min-w-[2.25rem] px-2 py-1.5 text-sm rounded-lg border transition-colors ${
                num === safePage
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="!px-3 !py-1.5 text-sm"
          disabled={disabled || safePage >= safeLast}
          onClick={() => go(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default TablePagination;
