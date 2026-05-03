import React, { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { FormInput } from '../components/FormInput';
import { formatOrderId } from '../utils/formatOrderId';

function formatOrderLabel(row) {
  const o = row.yarn_order;
  if (!o) return row.yarn_order_id ? `#${row.yarn_order_id}` : '—';
  const code = o.display_order_id || formatOrderId(o);
  const parts = [code, o.po_number, o.customer].filter(Boolean);
  return parts.join(' — ') || `Order #${o.id}`;
}

function money(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `₹${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ExpenseReportPage() {
  const defaultTo = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [totalAmount, setTotalAmount] = useState(null);
  const [period, setPeriod] = useState(null);

  const runReport = useCallback(() => {
    if (!dateFrom || !dateTo) {
      toast.error('Choose from and to dates');
      return;
    }
    setLoading(true);
    api
      .get('/reports/client-expenses', { params: { date_from: dateFrom, date_to: dateTo } })
      .then(({ data }) => {
        setRows(Array.isArray(data?.data) ? data.data : []);
        setTotalAmount(data?.total_amount ?? 0);
        setPeriod(data?.period ?? { from: dateFrom, to: dateTo });
      })
      .catch(() => {
        toast.error('Failed to load expense report');
        setRows([]);
        setTotalAmount(null);
        setPeriod(null);
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Client expense report</h2>
        <p className="text-sm text-gray-600 mt-1">
          Client-order (P.O.) expenses with company (order from), yarn order ID, design, size, meters, rate per meter, and
          amount. Filter by date range; the footer shows the sum of amounts in range.
        </p>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          <div className="w-full sm:w-auto min-w-[10rem]">
            <FormInput label="From date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="!mb-0" />
          </div>
          <div className="w-full sm:w-auto min-w-[10rem]">
            <FormInput label="To date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="!mb-0" />
          </div>
          <Button type="button" onClick={runReport} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Loading…' : 'Run report'}
          </Button>
        </div>
      </Card>

      <Card>
        {period && (
          <p className="text-sm text-gray-600 mb-4">
            Period: <span className="font-medium text-gray-900">{period.from}</span> to{' '}
            <span className="font-medium text-gray-900">{period.to}</span>
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Company</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Order ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Yarn order</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Expense type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Design</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Size</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Meter</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Rate / m</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[8rem]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-gray-500">
                    No rows. Choose dates and run the report.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-900">{row.date ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-[10rem]">
                      <span className="line-clamp-2" title={row.yarn_order?.order_from || ''}>
                        {row.yarn_order?.order_from?.trim() ? row.yarn_order.order_from : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums text-gray-900">
                      {row.yarn_order?.id ?? row.yarn_order_id ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-800 max-w-[14rem]">
                      <span className="line-clamp-2" title={formatOrderLabel(row)}>
                        {formatOrderLabel(row)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-800">{row.category ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-800">{row.design ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-800">{row.size ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                      {row.meter != null ? Number(row.meter).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">{money(row.rate_per_meter)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">{money(row.amount)}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[12rem]">
                      <span className="line-clamp-2" title={row.notes || ''}>
                        {row.notes || '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && totalAmount != null && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td colSpan={9} className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                    Total amount
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-gray-900">{money(totalAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
