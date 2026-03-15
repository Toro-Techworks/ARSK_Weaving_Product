import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Card } from '../components/Card';

function BarChart({ data }) {
  const max = Math.max(...(data?.map((d) => d.meters) || [1]), 1);
  return (
    <div className="flex items-end gap-2 h-40 mt-4">
      {data?.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center">
          <div
            className="w-full bg-brand rounded-t transition-all"
            style={{ height: `${(d.meters / max) * 100}%`, minHeight: d.meters ? 4 : 0 }}
          />
          <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">
            {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(({ data: d }) => setData(d)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <p className="text-sm text-gray-500">Today's Production</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{Number(data?.today_production ?? 0).toLocaleString()} m</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Active Looms</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data?.active_looms ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Pending Payments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹{Number(data?.pending_payments ?? 0).toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">GST Payable</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹{Number(data?.gst_payable ?? 0).toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Running Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data?.running_orders ?? 0}</p>
        </Card>
      </div>
      <Card title="Daily Production (Last 7 days)">
        <BarChart data={data?.daily_production} />
      </Card>
    </div>
  );
}
