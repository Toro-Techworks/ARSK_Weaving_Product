import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';

export function OrderSummaryReport() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/reports/order-summary', { params: { date_from: from || undefined, date_to: to || undefined } })
      .then(({ data: res }) => setData(res))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [from, to]);

  if (!data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" /></div>;

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Order Summary</h2>
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <FormInput type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
          <FormInput type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="text-gray-600">Total Orders: <strong>{data.total_orders}</strong></p>
        <p className="text-gray-600 mt-2">Grand Total: <strong>₹{Number(data.grand_total ?? 0).toLocaleString()}</strong></p>
        {data.by_status && Object.entries(data.by_status).map(([status, info]) => (
          <div key={status} className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">{status}</p>
            <p className="text-sm text-gray-500">Count: {info.count} — Amount: ₹{Number(info.total_amount ?? 0).toLocaleString()}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function LoomEfficiencyReport() {
  const [data, setData] = useState([]);
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/reports/loom-efficiency', { params: { date_from: from, date_to: to } })
      .then(({ data: res }) => setData(res.looms || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [from, to]);
  useRefreshOnSameMenuClick(fetch);

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Loom Efficiency</h2>
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <FormInput type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
          <FormInput type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loom</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net Production (m)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Efficiency %</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days Worked</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.loom_id} className="border-t">
                  <td className="px-4 py-2">{row.loom_number}</td>
                  <td className="px-4 py-2">{Number(row.net_production ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2">{row.efficiency_percentage != null ? `${row.efficiency_percentage}%` : '-'}</td>
                  <td className="px-4 py-2">{row.days_worked ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
