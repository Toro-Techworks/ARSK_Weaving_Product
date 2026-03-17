import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../api/client';
import { Card } from '../components/Card';
import { CardSkeleton } from '../components/Skeleton';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';

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

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/dashboard').then(({ data: d }) => setData(d)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useRefreshOnSameMenuClick(fetch);

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <Card title="Daily Production (Last 7 days)">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
          </div>
        </Card>
      </div>
    );
  }

  const statCards = [
    { label: "Today's Production", value: `${Number(data?.today_production ?? 0).toLocaleString()} m` },
    { label: 'Active Looms', value: data?.active_looms ?? 0 },
    { label: 'Pending Payments', value: `₹${Number(data?.pending_payments ?? 0).toLocaleString()}` },
    { label: 'Orders', value: data?.running_orders ?? 0 },
  ];

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <Card className="transition-shadow duration-200 hover:shadow-md">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.15 }}
      >
        <Card title="Daily Production (Last 7 days)">
          <BarChart data={data?.daily_production} />
        </Card>
      </motion.div>
    </div>
  );
}
