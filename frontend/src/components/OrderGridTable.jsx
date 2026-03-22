import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Button from './Button';
import { TablePagination } from './TablePagination';
import { formatOrderId } from '../utils/formatOrderId';
import { normalizePaginatedResponse } from '../utils/pagination';

const EMPTY_ROW = () => ({
  rowId: 0,
  id: null,
  loom_id: '',
  order_from: '',
  customer: '',
  weaving_unit: '',
  design: '',
  po_number: '',
  po_date: '',
  delivery_date: '',
});

export function OrderGridTable({ canEdit = true }) {
  const [rows, setRows] = useState([]);
  const [looms, setLooms] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(new Set()); // rowId-field
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [orderMeta, setOrderMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });

  const wrapRef = useRef(null);
  const nextRowId = useRef(0);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/yarn-orders', { params: { page, per_page: perPage } }).then((r) => normalizePaginatedResponse(r.data)),
      api.get('/looms-list').then((r) => r.data?.data || []).catch(() => []),
      api.get('/companies-list').then((r) => r.data?.data || []).catch(() => []),
    ])
      .then(([ordersPage, loomList, companyList]) => {
        setLooms(loomList);
        setCompanies(companyList);
        setOrderMeta({
          current_page: ordersPage.current_page,
          last_page: ordersPage.last_page,
          per_page: ordersPage.per_page,
          total: ordersPage.total,
        });
        const normalized = (ordersPage.data || []).map((o) => ({
          rowId: nextRowId.current++,
          id: o.id,
          loom_id: o.loom_id != null ? String(o.loom_id) : '',
          order_from: o.order_from ?? '',
          customer: o.customer ?? '',
          weaving_unit: o.weaving_unit ?? '',
          design: o.design ?? '',
          po_number: o.po_number ?? '',
          po_date: o.po_date ? String(o.po_date).slice(0, 10) : '',
          delivery_date: o.delivery_date ? String(o.delivery_date).slice(0, 10) : '',
          _created_at: o.created_at,
        }));
        setRows(normalized);
        setDirty(new Set());
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, [page, perPage]);

  useEffect(() => loadData(), [loadData]);

  const companyOptions = useMemo(
    () => (companies || []).map((c) => c.company_name || '').filter(Boolean),
    [companies]
  );

  const loomOptions = useMemo(
    () => (looms || []).map((l) => ({ value: String(l.id), label: l.loom_number })),
    [looms]
  );

  const addRow = () => {
    const r = EMPTY_ROW();
    r.rowId = nextRowId.current++;
    setRows((prev) => [...prev, r]);
  };

  const updateCell = (rowId, field, value) => {
    setRows((prev) => prev.map((r) => (r.rowId !== rowId ? r : { ...r, [field]: value })));
    setDirty((prev) => new Set(prev).add(`${rowId}-${field}`));
  };

  const deleteRow = async (rowId) => {
    const row = rows.find((r) => r.rowId === rowId);
    if (!row) return;
    if (!window.confirm('Delete this order?')) return;
    if (!row.id) {
      setRows((prev) => prev.filter((r) => r.rowId !== rowId));
      return;
    }
    try {
      await api.delete(`/yarn-orders/${row.id}`);
      toast.success('Deleted');
      setRows((prev) => prev.filter((r) => r.rowId !== rowId));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        const payload = {
          // IMPORTANT: Do not assign loom while creating a new order.
          // Loom assignment is handled from Loom screen / by editing an existing order.
          loom_id: r.id ? (r.loom_id ? Number(r.loom_id) : null) : null,
          order_from: r.order_from || null,
          customer: r.customer || null,
          weaving_unit: r.weaving_unit || null,
          design: r.design || null,
          po_number: r.po_number || null,
          po_date: r.po_date || null,
          delivery_date: r.delivery_date || null,
        };

        // skip totally empty new rows
        const hasAny =
          payload.loom_id != null ||
          payload.order_from ||
          payload.customer ||
          payload.weaving_unit ||
          payload.design ||
          payload.po_number ||
          payload.po_date ||
          payload.delivery_date;
        if (!hasAny) continue;

        if (r.id) {
          await api.put(`/yarn-orders/${r.id}`, payload);
        } else {
          await api.post('/yarn-orders', payload);
        }
      }
      toast.success('Saved');
      setDirty(new Set());
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
    } else {
      const activeRow = parseInt(document.activeElement.getAttribute('data-row'), 10);
      const activeCol = document.activeElement.getAttribute('data-col');
      const nextTarget = wrapRef.current.querySelector(`[data-row=\"${activeRow + 1}\"][data-col=\"${activeCol}\"]`);
      (nextTarget || inputs[i + 1])?.focus();
    }
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Orders (Yarn Orders)</h2>
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
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Order Id</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Loom</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Order From</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Customer</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Weaving Unit</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Design</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">P.O Number</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">PO Date</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Delivery Date</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rowIndex) => (
                <tr key={r.rowId} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap border-r border-gray-100 bg-gray-50/50">
                    {r.id ? formatOrderId({ id: r.id, created_at: r._created_at }) : '—'}
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <select
                      value={r.loom_id}
                      onChange={(e) => updateCell(r.rowId, 'loom_id', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit || !r.id}
                      className={`w-full min-w-[8rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-loom_id`) ? 'bg-amber-50' : ''}`}
                      data-row={rowIndex}
                      data-col="loom_id"
                    >
                      <option value="">{r.id ? '—' : 'Save order first'}</option>
                      {loomOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <select
                      value={r.order_from || ''}
                      onChange={(e) => updateCell(r.rowId, 'order_from', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[10rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-order_from`) ? 'bg-amber-50' : ''}`}
                      data-row={rowIndex}
                      data-col="order_from"
                    >
                      <option value="">—</option>
                      {companyOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <input
                      value={r.customer}
                      onChange={(e) => updateCell(r.rowId, 'customer', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[10rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-customer`) ? 'bg-amber-50' : ''}`}
                      placeholder="Customer"
                      data-row={rowIndex}
                      data-col="customer"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <input
                      value={r.weaving_unit}
                      onChange={(e) => updateCell(r.rowId, 'weaving_unit', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[10rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-weaving_unit`) ? 'bg-amber-50' : ''}`}
                      placeholder="Weaving unit"
                      data-row={rowIndex}
                      data-col="weaving_unit"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <input
                      value={r.design}
                      onChange={(e) => updateCell(r.rowId, 'design', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[10rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-design`) ? 'bg-amber-50' : ''}`}
                      placeholder="Design"
                      data-row={rowIndex}
                      data-col="design"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <input
                      value={r.po_number}
                      onChange={(e) => updateCell(r.rowId, 'po_number', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[9rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-po_number`) ? 'bg-amber-50' : ''}`}
                      placeholder="PO number"
                      data-row={rowIndex}
                      data-col="po_number"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <input
                      type="date"
                      value={r.po_date}
                      onChange={(e) => updateCell(r.rowId, 'po_date', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[9rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-po_date`) ? 'bg-amber-50' : ''}`}
                      data-row={rowIndex}
                      data-col="po_date"
                    />
                  </td>
                  <td className="p-0 border-r border-gray-100">
                    <input
                      type="date"
                      value={r.delivery_date}
                      onChange={(e) => updateCell(r.rowId, 'delivery_date', e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canEdit}
                      className={`w-full min-w-[9rem] px-2 py-1.5 text-sm border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 bg-transparent disabled:bg-gray-50 ${dirty.has(`${r.rowId}-delivery_date`) ? 'bg-amber-50' : ''}`}
                      data-row={rowIndex}
                      data-col="delivery_date"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-sm whitespace-nowrap">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => deleteRow(r.rowId)}
                        className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:underline"
                        title="Delete order"
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
      {(orderMeta.total > 0 || page > 1) && (
        <TablePagination
          page={orderMeta.current_page}
          lastPage={orderMeta.last_page}
          total={orderMeta.total}
          perPage={orderMeta.per_page}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
          disabled={loading || saving}
        />
      )}
    </div>
  );
}

export default OrderGridTable;

