/**
 * Single-call dashboard aggregation: only SUM/COUNT/GROUP BY — safe for large tables when indexed.
 * Aligns with Laravel schema: looms, loom_entries, yarn_orders, payments, expenses.
 */

const METERS_PER_RUNTIME_HOUR = 18;
const CACHE_MS = Number(process.env.DASHBOARD_CACHE_MS ?? 45000);

let memoryCache = { at: 0, payload: null };

function todayRange() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toYmd(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function columnExists(pool, table, col) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, col]
  );
  return Number(rows[0]?.c) > 0;
}

export async function buildDashboardPayload(pool) {
  const today = todayRange();
  const todayStr = toYmd(today);
  const weekStart = addDays(today, -6);
  const weekEnd = today;
  const prevWeekStart = addDays(today, -13);
  const prevWeekEnd = addDays(today, -7);

  const [loomRes, orderRes, weekRes, lastWeekRes, todayRes, paymentStatusCol] = await Promise.all([
    pool.query(
      `SELECT
         SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_looms,
         COUNT(*) AS total_looms
       FROM looms`
    ),
    pool.query(`SELECT COUNT(*) AS total_orders FROM yarn_orders`),
    pool.query(
      `SELECT COALESCE(SUM(net_production), 0) AS m FROM loom_entries
       WHERE date >= :ws AND date <= :we`,
      { ws: toYmd(weekStart), we: toYmd(weekEnd) }
    ),
    pool.query(
      `SELECT COALESCE(SUM(net_production), 0) AS m FROM loom_entries
       WHERE date >= :ws AND date <= :we`,
      { ws: toYmd(prevWeekStart), we: toYmd(prevWeekEnd) }
    ),
    pool.query(`SELECT COALESCE(SUM(net_production), 0) AS m FROM loom_entries WHERE date = :d`, {
      d: todayStr,
    }),
    columnExists(pool, 'payments', 'status'),
  ]);

  const loomAgg = loomRes[0][0];
  const orderAgg = orderRes[0][0];
  const weekNet = weekRes[0][0];
  const lastWeekNet = lastWeekRes[0][0];
  const todayProd = todayRes[0][0];

  const estimatedRuntimeHours = Math.round(Number(weekNet?.m || 0) / METERS_PER_RUNTIME_HOUR);
  const thisW = Number(weekNet?.m || 0);
  const lastW = Number(lastWeekNet?.m || 0);
  let trendPercent = 0;
  let trendDirection = 'neutral';
  if (lastW > 0) {
    trendPercent = Math.round(((thisW - lastW) / lastW) * 100);
    trendDirection = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral';
  } else if (thisW > 0) {
    trendPercent = 100;
    trendDirection = 'up';
  }

  let pendingSql = 'SELECT COALESCE(SUM(amount), 0) AS s FROM payments';
  const pendingParams = [];
  if (paymentStatusCol) {
    pendingSql += ' WHERE status IN (?, ?)';
    pendingParams.push('open', 'running');
  }
  const [[pendingRow]] = await pool.query(pendingSql, pendingParams);

  const profitExpenseMonth = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    const ms = toYmd(m);
    const me = toYmd(end);
    const [pRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE payment_date >= ? AND payment_date <= ?`,
      [ms, me]
    );
    const [eRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM expenses WHERE date >= ? AND date <= ?`,
      [ms, me]
    );
    profitExpenseMonth.push({
      name: m.toLocaleString('en', { month: 'short' }),
      profit: Math.round(Number(pRows[0]?.s || 0) * 100) / 100,
      expenses: Math.round(Number(eRows[0]?.s || 0) * 100) / 100,
    });
  }

  const profitExpenseWeek = [];
  for (let i = 6; i >= 0; i--) {
    const day = addDays(today, -i);
    const ds = toYmd(day);
    const [pRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE payment_date = ?`,
      [ds]
    );
    const [eRows] = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS s FROM expenses WHERE date = ?`, [ds]);
    profitExpenseWeek.push({
      name: day.toLocaleString('en', { weekday: 'short' }),
      profit: Math.round(Number(pRows[0]?.s || 0) * 100) / 100,
      expenses: Math.round(Number(eRows[0]?.s || 0) * 100) / 100,
    });
  }

  const buildDonut = async (days) => {
    const from = addDays(today, -(days - 1));
    const fromStr = toYmd(from);
    const active = Number(loomAgg?.active_looms || 0);
    const total = Number(loomAgg?.total_looms || 0);
    const [aggRows] = await pool.query(
      `SELECT
         COALESCE(SUM(meters_produced), 0) AS produced,
         COALESCE(SUM(rejected_meters), 0) AS rejected
       FROM loom_entries WHERE date >= ?`,
      [fromStr]
    );
    const agg = aggRows[0];
    const produced = Number(agg?.produced || 0);
    const rejected = Number(agg?.rejected || 0);
    let failurePct = produced > 0 ? Math.min(40, Math.round((rejected / produced) * 1000) / 10) : 0;
    if (total <= 0) {
      return { running_pct: 0, stopped_pct: 0, failure_pct: failurePct };
    }
    const remaining = Math.max(0, 100 - failurePct);
    const runningPct = Math.round(((active / total) * remaining) * 10) / 10;
    const stoppedPct = Math.round((remaining - runningPct) * 10) / 10;
    return { running_pct: runningPct, stopped_pct: stoppedPct, failure_pct: failurePct };
  };

  const [donutMonth, donutWeek] = await Promise.all([buildDonut(30), buildDonut(7)]);

  return {
    kpis: {
      active_looms: Number(loomAgg?.active_looms || 0),
      total_looms: Number(loomAgg?.total_looms || 0),
      estimated_runtime_hours: estimatedRuntimeHours,
      total_orders: Number(orderAgg?.total_orders || 0),
      production_trend_percent: trendPercent,
      production_trend_direction: trendDirection,
      today_production: Math.round(Number(todayProd?.m || 0) * 100) / 100,
      pending_payments: Math.round(Number(pendingRow?.s || 0) * 100) / 100,
    },
    charts: {
      profit_expense_month: profitExpenseMonth,
      profit_expense_week: profitExpenseWeek,
      loom_distribution: {
        month: donutMonth,
        week: donutWeek,
      },
    },
    daily_production: [],
    meta: {
      generated_at: new Date().toISOString(),
      cached: false,
    },
  };
}

export async function getCachedDashboard(pool) {
  const now = Date.now();
  if (CACHE_MS > 0 && memoryCache.payload && now - memoryCache.at < CACHE_MS) {
    return {
      ...memoryCache.payload,
      meta: { ...memoryCache.payload.meta, cached: true },
    };
  }
  const payload = await buildDashboardPayload(pool);
  if (CACHE_MS > 0) {
    memoryCache = { at: now, payload };
  }
  return payload;
}
