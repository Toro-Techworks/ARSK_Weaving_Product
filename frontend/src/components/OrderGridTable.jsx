import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Button from './Button';
import { FormInput, FormSelect } from './FormInput';
import { TablePagination } from './TablePagination';
import { formatOrderId } from '../utils/formatOrderId';
import { normalizePaginatedResponse } from '../utils/pagination';
import { AnimatedModal } from './AnimatedModal';

const EMPTY_ROW = () => ({
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

const EMPTY_FILTERS = {
  order_id: '',
  loom_id: '',
  order_from: '',
  customer: '',
  design: '',
  po_number: '',
};

function buildOrderListParams(page, perPage, applied) {
  const params = { page, per_page: perPage };
  const a = applied || EMPTY_FILTERS;
  if (a.order_id?.trim()) params.filter_order_id = a.order_id.trim();
  if (a.loom_id) params.filter_loom_id = a.loom_id;
  if (a.order_from?.trim()) params.filter_order_from = a.order_from.trim();
  if (a.customer?.trim()) params.filter_customer = a.customer.trim();
  if (a.design?.trim()) params.filter_design = a.design.trim();
  if (a.po_number?.trim()) params.filter_po_number = a.po_number.trim();
  return params;
}

export function OrderGridTable({ canEdit = true }) {
  const [rows, setRows] = useState([]);
  const [looms, setLooms] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [weavingUnits, setWeavingUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [orderMeta, setOrderMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [filterDraft, setFilterDraft] = useState(() => ({ ...EMPTY_FILTERS }));
  const [filterApplied, setFilterApplied] = useState(() => ({ ...EMPTY_FILTERS }));
  const [bootstrapped, setBootstrapped] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [form, setForm] = useState(() => EMPTY_ROW());

  const loadData = useCallback(() => {
    setLoading(true);
    const listParams = buildOrderListParams(page, perPage, filterApplied);
    Promise.all([
      api.get('/yarn-orders', { params: listParams }).then((r) => normalizePaginatedResponse(r.data)),
      api.get('/looms-list').then((r) => r.data?.data || []).catch(() => []),
      api.get('/companies-list').then((r) => r.data?.data || []).catch(() => []),
      api.get('/weaving-units', { params: { page: 1, per_page: 500 } }).then((r) => normalizePaginatedResponse(r.data).data || []).catch(() => []),
    ])
      .then(([ordersPage, loomList, companyList, weavingUnitList]) => {
        setLooms(loomList);
        setCompanies(companyList);
        setWeavingUnits(weavingUnitList);
        setOrderMeta({
          current_page: ordersPage.current_page,
          last_page: ordersPage.last_page,
          per_page: ordersPage.per_page,
          total: ordersPage.total,
        });
        const normalized = (ordersPage.data || []).map((o) => ({
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
        setBootstrapped(true);
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, [page, perPage, filterApplied]);

  const applyFilters = () => {
    setFilterApplied({ ...filterDraft });
    setPage(1);
  };

  const clearFilters = () => {
    setFilterDraft({ ...EMPTY_FILTERS });
    setFilterApplied({ ...EMPTY_FILTERS });
    setPage(1);
  };

  const setDraft = (patch) => {
    setFilterDraft((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => loadData(), [loadData]);

  const companyOptions = useMemo(
    () => (companies || []).map((c) => c.company_name || '').filter(Boolean),
    [companies]
  );

  const loomOptions = useMemo(
    () => (looms || []).map((l) => ({ value: String(l.id), label: l.loom_number })),
    [looms]
  );

  const weavingUnitOptions = useMemo(
    () => (weavingUnits || [])
      .map((u) => u.company_name || '')
      .filter(Boolean)
      .map((name) => ({ value: name, label: name })),
    [weavingUnits]
  );

  const openCreateModal = () => {
    setEditingOrderId(null);
    setForm({ ...EMPTY_ROW(), customer: 'NA' });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingOrderId(row.id);
    setForm({
      id: row.id,
      loom_id: row.loom_id ?? '',
      order_from: row.order_from ?? '',
      customer: row.customer ?? '',
      weaving_unit: row.weaving_unit ?? '',
      design: row.design ?? '',
      po_number: row.po_number ?? '',
      po_date: row.po_date ?? '',
      delivery_date: row.delivery_date ?? '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (modalSaving) return;
    setModalOpen(false);
  };

  const deleteRow = async (row) => {
    if (!row?.id) return;
    if (!window.confirm('Delete this order?')) return;
    try {
      await api.delete(`/yarn-orders/${row.id}`);
      toast.success('Deleted');
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const saveOrder = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    try {
      const payload = {
        // New orders should not be assigned to a loom directly.
        loom_id: editingOrderId ? (form.loom_id ? Number(form.loom_id) : null) : null,
        order_from: form.order_from || null,
        customer: form.customer || null,
        weaving_unit: form.weaving_unit || null,
        design: form.design || null,
        po_number: form.po_number || null,
        po_date: form.po_date || null,
        delivery_date: form.delivery_date || null,
      };

      const hasAny =
        payload.loom_id != null ||
        payload.order_from ||
        payload.customer ||
        payload.weaving_unit ||
        payload.design ||
        payload.po_number ||
        payload.po_date ||
        payload.delivery_date;

      if (!editingOrderId && !hasAny) {
        toast.error('Enter at least one value to create an order');
        return;
      }

      if (editingOrderId) {
        await api.put(`/yarn-orders/${editingOrderId}`, payload);
        toast.success('Order updated');
      } else {
        await api.post('/yarn-orders', payload);
        toast.success('Order created');
      }
      closeModal();
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || (editingOrderId ? 'Update failed' : 'Create failed'));
    } finally {
      setModalSaving(false);
    }
  };

  if (!bootstrapped && loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Orders (Yarn Orders)</h2>
        {canEdit && (
          <Button onClick={openCreateModal} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create Order
          </Button>
        )}
      </div>

      <form
        className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <div className="text-sm font-medium text-gray-700">Filter orders</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <FormInput
            label="Order ID"
            placeholder="e.g. ORD-… or id"
            value={filterDraft.order_id}
            onChange={(e) => setDraft({ order_id: e.target.value })}
            className="!mb-0"
          />
          <FormSelect
            label="Loom"
            emptyLabel="All looms"
            value={filterDraft.loom_id}
            onChange={(e) => setDraft({ loom_id: e.target.value })}
            options={loomOptions}
            className="!mb-0"
          />
          <FormInput
            label="Order from"
            placeholder="Company name"
            value={filterDraft.order_from}
            onChange={(e) => setDraft({ order_from: e.target.value })}
            className="!mb-0"
          />
          <FormInput
            label="Customer"
            placeholder="Customer"
            value={filterDraft.customer}
            onChange={(e) => setDraft({ customer: e.target.value })}
            className="!mb-0"
          />
          <FormInput
            label="Design"
            placeholder="Design"
            value={filterDraft.design}
            onChange={(e) => setDraft({ design: e.target.value })}
            className="!mb-0"
          />
          <FormInput
            label="PO number"
            placeholder="PO number"
            value={filterDraft.po_number}
            onChange={(e) => setDraft({ po_number: e.target.value })}
            className="!mb-0"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            Apply filters
          </Button>
          <Button type="button" variant="secondary" onClick={clearFilters} disabled={loading}>
            Clear
          </Button>
        </div>
      </form>

      <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-white max-h-[calc(100vh-12rem)] flex flex-col">
        {loading && bootstrapped && (
          <div className="absolute inset-0 z-20 bg-white/60 flex items-center justify-center pointer-events-none">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-brand border-t-transparent" />
          </div>
        )}
        <div className="overflow-auto min-h-0 flex-1">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Order Id</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Order From</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Customer</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Weaving Unit</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">P.O Number</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">PO Date</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-r border-gray-200">Delivery Date</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap border-r border-gray-100 bg-gray-50/50">
                    {r.id ? formatOrderId({ id: r.id, created_at: r._created_at }) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap border-r border-gray-100">{r.order_from || '—'}</td>
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap border-r border-gray-100">{r.customer || '—'}</td>
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap border-r border-gray-100">{r.weaving_unit || '—'}</td>
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap border-r border-gray-100">{r.po_number || '—'}</td>
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap border-r border-gray-100">{r.po_date || '—'}</td>
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap border-r border-gray-100">{r.delivery_date || '—'}</td>
                  <td className="px-2 py-1.5 text-sm whitespace-nowrap">
                    {canEdit && (
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="inline-flex items-center gap-1.5 text-brand hover:underline"
                          title="Edit order"
                        >
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRow(r)}
                          className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:underline"
                          title="Delete order"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
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
          disabled={loading || modalSaving}
        />
      )}
      {modalOpen && (
        <AnimatedModal open onClose={closeModal} maxWidth="max-w-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{editingOrderId ? 'Edit Order' : 'Create Order'}</h3>
            <button type="button" onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={saveOrder} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSelect
                label="Order from"
                emptyLabel="Select company"
                options={companyOptions.map((c) => ({ value: c, label: c }))}
                value={form.order_from}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    order_from: value,
                    customer: value === 'ARSK' ? '' : 'NA',
                  }));
                }}
              />
              <FormInput
                label="Customer"
                value={form.customer}
                onChange={(e) => setForm((prev) => ({ ...prev, customer: e.target.value }))}
                disabled={form.order_from !== 'ARSK'}
              />
              <FormSelect
                label="Weaving Unit"
                emptyLabel="Select weaving unit"
                options={weavingUnitOptions}
                value={form.weaving_unit}
                onChange={(e) => setForm((prev) => ({ ...prev, weaving_unit: e.target.value }))}
              />
              <FormInput
                label="P.O Number"
                value={form.po_number}
                onChange={(e) => setForm((prev) => ({ ...prev, po_number: e.target.value }))}
              />
              <FormInput
                label="PO Date"
                type="date"
                value={form.po_date}
                onChange={(e) => setForm((prev) => ({ ...prev, po_date: e.target.value }))}
              />
              <FormInput
                label="Delivery Date"
                type="date"
                value={form.delivery_date}
                onChange={(e) => setForm((prev) => ({ ...prev, delivery_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" disabled={modalSaving}>
                {modalSaving ? 'Saving...' : editingOrderId ? 'Update Order' : 'Create Order'}
              </Button>
            </div>
          </form>
        </AnimatedModal>
      )}
    </div>
  );
}

export default OrderGridTable;

