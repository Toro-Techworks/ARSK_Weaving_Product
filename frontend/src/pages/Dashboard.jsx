import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Factory, Clock, ClipboardList, RefreshCw } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import {
  normalizeDashboardPayload,
  trendLabel,
  trendDirectionFromKpis,
} from '../utils/dashboardPayload';
import { StatCard } from '../components/dashboard/StatCard';
import { ProfitExpenseBarCard, LoomDonutCard } from '../components/dashboard/DashboardCharts';
import Button from '../components/Button';

const POLL_MS = Number(import.meta.env.VITE_DASHBOARD_POLL_MS || 0);

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

export default function Dashboard() {
  const { user } = useAuth();
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const fetchDashboard = useCallback(async (opts = {}) => {
    const { silent, refresh } = opts;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const params = {};
      if (refresh) params.refresh = 1;
      const { data: raw } = await api.get('/dashboard', { params });
      if (!mounted.current) return;
      setModel(normalizeDashboardPayload(raw));
    } catch (e) {
      if (!mounted.current) return;
      setError(e.response?.data?.message || e.message || 'Failed to load dashboard');
      if (!silent) setModel(null);
    } finally {
      if (mounted.current) {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchDashboard();
    return () => {
      mounted.current = false;
    };
  }, [fetchDashboard]);

  useRefreshOnSameMenuClick(() => fetchDashboard({ refresh: true }));

  useEffect(() => {
    if (!POLL_MS || POLL_MS < 5000) return undefined;
    const id = setInterval(() => {
      fetchDashboard({ silent: true });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [fetchDashboard]);

  const firstName = useMemo(() => {
    const n = user?.name?.trim();
    if (!n) return 'Admin';
    return n.split(/\s+/)[0];
  }, [user?.name]);

  const kpis = model?.kpis;
  const charts = model?.charts;

  const loomsDisplay = useMemo(() => {
    const active = kpis?.active_looms ?? 0;
    const total = kpis?.total_looms ?? 0;
    if (total > 0) return `${active} / ${total}`;
    return `${active} / 0`;
  }, [kpis]);

  const runTimeHours = kpis?.estimated_runtime_hours ?? 0;
  const trend = kpis ? trendLabel(kpis) : null;
  const trendDir = kpis ? trendDirectionFromKpis(kpis) : 'neutral';

  if (loading && !model) {
    return <DashboardSkeleton />;
  }

  if (error && !model) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 p-6 text-center space-y-4 max-w-lg mx-auto">
        <p className="text-red-800 font-medium">{error}</p>
        <Button type="button" onClick={() => fetchDashboard({ refresh: true })} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 lg:space-y-10 pb-8">
      {error && model && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>Could not refresh: {error}</span>
          <button
            type="button"
            className="font-medium text-amber-800 underline"
            onClick={() => fetchDashboard({ refresh: true })}
          >
            Retry
          </button>
        </div>
      )}

      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome {firstName},
          </h1>
          <p className="text-sm sm:text-base text-slate-500">
            Here&apos;s what&apos;s happening with your weaving operations today.
          </p>
          {model?.meta?.generated_at && (
            <p className="text-xs text-slate-400">
              Updated {new Date(model.meta.generated_at).toLocaleString()}
              {model.meta.cached ? ' · cached' : ''}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="gap-2 shrink-0"
          onClick={() => fetchDashboard({ refresh: true })}
          disabled={loading || refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.header>

      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={Factory}
            title="Number of Looms Running Live"
            value={loomsDisplay}
            trend={trend}
            trendDirection={trendDir}
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
            value={String(kpis?.total_orders ?? 0)}
            delay={0.12}
          />
        </div>
      </section>

      <section aria-label="Charts" className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <ProfitExpenseBarCard
          monthData={charts?.profit_expense_month}
          weekData={charts?.profit_expense_week}
        />
        <LoomDonutCard distribution={charts?.loom_distribution} />
      </section>
    </div>
  );
}
