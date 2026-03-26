import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Button from './Button';
import { fetchAllPaginated } from '../utils/pagination';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import SearchableSelect from './ui/SearchableSelect';

const SHIFT_OPTIONS = [{ value: 'Day', label: 'Day' }, { value: 'Night', label: 'Night' }];

/** Last N days including today (oldest → newest). */
function buildDateColumns(days = 7) {
  const list = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

function formatDateHeader(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

function emptyCell() {
  return { id: null, production: '', remarks: '' };
}

function makeEntriesByDate(dateList) {
  const o = {};
  dateList.forEach((d) => { o[d] = emptyCell(); });
  return o;
}

function newRow(rowId, dateList, patch = {}) {
  return {
    rowId,
    loom_id: '',
    shift: 'Day',
    weaver1_id: '',
    weaver2_id: '',
    entriesByDate: makeEntriesByDate(dateList),
    ...patch,
  };
}

function rowKey(r) {
  return `${r.loom_id || ''}|${r.shift || ''}`;
}

export function DailyEntryTable({ canEdit = true }) {
  const dateList = useMemo(() => buildDateColumns(7), []);
  const dateFrom = dateList[0];
  const dateTo = dateList[dateList.length - 1];

  const [rows, setRows] = useState([]);
  const [looms, setLooms] = useState([]);
  const [weavers, setWeavers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const nextRowId = useRef(0);
  const wrapRef = useRef(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/looms-list').then((r) => r.data?.data || []).catch(() => []),
      fetchAllPaginated(api, '/weavers', { perPage: 200 }).catch(() => []),
      fetchAllPaginated(api, '/loom-entries', {
        perPage: 500,
        date_from: dateFrom,
        date_to: dateTo,
      }).catch(() => []),
    ])
      .then(([loomList, weaverList, entries]) => {
        setLooms(loomList);
        setWeavers(weaverList);

        const byLoomShift = new Map();
        (entries || []).forEach((e) => {
          const ds = e.date ? String(e.date).slice(0, 10) : '';
          if (!ds || !dateList.includes(ds)) return;
          const k = `${e.loom_id}|${e.shift || 'Day'}`;
          if (!byLoomShift.has(k)) {
            byLoomShift.set(k, newRow(nextRowId.current++, dateList, {
              loom_id: e.loom_id != null ? String(e.loom_id) : '',
              shift: e.shift || 'Day',
              weaver1_id: e.weaver1_id != null ? String(e.weaver1_id) : '',
              weaver2_id: e.weaver2_id != null ? String(e.weaver2_id) : '',
            }));
          }
          const row = byLoomShift.get(k);
          if (e.weaver1_id != null && !row.weaver1_id) row.weaver1_id = String(e.weaver1_id);
          if (e.weaver2_id != null && !row.weaver2_id) row.weaver2_id = String(e.weaver2_id);
          row.entriesByDate[ds] = {
            id: e.id,
            production: e.production != null ? String(e.production) : String(e.meters_produced ?? ''),
            remarks: e.remarks ?? '',
          };
        });

        const list = Array.from(byLoomShift.values());
        if (list.length === 0) {
          setRows([newRow(nextRowId.current++, dateList)]);
        } else {
          setRows(list);
        }
      })
      .catch(() => toast.error('Failed to load daily entries'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, dateList]);

  useEffect(() => loadData(), [loadData]);
  useRefreshOnSameMenuClick(loadData);

  const loomOptions = useMemo(
    () => (looms || []).map((l) => ({ value: String(l.id), label: l.loom_number || `Loom ${l.id}` })),
    [looms]
  );
  const weaverOptions = useMemo(
    () => (weavers || []).map((w) => ({ value: String(w.id), label: w.employee_code ? `${w.weaver_name} (${w.employee_code})` : w.weaver_name })),
    [weavers]
  );

  const setRowField = (rowId, field, value) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)));
  };

  const setDateCell = (rowId, dateIso, patch) => {
    setRows((prev) => prev.map((r) => {
      if (r.rowId !== rowId) return r;
      const prevCell = r.entriesByDate[dateIso] || emptyCell();
      return {
        ...r,
        entriesByDate: {
          ...r.entriesByDate,
          [dateIso]: { ...prevCell, ...patch },
        },
      };
    }));
  };

  const addRow = () => {
    setRows((prev) => [...prev, newRow(nextRowId.current++, dateList)]);
  };

  const rowTotal = (r) => {
    let sum = 0;
    dateList.forEach((d) => {
      const n = Number(r.entriesByDate[d]?.production);
      if (Number.isFinite(n)) sum += n;
    });
    return sum;
  };

  const rowsSorted = useMemo(() => {
    const loomMap = new Map(loomOptions.map((o) => [o.value, o.label]));
    return [...rows].sort((a, b) => {
      const la = loomMap.get(a.loom_id) || '';
      const lb = loomMap.get(b.loom_id) || '';
      const c = la.localeCompare(lb);
      if (c !== 0) return c;
      return (a.shift === 'Day' ? 0 : 1) - (b.shift === 'Day' ? 0 : 1);
    });
  }, [rows, loomOptions]);

  const deleteRow = async (row) => {
    if (!window.confirm('Delete this row and all production entries for the visible date range?')) return;
    const ids = [];
    dateList.forEach((d) => {
      const id = row.entriesByDate[d]?.id;
      if (id) ids.push(id);
    });
    try {
      if (ids.length) await Promise.all(ids.map((id) => api.delete(`/loom-entries/${id}`)));
      setRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
      toast.success('Row deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const validateBeforeSave = () => {
    const seen = new Set();
    for (const r of rows) {
      if (!r.loom_id || !r.shift) return 'Each row must have Loom and Shift.';
      const k = rowKey(r);
      if (seen.has(k)) return 'Duplicate row: same Loom + Shift is not allowed.';
      seen.add(k);
    }
    return null;
  };

  const saveAll = async () => {
    const v = validateBeforeSave();
    if (v) {
      toast.error(v);
      return;
    }

    setSaving(true);
    try {
      for (const r of rows) {
        const weaver1 = weavers.find((w) => String(w.id) === String(r.weaver1_id));
        for (const d of dateList) {
          const cell = r.entriesByDate[d] || emptyCell();
          const prodRaw = cell.production;
          const hasNum = prodRaw !== '' && !Number.isNaN(Number(prodRaw));
          const num = hasNum ? Number(prodRaw) : null;

          if (!r.loom_id) continue;

          if (cell.id) {
            if (num == null || num < 0) {
              await api.delete(`/loom-entries/${cell.id}`);
              continue;
            }
            await api.put(`/loom-entries/${cell.id}`, {
              date: d,
              loom_id: Number(r.loom_id),
              shift: r.shift,
              weaver1_id: r.weaver1_id ? Number(r.weaver1_id) : null,
              weaver2_id: r.weaver2_id ? Number(r.weaver2_id) : null,
              operator_name: weaver1?.weaver_name || null,
              production: num,
              meters_produced: num,
              rejected_meters: 0,
              remarks: cell.remarks || null,
            });
          } else if (hasNum && num >= 0) {
            await api.post('/loom-entries', {
              date: d,
              loom_id: Number(r.loom_id),
              shift: r.shift,
              weaver1_id: r.weaver1_id ? Number(r.weaver1_id) : null,
              weaver2_id: r.weaver2_id ? Number(r.weaver2_id) : null,
              operator_name: weaver1?.weaver_name || null,
              production: num,
              meters_produced: num,
              rejected_meters: 0,
              remarks: cell.remarks || null,
            });
          }
        }
      }
      toast.success('Daily entries saved');
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e) => {
    if (!wrapRef.current || e.key !== 'Enter') return;
    e.preventDefault();
    const nodes = Array.from(wrapRef.current.querySelectorAll('input:not([type="hidden"])'));
    const i = nodes.indexOf(document.activeElement);
    if (i >= 0) nodes[i + 1]?.focus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={wrapRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Entry</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Production by date (columns {formatDateHeader(dateFrom)} – {formatDateHeader(dateTo)})
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={addRow} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Row
            </Button>
            <Button onClick={saveAll} disabled={saving} className="gap-1.5">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto max-h-[calc(100vh-12rem)]">
          <table className="min-w-max w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200 min-w-[160px] shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]">Loom</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200 min-w-[100px] bg-gray-50">Shift</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200 min-w-[200px] bg-gray-50">Weaver 1</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200 min-w-[200px] bg-gray-50">Weaver 2</th>
                {dateList.map((d) => (
                  <th key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-600 uppercase whitespace-nowrap min-w-[100px] border-r border-gray-100 bg-gray-50">
                    {formatDateHeader(d)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[100px] bg-gray-50">Total (Mtr)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[90px] bg-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rowsSorted.map((r, idx) => {
                const total = rowTotal(r);
                return (
                  <tr key={r.rowId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-100`}>
                    <td className={`sticky left-0 z-10 p-1.5 border-r border-gray-200 min-w-[160px] shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <SearchableSelect
                        options={loomOptions}
                        value={r.loom_id}
                        onChange={(v) => setRowField(r.rowId, 'loom_id', v || '')}
                        placeholder="Loom"
                        isDisabled={!canEdit}
                        isClearable={false}
                      />
                    </td>
                    <td className="p-1.5 border-r border-gray-100 min-w-[100px]">
                      <SearchableSelect
                        options={SHIFT_OPTIONS}
                        value={r.shift}
                        onChange={(v) => setRowField(r.rowId, 'shift', v || 'Day')}
                        placeholder="Shift"
                        isDisabled={!canEdit}
                        isClearable={false}
                      />
                    </td>
                    <td className="p-1.5 border-r border-gray-100 min-w-[200px]">
                      <SearchableSelect
                        options={weaverOptions}
                        value={r.weaver1_id}
                        onChange={(v) => setRowField(r.rowId, 'weaver1_id', v || '')}
                        placeholder="Weaver 1"
                        isDisabled={!canEdit}
                      />
                    </td>
                    <td className="p-1.5 border-r border-gray-100 min-w-[200px]">
                      <SearchableSelect
                        options={weaverOptions}
                        value={r.weaver2_id}
                        onChange={(v) => setRowField(r.rowId, 'weaver2_id', v || '')}
                        placeholder="Weaver 2"
                        isDisabled={!canEdit}
                      />
                    </td>
                    {dateList.map((d) => {
                      const cell = r.entriesByDate[d] || emptyCell();
                      return (
                        <td key={d} className="p-1 align-top border-r border-gray-50 min-w-[100px]">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cell.production}
                            onChange={(e) => setDateCell(r.rowId, d, { production: e.target.value })}
                            onKeyDown={onKeyDown}
                            disabled={!canEdit}
                            className="w-full px-1.5 py-1 text-sm rounded border border-gray-200 text-right focus:ring-1 focus:ring-brand focus:border-brand disabled:bg-gray-50"
                            title={cell.remarks || undefined}
                            placeholder="0"
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-sm text-right font-medium text-gray-800 tabular-nums">{total.toFixed(2)}</td>
                    <td className="px-2 py-2">
                      {canEdit && (
                        <button type="button" onClick={() => deleteRow(r)} className="inline-flex items-center gap-1 text-red-600 hover:underline text-sm">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DailyEntryTable;
