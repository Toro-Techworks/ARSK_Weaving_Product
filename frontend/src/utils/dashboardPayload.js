/**
 * Normalizes dashboard API responses to a single canonical shape for charts/cards.
 * Supports:
 * - Canonical v2: { kpis, charts, meta?, daily_production? }
 * - Legacy Laravel flat: { active_looms, running_orders, daily_production, ... }
 */

const EMPTY_MONTH = () =>
  Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { name: d.toLocaleString('en', { month: 'short' }), profit: 0, expenses: 0 };
  });

const EMPTY_WEEK = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ name: days[d.getDay()], profit: 0, expenses: 0 });
  }
  return out;
};

const EMPTY_DIST = { running_pct: 0, stopped_pct: 0, failure_pct: 0 };

export function normalizeDashboardPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      kpis: {
        active_looms: 0,
        total_looms: 0,
        estimated_runtime_hours: 0,
        total_orders: 0,
        production_trend_percent: 0,
        production_trend_direction: 'neutral',
      },
      charts: {
        profit_expense_month: EMPTY_MONTH(),
        profit_expense_week: EMPTY_WEEK(),
        loom_distribution: { month: { ...EMPTY_DIST }, week: { ...EMPTY_DIST } },
      },
      daily_production: [],
      meta: {},
    };
  }

  if (raw.kpis && raw.charts) {
    return {
      kpis: {
        active_looms: Number(raw.kpis.active_looms) || 0,
        total_looms: Number(raw.kpis.total_looms) || 0,
        estimated_runtime_hours: Number(raw.kpis.estimated_runtime_hours) || 0,
        total_orders: Number(raw.kpis.total_orders) || 0,
        production_trend_percent: Number(raw.kpis.production_trend_percent) || 0,
        production_trend_direction: raw.kpis.production_trend_direction || 'neutral',
      },
      charts: {
        profit_expense_month: Array.isArray(raw.charts.profit_expense_month)
          ? raw.charts.profit_expense_month
          : EMPTY_MONTH(),
        profit_expense_week: Array.isArray(raw.charts.profit_expense_week)
          ? raw.charts.profit_expense_week
          : EMPTY_WEEK(),
        loom_distribution: {
          month: { ...EMPTY_DIST, ...raw.charts.loom_distribution?.month },
          week: { ...EMPTY_DIST, ...raw.charts.loom_distribution?.week },
        },
      },
      daily_production: Array.isArray(raw.daily_production) ? raw.daily_production : [],
      meta: raw.meta && typeof raw.meta === 'object' ? raw.meta : {},
    };
  }

  const weekMeters = (raw.daily_production || []).reduce((s, d) => s + (Number(d.meters) || 0), 0);
  const estimatedHours =
    raw.estimated_runtime_hours != null
      ? Number(raw.estimated_runtime_hours)
      : Math.round(weekMeters / 18);

  const totalLooms = Number(raw.total_looms) || 0;
  const active = Number(raw.active_looms) || 0;
  const failurePct = 5;
  const remaining = 100 - failurePct;
  const runningPct = totalLooms > 0 ? (active / totalLooms) * remaining : 0;
  const stoppedPct = totalLooms > 0 ? remaining - runningPct : 0;

  return {
    kpis: {
      active_looms: active,
      total_looms: totalLooms,
      estimated_runtime_hours: estimatedHours,
      total_orders: Number(raw.total_orders ?? raw.running_orders) || 0,
      production_trend_percent: Number(raw.production_trend_percent) || 0,
      production_trend_direction: raw.production_trend_direction || 'neutral',
    },
    charts: {
      profit_expense_month: Array.isArray(raw.chart_profit_expense_month)
        ? raw.chart_profit_expense_month
        : EMPTY_MONTH(),
      profit_expense_week: Array.isArray(raw.chart_profit_expense_week)
        ? raw.chart_profit_expense_week
        : EMPTY_WEEK(),
      loom_distribution: {
        month: raw.loom_donut?.month
          ? { ...EMPTY_DIST, ...raw.loom_donut.month }
          : { running_pct: runningPct, stopped_pct: stoppedPct, failure_pct: failurePct },
        week: raw.loom_donut?.week
          ? { ...EMPTY_DIST, ...raw.loom_donut.week }
          : { running_pct: runningPct, stopped_pct: stoppedPct, failure_pct: failurePct },
      },
    },
    daily_production: Array.isArray(raw.daily_production) ? raw.daily_production : [],
    meta: {},
  };
}

export function trendLabel(kpis) {
  const p = kpis?.production_trend_percent ?? 0;
  const d = kpis?.production_trend_direction ?? 'neutral';
  if (d === 'neutral' && p === 0) return null;
  const sign = p > 0 ? '+' : '';
  return `${sign}${p}% vs last week`;
}

export function trendDirectionFromKpis(kpis) {
  const d = kpis?.production_trend_direction;
  if (d === 'down') return 'down';
  if (d === 'neutral') return 'neutral';
  return 'up';
}
