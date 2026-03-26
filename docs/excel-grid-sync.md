# Excel-like grid: diff-based save (partial updates)

## Goals

- Send only **creates**, **updates** (changed fields only), **deletes**
- Keep **stable IDs** on every row after first save
- Scale to **1000+ rows** by keeping network payload proportional to **changes**, not table size

## Data model (SQL)

```sql
-- Example: generic line items under a parent
CREATE TABLE grid_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  -- data columns...
  col_a VARCHAR(255),
  col_b DECIMAL(12,2),
  version INT UNSIGNED NOT NULL DEFAULT 0,  -- optimistic locking
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX idx_parent (parent_id),
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
);
```

- **`version`**: increment on each update; client sends `If-Match: version` or body `expectedVersion`; if mismatch → `409 Conflict`
- **Indexes**: always index `parent_id` (scope of the grid)

## API shape (REST)

### Option A — single sync endpoint (recommended for transactions)

`POST /api/parents/:parentId/grid/sync`  
or `PATCH /api/parents/:parentId/grid`

```json
{
  "creates": [{ "col_a": "x", "col_b": 1 }],
  "updates": [
    { "id": 42, "expectedVersion": 3, "patch": { "col_a": "y" } }
  ],
  "deleteIds": [7, 8]
}
```

Response:

```json
{
  "created": [{ "id": 100, "col_a": "x", "version": 0 }],
  "updated": [{ "id": 42, "version": 4 }],
  "deleted": [7, 8],
  "conflicts": []
}
```

Run **one DB transaction**: validate parent → deletes → updates (with version check) → inserts → commit.

### Option B — separate PATCH rows

- `POST .../rows` — batch create
- `PATCH .../rows` — batch partial update
- `DELETE .../rows?ids=1,2,3`

More HTTP-pure; harder to keep atomic unless you wrap in a transaction client-side.

---

## Backend: Express + `mysql2` / Prisma (sketch)

```js
// routes/gridSync.js
import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.patch('/parents/:parentId/grid/sync', async (req, res) => {
  const parentId = Number(req.params.parentId);
  const { creates = [], updates = [], deleteIds = [] } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (deleteIds.length) {
      const [r] = await conn.query(
        'DELETE FROM grid_items WHERE parent_id = ? AND id IN (?)',
        [parentId, deleteIds]
      );
      if (r.affectedRows !== deleteIds.length) {
        throw Object.assign(new Error('Delete failed or foreign scope'), { status: 409 });
      }
    }

    const updatedOut = [];
    for (const u of updates) {
      const keys = Object.keys(u.patch);
      if (!keys.length) continue;
      const setSql = keys.map((k) => `\`${k}\` = ?`).join(', ');
      const vals = [...Object.values(u.patch), parentId, u.id, u.expectedVersion];
      const [r] = await conn.query(
        `UPDATE grid_items SET ${setSql}, version = version + 1, updated_at = NOW()
         WHERE parent_id = ? AND id = ? AND version = ?`,
        vals
      );
      if (r.affectedRows !== 1) {
        await conn.rollback();
        return res.status(409).json({ error: 'Conflict', rowId: u.id });
      }
      const [[row]] = await conn.query(
        'SELECT id, version FROM grid_items WHERE id = ?',
        [u.id]
      );
      updatedOut.push(row);
    }

    const createdOut = [];
    for (const c of creates) {
      const cols = Object.keys(c);
      const placeholders = cols.map(() => '?').join(', ');
      const [r] = await conn.query(
        `INSERT INTO grid_items (parent_id, ${cols.map((k) => `\`${k}\``).join(', ')})
         VALUES (?, ${placeholders})`,
        [parentId, ...cols.map((k) => c[k])]
      );
      createdOut.push({ id: r.insertId, ...c, version: 0 });
    }

    await conn.commit();
    res.json({ created: createdOut, updated: updatedOut, deleted: deleteIds });
  } catch (e) {
    await conn.rollback();
    res.status(e.status || 500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

export default router;
```

**Large batches:** chunk `deleteIds` / `updates` / `creates` into slices of 200–500 per transaction, or use one transaction with batched `INSERT` (`VALUES (...), (...)`).

---

## Backend: Laravel (your stack)

- Route: `POST /api/yarn-receipts/sync` with `yarn_order_id`, `creates`, `updates`, `deleteIds`
- `DB::transaction(function () { ... })`
- Update: `YarnReceipt::where(...)->where('id', $id)->where('version', $v)->update([...])` then check `affected_rows`

Add `version` column via migration if you adopt optimistic locking.

---

## Frontend (React)

1. After load or successful save, set **`baselineRows = structuredClone(rows)`** (or JSON parse/stringify for plain data).
2. On save, `const diff = diffGridRows(rows, baselineRows, DATA_KEYS)`.
3. If `!hasDiff(diff)`, show “Nothing to save” and return.
4. `POST` diff to sync endpoint; merge response IDs into rows (map `temp_` → real id); set new baseline.

Example:

```jsx
import { diffGridRows, hasDiff, makeTempId, isTempId } from '../utils/gridRowDiff';

const DATA_KEYS = ['dc_no', 'yarn', 'net_weight' /* ... */];

function useGridBaseline(initial) {
  const [rows, setRows] = useState(initial);
  const baselineRef = useRef(structuredClone(initial));

  const markSaved = (nextRows) => {
    setRows(nextRows);
    baselineRef.current = structuredClone(nextRows);
  };

  const buildDiff = () => diffGridRows(rows, baselineRef.current, DATA_KEYS);

  return { rows, setRows, markSaved, buildDiff, baselineRef };
}

async function save(parentId, buildDiff, api) {
  const diff = buildDiff();
  if (!hasDiff(diff)) {
    toast('No changes');
    return;
  }
  const { data } = await api.post(`/parents/${parentId}/grid/sync`, diff);
  // map created ids back to rows that had temp ids — order-preserving match
  // then markSaved(mergedRows)
}
```

---

## Performance (1000+ rows)

| Technique | Why |
|-----------|-----|
| Diff only | Payload size ∝ changes, not 1000 rows |
| `Map` by id | O(n) diff, no nested scans |
| DB indexes on `parent_id`, `id` | Fast scoped deletes/updates |
| Chunked sync if one giant commit is slow | e.g. 500 rows per request |
| Avoid full-table `DELETE` + reinsert | That pattern breaks IDs and triggers full rewrites |

---

## Debounce / autosave

- **Debounce** `save()` by **500–1200 ms** after last edit (use `lodash.debounce` or `useDebouncedCallback`).
- **Flush** on: `beforeunload`, route change (`useBlocker`), blur of grid container.
- **Minimum interval**: e.g. don’t autosave more than once every 10s even if typing fast.
- Show **dirty** state and **“Saving…”** / last saved time.

---

## Concurrency (multi-user)

1. **Optimistic locking**: `version` on row; update fails → refresh row from server and show “Someone else edited this row.”
2. **ETag / `updated_at`**: same idea on parent document
3. **Real-time**: WebSocket broadcast “row 42 updated”; client merges or refetches slice
4. **Last-write-wins** without version = data loss — avoid for production

---

## Testing diff logic

- Unit-test `diffGridRows`: empty baseline, all new, edit one field, delete row, temp ids → creates only.
