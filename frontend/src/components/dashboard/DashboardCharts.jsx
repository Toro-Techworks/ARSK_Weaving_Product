import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PURPLE = '#3c3a8f';
const PURPLE_LIGHT = '#8b87d9';
const PURPLE_MUTED = '#c4c2eb';
const ROSE = '#e11d48';

function PeriodToggle({ value, onChange }) {
  const btn = (key, label) => (
    <button
      type="button"
      onClick={() => onChange(key)}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
        value === key
          ? 'bg-white text-[#3c3a8f] shadow-sm'
          : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex rounded-lg bg-black/20 p-1 gap-0.5">
      {btn('month', 'This Month')}
      {btn('week', 'This Week')}
    </div>
  );
}

function ChartCardHeader({ title, right }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#3c3a8f] px-4 py-3 sm:px-5 sm:py-4">
      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
      {right}
    </div>
  );
}

const defaultMonth = () =>
  Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { name: d.toLocaleString('en', { month: 'short' }), profit: 0, expenses: 0 };
  });

const defaultWeek = () => {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ name: d.toLocaleString('en', { weekday: 'short' }), profit: 0, expenses: 0 });
  }
  return out;
};

/**
 * @param {{ monthData?: array, weekData?: array }} props — from API `charts.profit_expense_*`
 */
export function ProfitExpenseBarCard({ monthData, weekData }) {
  const [period, setPeriod] = useState('month');
  const data =
    period === 'month'
      ? monthData?.length
        ? monthData
        : defaultMonth()
      : weekData?.length
        ? weekData
        : defaultWeek();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="overflow-hidden rounded-xl bg-white shadow-sm shadow-slate-200/60 ring-1 ring-slate-100 hover:shadow-md transition-shadow duration-300"
    >
      <ChartCardHeader title="Profit & Expenses" right={<PeriodToggle value={period} onChange={setPeriod} />} />
      <div className="p-4 sm:p-6">
        <div className="h-[280px] w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 16 }} />
              <Bar dataKey="profit" name="Profit" fill={PURPLE} radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="expenses" name="Expenses" fill={PURPLE_MUTED} radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

const DONUT_COLORS = [PURPLE, PURPLE_LIGHT, ROSE];

const EMPTY_DIST = { running_pct: 0, stopped_pct: 0, failure_pct: 0 };

/**
 * @param {{ distribution?: { month?: object, week?: object } }} props — API `charts.loom_distribution`
 */
export function LoomDonutCard({ distribution }) {
  const [period, setPeriod] = useState('month');

  const slice = period === 'month' ? distribution?.month : distribution?.week;
  const { r, s, f } = useMemo(() => {
    const d = { ...EMPTY_DIST, ...slice };
    return {
      r: Math.round(Number(d.running_pct) * 10) / 10,
      s: Math.round(Number(d.stopped_pct) * 10) / 10,
      f: Math.round(Number(d.failure_pct) * 10) / 10,
    };
  }, [slice]);

  const pieData = useMemo(
    () => [
      { name: 'Loom running', value: r },
      { name: 'Loom stopped', value: s },
      { name: 'Failure', value: f },
    ],
    [r, s, f]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.28 }}
      className="overflow-hidden rounded-xl bg-white shadow-sm shadow-slate-200/60 ring-1 ring-slate-100 hover:shadow-md transition-shadow duration-300"
    >
      <ChartCardHeader title="Loom run %" right={<PeriodToggle value={period} onChange={setPeriod} />} />
      <div className="p-4 sm:p-6">
        <div className="h-[280px] w-full min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={96}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                strokeWidth={0}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [`${v}%`, 'Share']}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
                }}
              />
              <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-slate-600 text-sm">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

export { PeriodToggle, ChartCardHeader };
