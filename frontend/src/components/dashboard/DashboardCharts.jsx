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

const MONTH_DATA = [
  { name: 'Jan', profit: 4200, expenses: 2400 },
  { name: 'Feb', profit: 3800, expenses: 2100 },
  { name: 'Mar', profit: 5100, expenses: 2600 },
  { name: 'Apr', profit: 4700, expenses: 2300 },
  { name: 'May', profit: 6200, expenses: 2800 },
  { name: 'Jun', profit: 5800, expenses: 2500 },
];

const WEEK_DATA = [
  { name: 'Mon', profit: 820, expenses: 410 },
  { name: 'Tue', profit: 910, expenses: 380 },
  { name: 'Wed', profit: 760, expenses: 520 },
  { name: 'Thu', profit: 1050, expenses: 440 },
  { name: 'Fri', profit: 980, expenses: 490 },
  { name: 'Sat', profit: 640, expenses: 320 },
  { name: 'Sun', profit: 520, expenses: 280 },
];

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

export function ProfitExpenseBarCard() {
  const [period, setPeriod] = useState('month');
  const data = period === 'month' ? MONTH_DATA : WEEK_DATA;

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

export function LoomDonutCard({ runningPct, failurePct }) {
  const [period, setPeriod] = useState('month');

  const { r, s, f } = useMemo(() => {
    const bump = period === 'week' ? 4 : 0;
    const fail = Math.min(12, Math.max(3, failurePct));
    const run = Math.min(92, Math.max(0, runningPct + bump * 0.15));
    const st = Math.max(0, 100 - run - fail);
    return { r: run, s: st, f: fail };
  }, [period, runningPct, failurePct]);

  const pieData = useMemo(
    () => [
      { name: 'Loom running', value: Math.round(r * 10) / 10 },
      { name: 'Loom stopped', value: Math.round(s * 10) / 10 },
      { name: 'Failure', value: Math.round(f * 10) / 10 },
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
        <p className="text-xs text-slate-500 mb-2 sm:hidden">
          {period === 'month' ? 'Monthly view' : 'Weekly view'} (illustrative split)
        </p>
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
