import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool from './db.js';
import { buildDashboardPayload, getCachedDashboard } from './services/dashboardService.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/dashboard
 * Query: ?refresh=1 bypasses in-memory cache (Express cache only; add Redis later if needed)
 */
app.get('/api/dashboard', async (req, res) => {
  try {
    const skipCache = req.query.refresh === '1' || req.query.refresh === 'true';
    let payload;
    if (skipCache) {
      payload = await buildDashboardPayload(pool);
      payload.meta = { ...payload.meta, cached: false };
    } else {
      payload = await getCachedDashboard(pool);
    }
    res.json(payload);
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({
      error: 'DASHBOARD_AGGREGATION_FAILED',
      message: err.message || 'Failed to load dashboard',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard API listening on http://localhost:${PORT}/api/dashboard`);
});
