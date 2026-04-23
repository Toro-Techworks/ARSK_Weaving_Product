import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput } from '../components/FormInput';
import AnimatedModal from '../components/AnimatedModal';
import SearchableSelect from '../components/ui/SearchableSelect';
import { TablePagination } from '../components/TablePagination';
import { usePagePermission } from '../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import { fetchAllPaginated, normalizePaginatedResponse } from '../utils/pagination';
import { formatOrderId } from '../utils/formatOrderId';

function formatDate(iso) {
  if (!iso) return '—';
  return String(iso).slice(0, 10);
}

function formatNumber(v, digits = 3) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function formatCurrency(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function orderLabel(order) {
  if (!order) return '';
  const code = formatOrderId(order);
  const parts = [code, order.po_number, order.customer].filter(Boolean);
  return parts.join(' · ');
}

export function WindingList() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const fetch = useCallback(() => {
    setLoading(true);
    api
      .get('/windings', { params: { page, per_page: perPage, search: search || undefined } })
      .then(({ data: res }) => {
        const n = normalizePaginatedResponse(res);
        setData(n.data);
        setMeta({
          current_page: n.current_page,
          last_page: n.last_page,
          per_page: n.per_page,
          total: n.total,
        });
      })
      .catch(() => toast.error('Failed to load windings'))
      .finally(() => setLoading(false));
  }, [page, perPage, search]);

  useEffect(() => {
    fetch();
  }, [page, perPage]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page === 1) fetch();
      else setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useRefreshOnSameMenuClick(fetch);

  const handleDelete = (row) => {
    if (!window.confirm('Delete this winding entry?')) return;
    api
      .delete(`/windings/${row.id}`)
      .then(() => {
        toast.success('Deleted');
        fetch();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Delete failed'));
  };

  const columns = useMemo(
    () => [
      {
        key: 'winding_unit',
        label: 'Winding Unit',
        render: (_, row) => row.winding_unit?.company_name || '—',
      },
      {
        key: 'outward_date',
        label: 'Outward Date',
        render: (_, row) => formatDate(row.outward_date),
      },
      {
        key: 'inward_date',
        label: 'Inward Date',
        render: (_, row) => formatDate(row.inward_date),
      },
      {
        key: 'price_per_kg',
        label: 'Price / kg',
        render: (_, row) => formatCurrency(row.price_per_kg),
      },
      {
        key: 'amount',
        label: 'Amount',
        render: (_, row) => formatCurrency(row.amount),
      },
      {
        key: 'order_from',
        label: 'Order From',
        render: (_, row) => row.order_from || '—',
      },
      {
        key: 'yarn_order',
        label: 'Order',
        render: (_, row) =>
          row.yarn_order ? orderLabel(row.yarn_order) : row.yarn_order_id ? `#${row.yarn_order_id}` : '—',
      },
      {
        key: 'hank_kgs',
        label: 'Hank (kgs)',
        render: (_, row) => formatNumber(row.hank_kgs),
      },
      {
        key: 'cone_kgs',
        label: 'Cone (kgs)',
        render: (_, row) => formatNumber(row.cone_kgs),
      },
      ...(canEdit
        ? [
            {
              key: 'actions',
              label: 'Actions',
              render: (_, row) => (
                <span className="flex gap-2">
                  <button type="button" onClick={() => setEditRow(row)} className="text-brand hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(row)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </span>
              ),
            },
          ]
        : []),
    ],
    [canEdit],
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Winding</h2>
        {canEdit && (
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Winding
          </Button>
        )}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <FormInput
            placeholder="Search by company, order, unit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-xs"
          />
        </div>
        <Table columns={columns} data={data} isLoading={loading} emptyMessage="No winding entries yet." />
        {(meta.total > 0 || page > 1) && (
          <TablePagination
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            perPage={meta.per_page}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            disabled={loading}
          />
        )}
      </Card>

      {addOpen && (
        <WindingFormModal
          title="Add Winding"
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            fetch();
          }}
        />
      )}
      {editRow && (
        <WindingFormModal
          key={editRow.id}
          title="Edit Winding"
          initial={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            setEditRow(null);
            fetch();
          }}
        />
      )}
    </div>
  );
}

function computeAmount(hank, price) {
  const h = parseFloat(hank);
  const p = parseFloat(price);
  if (Number.isNaN(h) || Number.isNaN(p)) return '';
  return (Math.round(h * p * 100) / 100).toFixed(2);
}

