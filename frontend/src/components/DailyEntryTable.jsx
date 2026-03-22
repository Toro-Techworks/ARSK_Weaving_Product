import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Button from './Button';
import { fetchAllPaginated } from '../utils/pagination';
import { EditableCell } from './EditableCell';

const SHIFTS = [{ value: 'Day', label: 'Day' }, { value: 'Night', label: 'Night' }];

/** Sort rows by date asc, then Day before Night */
function sortRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.shift === 'Day' ? 0 : 1) - (b.shift === 'Day' ? 0 : 1);
  });
}

/** Compute running total per loom up to row index */
function getTotalForRow(sortedRows, rowIndex, loomId) {
  let total = 0;
  for (let i = 0; i <= rowIndex; i++) {
    const v = sortedRows[i].looms[loomId]?.shiftMeter;
    const n = typeof v === 'number' && !Number.isNaN(v) ? v : 0;
    total += n;
  }
  return total;
}

export function DailyEntryTable({ canEdit = true }) {
  const [looms, setLooms] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(new Set()); // 'rowId-loomId' for highlight
  const nextRowId = useRef(0);
  const tableWrapRef = useRef(null);

  const sortedRows = sortRows(rows);

  const loadData = useCallback(() => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    Promise.all([
      api.get('/looms-list').then((r) => r.data?.data || []),
      fetchAllPaginated(api, '/loom-entries', { perPage: 100, date_from: fiveDaysAgo, date_to: today }),
    ])
      .then(([loomList, entries]) => {
        setLooms(loomList);
        const grouped = {};
        entries.forEach((e) => {
          const date = e.date?.slice?.(0, 10) ?? e.date;
          const weaver = e.operator_name || 'Weaver1';
          const shift = e.shift || 'Day';
          const key = `${date}|${weaver}|${shift}`;
          if (!grouped[key]) {
            grouped[key] = { rowId: nextRowId.current++, date, weaver, weaver2: '', shift, looms: {} };
          }
          const shiftMeter = e.meters_produced != null ? Number(e.meters_produced) : '';
          grouped[key].looms[e.loom_id] = { shiftMeter, entryId: e.id };
        });
        const rowList = Object.values(grouped);
        if (rowList.length === 0) {
          for (let d = 4; d >= 0; d--) {
            const dte = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            rowList.push({ rowId: nextRowId.current++, date: dte, weaver: '', weaver2: '', shift: 'Day', looms: {} });
          }
        }
        setRows(rowList);
        setDirty(new Set());
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => loadData(), [loadData]);
  if (canEdit) {
    try {
      const { useRefreshOnSameMenuClick } = require('../hooks/useRefreshOnSameMenuClick');
      useRefreshOnSameMenuClick(loadData);
    } catch (_) {}
  }

  const addRow = () => {
    const today = new Date().toISOString().slice(0, 10);
    setRows((prev) => [...prev, { rowId: nextRowId.current++, date: today, weaver: '', weaver2: '', shift: 'Day', looms: {} }]);
  };

  const updateRow = useCallback((rowId, field, value) => {
    setRows((prev) => prev.map((r) => (r.rowId !== rowId ? r : { ...r, [field]: value })));
  }, []);

  const updateLoomCell = useCallback((rowId, loomId, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        const num = value === '' ? '' : (parseFloat(value) >= 0 ? parseFloat(value) : row.looms[loomId]?.shiftMeter ?? '');
        const loomsNext = { ...row.looms, [loomId]: { ...(row.looms[loomId] || {}), shiftMeter: num } };
        return { ...row, looms: loomsNext };
      })
    );
    setDirty((prev) => new Set(prev).add(`${rowId}-${loomId}`));
  }, []);

  const deleteRow = useCallback(async (rowId) => {
    const row = rows.find((r) => r.rowId === rowId);
    if (!row) return;
    if (!window.confirm('Delete this row?')) return;

    const entryIds = Object.values(row.looms || {})
      .map((c) => c?.entryId)
      .filter(Boolean);

    try {
      if (entryIds.length) {
        await Promise.all(entryIds.map((id) => api.delete(`/loom-entries/${id}`)));
      }
      setRows((prev) => prev.filter((r) => r.rowId !== rowId));
      setDirty((prev) => {
        const next = new Set(prev);
        [...next].forEach((k) => {
          if (String(k).startsWith(`${rowId}-`)) next.delete(k);
        });
        return next;
      });
      toast.success('Row deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete row');
    }
  }, [rows]);

  const saveAll = useCallback(async () => {
    setSaving(true);
    const promises = [];
    sortedRows.forEach((row, rowIndex) => {
      looms.forEach((loom) => {
        const cell = row.looms[loom.id];
        const shiftMeter = cell?.shiftMeter;
        const num = typeof shiftMeter === 'number' && !Number.isNaN(shiftMeter) ? shiftMeter : (shiftMeter === '' ? null : parseFloat(shiftMeter));
        if (num == null || Number.isNaN(num)) return;
        const payload = {
          loom_id: loom.id,
          date: row.date,
          shift: row.shift,
          operator_name: row.weaver,
          meters_produced: num,
          rejected_meters: 0,
        };
        if (cell?.entryId) {
          promises.push(api.put(`/loom-entries/${cell.entryId}`, payload));
        } else {
          promises.push(api.post('/loom-entries', payload));
        }
      });
    });
    try {
      await Promise.all(promises);
      toast.success('Saved');
      setDirty(new Set());
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [sortedRows, looms, loadData]);

  const focusNextCell = useCallback(() => {
    const inputs = Array.from(tableWrapRef.current?.querySelectorAll('input, select') || []);
    const i = inputs.indexOf(document.activeElement);
    if (i >= 0 && i < inputs.length - 1) inputs[i + 1].focus();
    else if (i === inputs.length - 1) inputs[0]?.focus();
  }, []);

  const focusNextRow = useCallback(() => {
    const active = document.activeElement;
    if (!active || !tableWrapRef.current) return;
    const row = parseInt(active.getAttribute('data-row'), 10);
    if (Number.isNaN(row)) return;
    const inputs = Array.from(tableWrapRef.current.querySelectorAll('input, select'));
    const nextRowInputs = inputs.filter((inp) => parseInt(inp.getAttribute('data-row'), 10) === row + 1);
    if (nextRowInputs.length) nextRowInputs[0].focus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  const handleTableKeyDown = (e) => {
    if (e.key === 'Tab') { e.preventDefault(); focusNextCell(); }
    else if (e.key === 'Enter') { e.preventDefault(); focusNextRow(); }
  };

  return (
    <div className="space-y-3" ref={tableWrapRef}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Entry</h2>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button variant="secondary" onClick={addRow} className="gap-1.5">
                <Plus className="w-4 h-4" /> Add Row
              </Button>
              <Button onClick={saveAll} disabled={saving} className="gap-1.5">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-h-[calc(100vh-12rem)] flex flex-col">
        <div className="overflow-auto min-h-0 flex-1">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Date</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Weaver1</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Weaver2</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Shift</th>
                {looms.map((loom) => (
                  <th key={loom.id} colSpan={2} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200 bg-gray-100">
                    {loom.loom_number || `Loom ${loom.id}`}
                  </th>
                ))}
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <th className="px-2 py-1.5 text-xs font-medium text-gray-400 border-r border-gray-200" />
                <th className="px-2 py-1.5 text-xs font-medium text-gray-400 border-r border-gray-200" />
                <th className="px-2 py-1.5 text-xs font-medium text-gray-400 border-r border-gray-200" />
                <th className="px-2 py-1.5 text-xs font-medium text-gray-400 border-r border-gray-200" />
                {looms.map((loom) => (
                  <React.Fragment key={loom.id}>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-400 border-r border-gray-200 w-24">Shift Mtr</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-gray-400 border-r border-gray-200 w-24">Total Mtr</th>
                  </React.Fragment>
                ))}
                <th className="px-2 py-1.5 text-xs font-medium text-gray-400" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, rowIndex) => (
                <tr key={row.rowId} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="p-0 border-r border-gray-100">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.rowId, 'date', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                      disabled={!canEdit}
                      className="w-full min-w-[7rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50"
                      data-row={rowIndex}
                      data-col="date"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.weaver || ''}
                      onChange={(e) => updateRow(row.rowId, 'weaver', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                      disabled={!canEdit}
                      placeholder="Weaver name"
                      className="w-full min-w-[8rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50"
                      data-row={rowIndex}
                      data-col="weaver"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <input
                      type="text"
                      value={row.weaver2 || ''}
                      onChange={(e) => updateRow(row.rowId, 'weaver2', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                      disabled={!canEdit}
                      placeholder="Weaver2"
                      className="w-full min-w-[8rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50"
                      data-row={rowIndex}
                      data-col="weaver2"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <select
                      value={row.shift}
                      onChange={(e) => updateRow(row.rowId, 'shift', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                      disabled={!canEdit}
                      className="w-full min-w-[5rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50"
                      data-row={rowIndex}
                      data-col="shift"
                    >
                      {SHIFTS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  {looms.map((loom) => {
                    const shiftVal = row.looms[loom.id]?.shiftMeter ?? '';
                    const totalVal = getTotalForRow(sortedRows, rowIndex, loom.id);
                    const isDirty = dirty.has(`${row.rowId}-${loom.id}`);
                    return (
                      <React.Fragment key={loom.id}>
                        <EditableCell
                          value={shiftVal}
                          onChange={(v) => updateLoomCell(row.rowId, loom.id, v)}
                          onTab={focusNextCell}
                          onEnter={focusNextRow}
                          readOnly={!canEdit}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          data-row={rowIndex}
                          data-col={`shift-${loom.id}`}
                          className={`border-r border-gray-100 ${isDirty ? 'bg-amber-50' : ''}`}
                        />
                        <EditableCell
                          value={totalVal}
                          onTab={focusNextCell}
                          onEnter={focusNextRow}
                          readOnly
                          type="text"
                          data-row={rowIndex}
                          data-col={`total-${loom.id}`}
                          className="bg-gray-50/80 border-r border-gray-100"
                        />
                      </React.Fragment>
                    );
                  })}
                  <td className="px-2 py-1.5 text-sm whitespace-nowrap">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => deleteRow(row.rowId)}
                        className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:underline"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DailyEntryTable;
