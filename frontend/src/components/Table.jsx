import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { defaultTransition } from '../utils/motion';
import { TableSkeleton } from './Skeleton';

const rowVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -8 },
};

function TableComponent({
  columns,
  data,
  keyField = 'id',
  emptyMessage = 'No data found.',
  isLoading,
}) {
  if (isLoading) {
    return <TableSkeleton rows={6} cols={columns?.length || 4} />;
  }
  if (!data?.length) {
    return <p className="text-gray-500 py-8 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <AnimatePresence initial={false}>
            {data.map((row, index) => (
              <motion.tr
                key={row[keyField]}
                variants={rowVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ ...defaultTransition, delay: index * 0.02 }}
                className="hover:bg-gray-50 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

export const Table = React.memo(TableComponent);
export default Table;
