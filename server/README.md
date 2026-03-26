# Express dashboard API (optional)

Serves **`GET /api/dashboard`** with the same JSON shape as Laravel’s `DashboardController` (`kpis`, `charts`, `meta`).

## Setup

```bash
cd server
cp .env.example .env
# edit MYSQL_* to match your DB
npm install
npm run dev
```

## Performance (10k+ rows)

- Uses **aggregates only** (`SUM`, `COUNT`, date ranges) — no full table loads into Node.
- Recommended MySQL indexes:
  - `loom_entries (date)`
  - `payments (payment_date)`
  - `expenses (date)`

## Caching

- **In-memory** TTL: `DASHBOARD_CACHE_MS` (default 45000).
- **Redis**: plug in `ioredis` in `getCachedDashboard` if you need a shared cache across instances.

## Frontend

Point Vite at this service **or** keep using Laravel (already returns the same payload).

```env
# .env in frontend — use Express for dashboard only (optional pattern)
VITE_DASHBOARD_POLL_MS=60000
```

Proxy example (`vite.config.js`):

```js
proxy: {
  '/api/dashboard': { target: 'http://localhost:3001', changeOrigin: true },
  '/api': { target: 'http://localhost:8000', changeOrigin: true },
}
```

Place the **more specific** `/api/dashboard` rule **before** `/api`.
