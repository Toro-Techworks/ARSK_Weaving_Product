/**
 * Diff engine for Excel-like grids: baseline (last saved) vs current (edited) rows.
 * Scales as O(n) via Maps; suitable for 1000+ rows when payloads stay proportional to changes only.
 *
 * Conventions:
 * - `id`: number (server) or string starting with `temp_` / negative number for unsaved rows
 * - `baseline`: immutable snapshot from last successful fetch/save (deep clone when storing)
 */

const TEMP_ID_PREFIX = 'temp_';

/** True if row is treated as not yet persisted. */
export function isTempId(id) {
  if (id == null || id === '') return true;
  if (typeof id === 'string') return id.startsWith(TEMP_ID_PREFIX);
  if (typeof id === 'number') return id < 0;
  return false;
}

export function makeTempId() {
  return `${TEMP_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Shallow stable stringify for equality (order keys for consistency).
 * For nested objects, replace with a deep-equal lib or JSON.stringify with sorted keys.
 */
export function stableSerialize(obj, keys) {
  const o = {};
  for (const k of keys) {
    const v = obj[k];
    o[k] = v === '' ? null : v;
  }
  return JSON.stringify(o);
}

/**
 * Pick only fields that differ from baseline (for PATCH bodies). Omits id and meta.
 */
export function changedFields(current, baseline, dataKeys) {
  const out = {};
  let any = false;
  for (const k of dataKeys) {
    const a = baseline[k] === '' ? null : baseline[k];
    const b = current[k] === '' ? null : current[k];
    if (a !== b && String(a) !== String(b)) {
      out[k] = current[k] === '' ? null : current[k];
      any = true;
    }
  }
  return any ? out : null;
}

/**
 * @param {Array<Record<string, unknown>>} currentRows - grid state now
 * @param {Array<Record<string, unknown>>} baselineRows - last saved snapshot (same shape + id)
 * @param {string[]} dataKeys - columns to compare (exclude id, _version, etc.)
 * @returns {{ creates: object[], updates: { id: number|string, patch: object, version?: number }[], deleteIds: (number|string)[] }}
 */
export function diffGridRows(currentRows, baselineRows, dataKeys) {
  const baselineById = new Map();
  for (const r of baselineRows) {
    if (r.id != null && !isTempId(r.id)) baselineById.set(r.id, r);
  }

  const seenPersistedIds = new Set();
  const creates = [];
  const updates = [];

  for (const row of currentRows) {
    if (isTempId(row.id)) {
      const payload = {};
      for (const k of dataKeys) payload[k] = row[k] === '' ? null : row[k];
      creates.push(payload);
      continue;
    }

    const id = row.id;
    seenPersistedIds.add(id);
    const base = baselineById.get(id);

    if (!base) {
      // Row has server-looking id but not in baseline — treat as create without id or flag error
      const payload = {};
      for (const k of dataKeys) payload[k] = row[k] === '' ? null : row[k];
      creates.push(payload);
      continue;
    }

    const patch = changedFields(row, base, dataKeys);
    if (patch) {
      const u = { id, patch };
      if (row._version != null) u.version = row._version;
      updates.push(u);
    }
  }

  const deleteIds = [];
  for (const b of baselineRows) {
    if (b.id != null && !isTempId(b.id) && !seenPersistedIds.has(b.id)) {
      deleteIds.push(b.id);
    }
  }

  return { creates, updates, deleteIds };
}

/**
 * True if there is anything to send (ignores whitespace-only noise if you normalize first).
 */
export function hasDiff(result) {
  return (
    result.creates.length > 0 ||
    result.updates.length > 0 ||
    result.deleteIds.length > 0
  );
}
