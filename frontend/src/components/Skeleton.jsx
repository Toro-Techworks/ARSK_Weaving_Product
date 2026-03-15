import React from 'react';

/**
 * Generic skeleton pulse bar. Use for tables, cards, etc.
 */
export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Table skeleton: header row + N body rows.
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="overflow-x-auto" role="status" aria-label="Loading table">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <Skeleton className="h-4 w-full max-w-[8rem]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Card skeleton for dashboard stats.
 */
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" role="status" aria-label="Loading card">
      <Skeleton className="h-4 w-3/4 mb-3" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * Page loading: centered spinner with optional skeleton blocks.
 */
export function PageSkeleton({ showCards = false }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      {showCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" aria-hidden="true" />
      </div>
    </div>
  );
}

export default Skeleton;
