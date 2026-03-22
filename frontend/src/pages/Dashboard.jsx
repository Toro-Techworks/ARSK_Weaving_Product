import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Factory, Clock, ClipboardList } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import { normalizePaginatedResponse } from '../utils/pagination';
import { StatCard } from '../components/dashboard/StatCard';
import { ProfitExpenseBarCard, LoomDonutCard } from '../components/dashboard/DashboardCharts';

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-9 w-64 max-w-full rounded-lg bg-slate-200/80 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-xl bg-white shadow-sm ring-1 ring-slate-100 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-[380px] rounded-xl bg-white shadow-sm ring-1 ring-slate-100 animate-pulse" />
        <div className="h-[380px] rounded-xl bg-white shadow-sm ring-1 ring-slate-100 animate-pulse" />
      </div>
    </div>
  );
}

function computeDonutPercents(activeLooms, totalLooms) {
  const total = totalLooms > 0 ? totalLooms : 0;
  const active = Math.min(activeLooms || 0, total || Infinity);
  if (total <= 0) {
    return { runningPct: 72, failurePct: 5 };
  }
  const failurePct = 5;
  const remaining = 100 - failurePct;
  const runningPct = (active / total) * remaining;
  return { runningPct, failurePct };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [totalLooms, setTotalLooms] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard'),
      api.get('/looms', { params: { page: 1, per_page: 1 } }).catch(() => ({ data: {} })),
    ])
      .then(([dashRes, loomsRes]) => {
        setData(dashRes.data);
        const meta = normalizePaginatedResponse(loomsRes.data || {});
        setTotalLooms(meta.total || 0);
      })
      .catch(() => {
        setData(null);
        setTotalLooms(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useRefreshOnSameMenuClick(fetchAll);

  const firstName = useMemo(() => {
    const n = user?.name?.trim();
    if (!n) return 'Admin';
    return n.split(/\s+/)[0];
  }, [user?.name]);

  const { runningPct, failurePct } = useMemo(
    () => computeDonutPercents(data?.active_looms, totalLooms),
    [data?.active_looms, totalLooms]
  );

  const weekMeters = useMemo(
    () => (data?.daily_production || []).reduce((s, d) => s + (Number(d.meters) || 0), 0),
    [data?.daily_production]
  );
  /** Heuristic display hours from 7d production (no API change); fallback matches design spec. */
  const runTimeHours = weekMeters > 0 ? Math.max(1, Math.round(weekMeters / 12)) : 140;

  const active = data?.active_looms ?? 0;
  const total = totalLooms > 0 ? totalLooms : Math.max(active, 10);
  const loomsDisplay = `${active} / ${total}`;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 lg:space-y-10 pb-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-1"
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Welcome {firstName},
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          Here&apos;s what&apos;s happening with your weaving operations today.
        </p>
      </motion.header>

      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={Factory}
            title="Number of Looms Running Live"
            value={loomsDisplay}
            trend="+89% this week"
            trendDirection="up"
            delay={0}
          />
          <StatCard
            icon={Clock}
            title="Total Looms Run Time"
            value={`${runTimeHours} Hrs`}
            delay={0.06}
          />
          <StatCard
            icon={ClipboardList}
            title="Number of Total Orders"
            value={String(data?.running_orders ?? 0)}
            delay={0.12}
          />
        </div>
      </section>

      <section aria-label="Charts" className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <ProfitExpenseBarCard />
        <LoomDonutCard runningPct={runningPct} failurePct={failurePct} />
      </section>
    </div>
  );
}
