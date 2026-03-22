import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const purpleIcon = 'bg-[#3c3a8f]/10 text-[#3c3a8f]';

/**
 * SaaS-style KPI card: icon box, title, large value, optional trend line.
 */
export function StatCard({
  icon: Icon,
  title,
  value,
  trend,
  trendDirection = 'up', // 'up' | 'down' | 'neutral'
  delay = 0,
}) {
  const TrendIcon = trendDirection === 'down' ? TrendingDown : trendDirection === 'neutral' ? Minus : TrendingUp;
  const trendColor =
    trendDirection === 'down'
      ? 'text-rose-600 bg-rose-50'
      : trendDirection === 'neutral'
        ? 'text-slate-500 bg-slate-100'
        : 'text-emerald-600 bg-emerald-50';

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group rounded-xl bg-white p-5 sm:p-6 shadow-sm shadow-slate-200/60 ring-1 ring-slate-100 hover:shadow-lg hover:shadow-slate-200/80 hover:ring-slate-200/80 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${purpleIcon} transition-transform duration-300 group-hover:scale-105`}
        >
          {Icon && <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />}
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${trendColor}`}
          >
            <TrendIcon className="h-3.5 w-3.5" aria-hidden />
            {trend}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-sm font-medium text-slate-500 leading-snug">{title}</h3>
      <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
    </motion.article>
  );
}

export default StatCard;