function buildInitialForm(initial) {
  if (!initial) {
    return {
      winding_unit_id: '',
      outward_date: new Date().toISOString().slice(0, 10),
      inward_date: '',
      price_per_kg: '',
      amount: '',
      order_from: '',
      yarn_order_id: '',
      hank_kgs: '',
      cone_kgs: '',
    };
  }
  return {
    winding_unit_id: initial.winding_unit_id != null ? String(initial.winding_unit_id) : '',
    outward_date: initial.outward_date ? String(initial.outward_date).slice(0, 10) : '',
    inward_date: initial.inward_date ? String(initial.inward_date).slice(0, 10) : '',
    price_per_kg: initial.price_per_kg != null ? String(initial.price_per_kg) : '',
    amount: initial.amount != null ? String(initial.amount) : '',
    order_from: initial.order_from || initial.yarn_order?.order_from || '',
    yarn_order_id: initial.yarn_order_id != null ? String(initial.yarn_order_id) : '',
    hank_kgs: initial.hank_kgs != null ? String(initial.hank_kgs) : '',
    cone_kgs: initial.cone_kgs != null ? String(initial.cone_kgs) : '',
  };
}

function WindingFormModal({ title, initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id);
  const [saving, setSaving] = useState(false);
  const [windingUnits, setWindingUnits] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm(initial));
  // Track manual overrides so auto-compute doesn't clobber user-entered amount.
  const [amountManuallyEdited, setAmountManuallyEdited] = useState(() => {
    if (!initial) return false;
    const computed = computeAmount(initial.hank_kgs, initial.price_per_kg);
    const current = initial.amount != null ? String(initial.amount) : '';
    return Boolean(current) && Number(current) !== Number(computed || 0);
  });

  useEffect(() => {
    if (amountManuallyEdited) return;
    const next = computeAmount(form.hank_kgs, form.price_per_kg);
    setForm((prev) => (prev.amount === next ? prev : { ...prev, amount: next }));
  }, [form.hank_kgs, form.price_per_kg, amountManuallyEdited]);

  // Background load: winding units + companies. The form is usable while these load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [units, companyRes] = await Promise.all([
          fetchAllPaginated(api, '/winding-units', { perPage: 100 }),
          api.get('/companies-list'),
        ]);
        if (cancelled) return;
        setWindingUnits(Array.isArray(units) ? units : []);
        setCompanies(companyRes?.data?.data || []);
      } catch {
        if (!cancelled) toast.error('Failed to load form data');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Lazy load yarn orders ONLY for the selected company (server-side filter).
  // Avoids paginating through every yarn order in the system.
  useEffect(() => {
    const selected = String(form.order_from || '').trim();
    if (!selected) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    fetchAllPaginated(api, '/yarn-orders', {
      perPage: 200,
      filter_order_from: selected,
    })
      .then((list) => {
        if (cancelled) return;
        setOrders(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load orders for company');
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.order_from]);

  // Seed dropdowns with values already on the row so labels appear instantly,
  // even before the background lists finish loading.
  const windingUnitOptions = useMemo(() => {
    const opts = (windingUnits || []).map((u) => ({
      value: String(u.id),
      label: String(u.company_name || `Unit #${u.id}`),
    }));
    const seedId = form.winding_unit_id ? String(form.winding_unit_id) : '';
    const seedLabel = initial?.winding_unit?.company_name;
    if (seedId && seedLabel && !opts.some((o) => o.value === seedId)) {
      return [{ value: seedId, label: String(seedLabel) }, ...opts];
    }
    return opts;
  }, [windingUnits, form.winding_unit_id, initial]);

  const companyOptions = useMemo(() => {
    const opts = (companies || []).map((c) => ({
      value: String(c.company_name || ''),
      label: String(c.company_name || ''),
    }));
    const seed = String(form.order_from || '').trim();
    if (seed && !opts.some((o) => o.value === seed)) {
      return [{ value: seed, label: seed }, ...opts];
    }
    return opts;
  }, [companies, form.order_from]);

  const orderOptions = useMemo(
    () =>
      (orders || []).map((o) => ({
        value: String(o.id),
        label: orderLabel(o),
      })),
    [orders],
  );

  // Always include the originally-linked order so its label shows immediately,
  // even before the company-filtered orders list arrives.
  const effectiveOrderOptions = useMemo(() => {
    const existingId = form.yarn_order_id ? String(form.yarn_order_id) : '';
    if (!existingId) return orderOptions;
    if (orderOptions.some((o) => o.value === existingId)) return orderOptions;
    const seed =
      initial?.yarn_order && String(initial.yarn_order.id) === existingId
        ? { value: existingId, label: orderLabel(initial.yarn_order) }
        : { value: existingId, label: `#${existingId}` };
    return [seed, ...orderOptions];
  }, [orderOptions, form.yarn_order_id, initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.winding_unit_id) {
      toast.error('Winding unit is required');
      return;
    }
    setSaving(true);
    const payload = {
      winding_unit_id: Number(form.winding_unit_id),
      outward_date: form.outward_date || null,
      inward_date: form.inward_date || null,
      price_per_kg: form.price_per_kg === '' ? null : Number(form.price_per_kg),
      amount: form.amount === '' ? null : Number(form.amount),
      order_from: form.order_from || null,
      yarn_order_id: form.yarn_order_id ? Number(form.yarn_order_id) : null,
      hank_kgs: form.hank_kgs === '' ? null : Number(form.hank_kgs),
      cone_kgs: form.cone_kgs === '' ? null : Number(form.cone_kgs),
    };
    const req = isEdit ? api.put(`/windings/${initial.id}`, payload) : api.post('/windings', payload);
    req
      .then(() => {
        toast.success(isEdit ? 'Updated' : 'Saved');
        onSaved?.();
      })
      .catch((err) => {
        const msg =
          err.response?.data?.message ||
          (err.response?.data?.errors
            ? Object.values(err.response.data.errors).flat().join(' ')
            : 'Save failed');
        toast.error(msg);
      })
      .finally(() => setSaving(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <AnimatedModal open onClose={onClose} maxWidth="max-w-3xl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${fieldClass} md:col-span-2`}>
            <label className="block text-sm font-medium text-gray-700">Winding Unit</label>
            <SearchableSelect
              options={windingUnitOptions}
              value={form.winding_unit_id}
              onChange={(v) => setForm((prev) => ({ ...prev, winding_unit_id: v ? String(v) : '' }))}
              placeholder="Select winding unit"
              isClearable
            />
          </div>

          <div className={fieldClass}>
            <FormInput
              label="Outward Date"
              type="date"
              value={form.outward_date}
              onChange={(e) => setForm((prev) => ({ ...prev, outward_date: e.target.value }))}
              className="!mb-0"
            />
          </div>
          <div className={fieldClass}>
            <FormInput
              label="Inward Date"
              type="date"
              value={form.inward_date}
              onChange={(e) => setForm((prev) => ({ ...prev, inward_date: e.target.value }))}
              className="!mb-0"
            />
          </div>

          <div className={fieldClass}>
            <FormInput
              label="Price / kg"
              type="number"
              step="0.01"
              min="0"
              value={form.price_per_kg}
              onChange={(e) => setForm((prev) => ({ ...prev, price_per_kg: e.target.value }))}
              className="!mb-0"
            />
          </div>
          <div className={fieldClass}>
            <FormInput
              label="Hank (kgs) — Outward"
              type="number"
              step="0.001"
              min="0"
              value={form.hank_kgs}
              onChange={(e) => setForm((prev) => ({ ...prev, hank_kgs: e.target.value }))}
              className="!mb-0"
            />
          </div>

          <div className={`${fieldClass} md:col-span-2`}>
            <FormInput
              label="Amount (auto = Hank × Price / kg, editable)"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => {
                const v = e.target.value;
                setAmountManuallyEdited(true);
                setForm((prev) => ({ ...prev, amount: v }));
              }}
              className="!mb-0"
            />
            {amountManuallyEdited && (
              <button
                type="button"
                className="text-xs text-brand hover:underline"
                onClick={() => {
                  setAmountManuallyEdited(false);
                  setForm((prev) => ({
                    ...prev,
                    amount: computeAmount(prev.hank_kgs, prev.price_per_kg),
                  }));
                }}
              >
                Reset to calculated
              </button>
            )}
          </div>

          <div className={fieldClass}>
            <label className="block text-sm font-medium text-gray-700">Order from (Company)</label>
            <SearchableSelect
              options={companyOptions}
              value={form.order_from}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  order_from: v ? String(v) : '',
                  yarn_order_id: '',
                }))
              }
              placeholder="Select company"
              isClearable
            />
          </div>
          <div className={fieldClass}>
            <label className="block text-sm font-medium text-gray-700">Order Id</label>
            <SearchableSelect
              options={effectiveOrderOptions}
              value={form.yarn_order_id}
              onChange={(v) => setForm((prev) => ({ ...prev, yarn_order_id: v ? String(v) : '' }))}
              placeholder={
                !form.order_from
                  ? 'Select company first'
                  : ordersLoading
                    ? 'Loading orders…'
                    : 'Select order'
              }
              isDisabled={!form.order_from}
              isClearable
            />
          </div>

          <div className={fieldClass}>
            <FormInput
              label="Cone (kgs) — Inward"
              type="number"
              step="0.001"
              min="0"
              value={form.cone_kgs}
              onChange={(e) => setForm((prev) => ({ ...prev, cone_kgs: e.target.value }))}
              className="!mb-0"
            />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Save'}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export default WindingList;
