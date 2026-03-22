import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Button from './Button';
import { TablePagination } from './TablePagination';
import { formatOrderId } from '../utils/formatOrderId';
import { normalizePaginatedResponse, fetchAllPaginated } from '../utils/pagination';

function orderLabel(o) {
  if (!o) return '';
  return formatOrderId(o) || String(o.id);
}

export function LoomGridTable({ canEdit = true }) {
  const [rows, setRows] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(new Set()); // rowId-field
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loomMeta, setLoomMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const wrapRef = useRef(null);
  const nextRowId = useRef(0);
  const ordersCacheRef = useRef(null);

  const loadData = useCallback(() => {
    setLoading(true);
    const ordersPromise = ordersCacheRef.current
      ? Promise.resolve(ordersCacheRef.current)
      : fetchAllPaginated(api, '/yarn-orders', { perPage: 200 }).then((all) => {
          ordersCacheRef.current = all;
          return all;
        });

    Promise.all([
      ordersPromise,
      api.get('/looms', { params: { page, per_page: perPage } }).then((r) => normalizePaginatedResponse(r.data)),
    ])
      .then(([orderList, loomPage]) => {
        setOrders(orderList);
        setLoomMeta({
          current_page: loomPage.current_page,
          last_page: loomPage.last_page,
          per_page: loomPage.per_page,
          total: loomPage.total,
        });
        const normalized = (loomPage.data || []).map((l) => ({
          rowId: nextRowId.current++,
          id: l.id,
          loom_number: l.loom_number ?? '',
          location: l.location ?? '',
          status: l.status ?? 'Active',
          yarn_order_id: null,
          _origOrderId: null,
        }));
        normalized.forEach((r) => {
          const o = orderList.find((oo) => oo.loom_id === r.id);
          r.yarn_order_id = o ? o.id : null;
          r._origOrderId = r.yarn_order_id;
        });
        setRows(normalized);
        setDirty(new Set());
      })
      .catch(() => toast.error('Failed to load looms/orders'))
      .finally(() => setLoading(false));
  }, [page, perPage]);

  useEffect(() => loadData(), [loadData]);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        rowId: nextRowId.current++,
        id: null,
        loom_number: '',
        location: '',
        status: 'Active',
        yarn_order_id: null,
        _origOrderId: null,
      },
    ]);
  };

  const updateCell = (rowId, field, value) => {
    setRows((prev) => prev.map((r) => (r.rowId !== rowId ? r : { ...r, [field]: value })));
    setDirty((prev) => new Set(prev).add(`${rowId}-${field}`));
  };

  const deleteRow = async (rowId) => {
    const row = rows.find((r) => r.rowId === rowId);
    if (!row) return;
    if (!window.confirm('Delete this loom?')) return;
    if (!row.id) {
      setRows((prev) => prev.filter((r) => r.rowId !== rowId));
      return;
    }
    try {
      await api.delete(`/looms/${row.id}`);
      toast.success('Deleted');
      setRows((prev) => prev.filter((r) => r.rowId !== rowId));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // 1) Upsert looms
      const createdMap = new Map(); // rowId -> new loom id
      for (const r of rows) {
        const payload = {
          loom_number: String(r.loom_number || '').trim(),
          location: String(r.location || '').trim() || null,
          status: r.status || 'Active',
        };
        if (!payload.loom_number) continue;
        if (r.id) {
          await api.put(`/looms/${r.id}`, payload);
        } else {
          const res = await api.post('/looms', payload);
          const id = res.data?.data?.id ?? res.data?.id;
          if (id) createdMap.set(r.rowId, id);
        }
      }

      // 2) Apply created IDs to local rows
      let nextRows = rows.map((r) => {
        const newId = createdMap.get(r.rowId);
        return newId ? { ...r, id: newId } : r;
      });

      // 3) Update yarn order assignments (keep 1 order per loom in UI)
      // If order changed: unassign previous order, assign new order.
      for (const r of nextRows) {
        const loomId = r.id;
        if (!loomId) continue;
        const prevOrderId = r._origOrderId;
        const nextOrderId = r.yarn_order_id || null;
        if (prevOrderId === nextOrderId) continue;
        if (prevOrderId) await api.put(`/yarn-orders/${prevOrderId}`, { loom_id: null });
        if (nextOrderId) await api.put(`/yarn-orders/${nextOrderId}`, { loom_id: loomId });
      }

      toast.success('Saved');
      setDirty(new Set());
      ordersCacheRef.current = null;
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!wrapRef.current) return;
    if (e.key !== 'Tab' && e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = Array.from(wrapRef.current.querySelectorAll('input, select'));
    const i = inputs.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'Tab') {
      inputs[i + 1]?.focus();
    } else if (e.key === 'Enter') {
      // next row: focus first cell in next row (same column if possible)
      const activeRow = parseInt(document.activeElement.getAttribute('data-row'), 10);
      const activeCol = document.activeElement.getAttribute('data-col');
      const nextTarget = wrapRef.current.querySelector(`[data-row=\"${activeRow + 1}\"][data-col=\"${activeCol}\"]`);
      (nextTarget || inputs[i + 1])?.focus();
    }
  };

  const orderOptions = useMemo(() => orders.map((o) => ({ value: o.id, label: orderLabel(o) })), [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={wrapRef}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Looms</h2>
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

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-h-[calc(100vh-12rem)] flex flex-col">
        <div className="overflow-auto min-h-0 flex-1">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Loom No.</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Location</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Status</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Order</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rowIndex) => (
                <tr key={r.rowId} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="p-0 border-r border-gray-100">
                    <input
                      value={r.loom_number}
                      onChange={(e) => updateCell(r.rowId, 'loom_number', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[7rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-loom_number`) ? 'bg-amber-50' : ''}`}
                      placeholder="Loom number"
                      data-row={rowIndex}
                      data-col="loom_number"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <input
                      value={r.location}
                      onChange={(e) => updateCell(r.rowId, 'location', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[10rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-location`) ? 'bg-amber-50' : ''}`}
                      placeholder="Location"
                      data-row={rowIndex}
                      data-col="location"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <select
                      value={r.status}
                      onChange={(e) => updateCell(r.rowId, 'status', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[7rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-status`) ? 'bg-amber-50' : ''}`}
                      data-row={rowIndex}
                      data-col="status"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <select
                      value={r.yarn_order_id ?? ''}
                      onChange={(e) => updateCell(r.rowId, 'yarn_order_id', e.target.value ? Number(e.target.value) : null)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[16rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-yarn_order_id`) ? 'bg-amber-50' : ''}`}
                      data-row={rowIndex}
                      data-col="yarn_order_id"
                    >
                      <option value="">—</option>
                      {orderOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-sm whitespace-nowrap">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => deleteRow(r.rowId)}
                        className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:underline"
                        title="Delete loom"
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
      {(loomMeta.total > 0 || page > 1) && (
        <TablePagination
          page={loomMeta.current_page}
          lastPage={loomMeta.last_page}
          total={loomMeta.total}
          perPage={loomMeta.per_page}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
          disabled={loading || saving}
        />
      )}
    </div>
  );
}

export default LoomGridTable;

