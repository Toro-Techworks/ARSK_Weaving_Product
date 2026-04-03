import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate } from 'react-router-dom';
import { Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { FormInput } from '../components/FormInput';
import { Table } from '../components/Table';
import { usePagePermission } from '../hooks/usePagePermission';
import SearchableSelect from '../components/ui/SearchableSelect';
import { TablePagination } from '../components/TablePagination';
import { formatOrderId } from '../utils/formatOrderId';
import { normalizePaginatedResponse, fetchAllPaginated } from '../utils/pagination';
import { loomStatusTablePillClassName, normalizeLoomStatus } from '../utils/loomStatus';

function orderLabel(o) {
  if (!o) return '';
  return formatOrderId(o) || String(o.id);
}

/** Fabrics that already have a stored SL code (saved via Yarn Stock). */
function fabricsWithSlNumber(list) {
  return (list || []).filter((f) => String(f.sl_number || '').trim() !== '');
}

/** Portal + high z-index: page content lives under AnimatedPage (transform), which breaks `fixed` unless we mount on `document.body`. */
const LOOM_MODAL_OVERLAY_CLASS =
  'fixed inset-0 z-[10000] flex min-h-screen w-full items-center justify-center bg-black/50 p-4';

function loomModalPortal(node) {
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}

function LoomEditModal({ loom, orders, canEdit, open, onClose, onSaved }) {
  const [loomNumber, setLoomNumber] = useState(loom?.loom_number || '');
  const [location, setLocation] = useState(loom?.location || '');
  const [yarnOrderId, setYarnOrderId] = useState(
    loom?.yarn_order_id != null ? String(loom.yarn_order_id) : '',
  );
  const [fabricId, setFabricId] = useState(loom?.fabric_id != null ? String(loom.fabric_id) : '');
  const [fabrics, setFabrics] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loom) return;
    setLoomNumber(loom.loom_number || '');
    setLocation(loom.location || '');
    setYarnOrderId(loom.yarn_order_id != null ? String(loom.yarn_order_id) : '');
    setFabricId(loom.fabric_id != null ? String(loom.fabric_id) : '');
  }, [loom?.id, loom?.updated_at, open]);

  const oidNum = yarnOrderId === '' ? null : Number(yarnOrderId);

  useEffect(() => {
    if (!open || !oidNum) {
      setFabrics([]);
      return undefined;
    }
    let cancelled = false;
    fetchAllPaginated(api, `/fabrics/yarn-order/${oidNum}`, { perPage: 100 })
      .then((list) => {
        if (!cancelled) setFabrics(fabricsWithSlNumber(list));
      })
      .catch(() => {
        if (!cancelled) setFabrics([]);
      });
    return () => {
      cancelled = true;
    };
  }, [oidNum, open]);

  const orderOptions = useMemo(
    () => orders.map((o) => ({ value: String(o.id), label: orderLabel(o) })),
    [orders],
  );

  const slOptions = useMemo(() => {
    if (!loom) return [];
    const base = fabrics.map((f) => ({
      value: String(f.id),
      label: String(f.sl_number || '').trim() || `Line #${f.id}`,
    }));
    const fs = String(fabricId || '');
    if (fs && !base.some((o) => o.value === fs)) {
      const lbl = loom.sl_number ? String(loom.sl_number) : `Fabric #${fs}`;
      return [{ value: fs, label: lbl }, ...base];
    }
    return base;
  }, [fabrics, fabricId, loom?.sl_number, loom]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!loom) return;
    if (!String(loomNumber).trim()) {
      toast.error('Loom number is required.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/looms/${loom.id}`, {
        loom_number: String(loomNumber).trim(),
        location: String(location).trim() || null,
        yarn_order_id: oidNum,
        fabric_id: oidNum && fabricId ? Number(fabricId) : null,
      });
      toast.success('Saved');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !loom) return null;

  return loomModalPortal(
    <div
      className={LOOM_MODAL_OVERLAY_CLASS}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loom-edit-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 id="loom-edit-title" className="text-base font-semibold text-gray-900">
              Edit loom
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Status is not changed here. SL list uses fabrics with a saved SL number in Yarn Stock for the selected order.
            </p>
          </div>
          <button
            type="button"
            className="p-1 rounded text-gray-500 hover:bg-gray-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Status:</span>
            <span
              className={`inline-flex px-2 py-0.5 rounded-md border text-xs font-semibold ${loomStatusTablePillClassName(loom.status)}`}
            >
              {normalizeLoomStatus(loom.status)}
            </span>
          </div>

          <FormInput
            label="Loom number"
            required
            value={loomNumber}
            onChange={(e) => setLoomNumber(e.target.value)}
            disabled={!canEdit}
            className="!mb-0"
          />
          <FormInput
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={!canEdit}
            className="!mb-0"
          />
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700">Order ID</span>
            <SearchableSelect
              options={orderOptions}
              value={yarnOrderId === '' ? '' : String(yarnOrderId)}
              onChange={(v) => {
                setYarnOrderId(v ? String(v) : '');
                setFabricId('');
              }}
              placeholder="Select order"
              isClearable
              isDisabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700">SL number</span>
            <SearchableSelect
              options={slOptions}
              value={fabricId}
              onChange={(v) => setFabricId(v ? String(v) : '')}
              placeholder={oidNum ? 'Select SL (from Yarn Stock)' : 'Select order first'}
              isClearable
              isDisabled={!canEdit || !oidNum}
            />
            {oidNum && fabrics.length === 0 && (
              <p className="text-xs text-amber-800">
                No fabric lines with a saved SL number for this order yet. Save fabrics in Yarn Stock first.
              </p>
            )}
          </div>

          {canEdit && (
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function LoomCreateModal({ open, onClose, orders, canEdit, onSaved }) {
  const [loomNumber, setLoomNumber] = useState('');
  const [location, setLocation] = useState('');
  const [yarnOrderId, setYarnOrderId] = useState('');
  const [fabricId, setFabricId] = useState('');
  const [fabrics, setFabrics] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoomNumber('');
    setLocation('');
    setYarnOrderId('');
    setFabricId('');
    setFabrics([]);
  }, [open]);

  const oidNum = yarnOrderId === '' ? null : Number(yarnOrderId);

  useEffect(() => {
    if (!open || !oidNum) {
      setFabrics([]);
      return undefined;
    }
    let cancelled = false;
    fetchAllPaginated(api, `/fabrics/yarn-order/${oidNum}`, { perPage: 100 })
      .then((list) => {
        if (!cancelled) setFabrics(fabricsWithSlNumber(list));
      })
      .catch(() => {
        if (!cancelled) setFabrics([]);
      });
    return () => {
      cancelled = true;
    };
  }, [oidNum, open]);

  const orderOptions = useMemo(
    () => orders.map((o) => ({ value: String(o.id), label: orderLabel(o) })),
    [orders],
  );

  const slOptions = useMemo(
    () =>
      fabrics.map((f) => ({
        value: String(f.id),
        label: String(f.sl_number || '').trim() || `Line #${f.id}`,
      })),
    [fabrics],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(loomNumber).trim()) {
      toast.error('Loom number is required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/looms', {
        loom_number: String(loomNumber).trim(),
        location: String(location).trim() || null,
        yarn_order_id: oidNum,
        fabric_id: oidNum && fabricId ? Number(fabricId) : null,
      });
      toast.success('Loom created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create loom');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return loomModalPortal(
    <div
      className={LOOM_MODAL_OVERLAY_CLASS}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loom-create-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 id="loom-create-title" className="text-base font-semibold text-gray-900">
              Create loom
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              SL numbers listed here are fabrics with a saved SL on that order in Yarn Stock.
            </p>
          </div>
          <button
            type="button"
            className="p-1 rounded text-gray-500 hover:bg-gray-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Loom number"
            required
            value={loomNumber}
            onChange={(e) => setLoomNumber(e.target.value)}
            disabled={!canEdit}
            className="!mb-0"
          />
          <FormInput
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={!canEdit}
            className="!mb-0"
          />
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700">Order ID</span>
            <SearchableSelect
              options={orderOptions}
              value={yarnOrderId === '' ? '' : String(yarnOrderId)}
              onChange={(v) => {
                setYarnOrderId(v ? String(v) : '');
                setFabricId('');
              }}
              placeholder="Select order"
              isClearable
              isDisabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700">SL number</span>
            <SearchableSelect
              options={slOptions}
              value={fabricId}
              onChange={(v) => setFabricId(v ? String(v) : '')}
              placeholder={oidNum ? 'Select SL (from Yarn Stock)' : 'Select order first'}
              isClearable
              isDisabled={!canEdit || !oidNum}
            />
            {oidNum && fabrics.length === 0 && (
              <p className="text-xs text-amber-800">
                No fabric lines with a saved SL number for this order yet. Save fabrics in Yarn Stock first.
              </p>
            )}
          </div>

          {canEdit && (
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create loom'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>,
  );
}

export function LoomList() {
  const { canEdit } = usePagePermission();
  const [looms, setLooms] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [editLoom, setEditLoom] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const orderById = useMemo(() => new Map(orders.map((o) => [Number(o.id), o])), [orders]);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAllPaginated(api, '/yarn-orders', { perPage: 200 }),
      api
        .get('/looms', { params: { page, per_page: perPage } })
        .then((r) => normalizePaginatedResponse(r.data)),
    ])
      .then(([orderList, loomPage]) => {
        setOrders(orderList);
        setLooms(loomPage.data || []);
        setMeta({
          current_page: loomPage.current_page,
          last_page: loomPage.last_page,
          per_page: loomPage.per_page,
          total: loomPage.total,
        });
      })
      .catch(() => toast.error('Failed to load looms'))
      .finally(() => setLoading(false));
  }, [page, perPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteRow = useCallback(async (loom) => {
    if (!window.confirm(`Delete loom “${loom.loom_number}”?`)) return;
    try {
      await api.delete(`/looms/${loom.id}`);
      toast.success('Deleted');
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  }, [loadData]);

  const tableColumns = useMemo(
    () => [
      { key: 'loom_number', label: 'Loom no.' },
      { key: 'location', label: 'Location', render: (v) => v || '—' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => (
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${loomStatusTablePillClassName(v)}`}
          >
            {normalizeLoomStatus(v)}
          </span>
        ),
      },
      {
        key: 'inactive_reason',
        label: 'Inactive reason',
        render: (v) => {
          const reason = v != null && String(v).trim() !== '' ? String(v).trim() : '';
          if (!reason) {
            return <span className="text-gray-400">—</span>;
          }
          return (
            <span className="line-clamp-2 max-w-md text-gray-900" title={reason}>
              {reason}
            </span>
          );
        },
      },
      {
        key: 'yarn_order_id',
        label: 'Order',
        render: (_, row) => {
          const o = row.yarn_order_id != null ? orderById.get(Number(row.yarn_order_id)) : null;
          return o ? orderLabel(o) : '—';
        },
      },
      {
        key: 'sl_number',
        label: 'SL number',
        render: (v) => (v && String(v).trim() !== '' ? v : '—'),
      },
      {
        key: '_actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                  onClick={() => setEditLoom(row)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteRow(row)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}
            {!canEdit && <span className="text-gray-400 text-sm">—</span>}
          </div>
        ),
      },
    ],
    [canEdit, orderById, handleDeleteRow],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Looms</h2>
        {canEdit && (
          <Button type="button" onClick={() => setCreateOpen(true)} className="gap-1.5 w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" />
            Create loom
          </Button>
        )}
      </div>

      <Card className="border-gray-100 overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
          <span className="text-sm font-medium text-gray-700">All looms</span>
          {!loading && meta.total > 0 && (
            <span className="text-xs text-gray-500 ml-2">({meta.total} total)</span>
          )}
        </div>
        <div className="p-0">
          <Table
            columns={tableColumns}
            data={looms}
            keyField="id"
            isLoading={loading && looms.length === 0}
            emptyMessage={loading ? 'Loading…' : 'No looms yet. Use Create loom to add one.'}
          />
        </div>
      </Card>

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

      <LoomCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orders={orders}
        canEdit={canEdit}
        onSaved={loadData}
      />

      <LoomEditModal
        loom={editLoom}
        orders={orders}
        canEdit={canEdit}
        open={Boolean(editLoom)}
        onClose={() => setEditLoom(null)}
        onSaved={loadData}
      />
    </div>
  );
}

export function LoomForm({ onSuccess }) {
  const { canEdit } = usePagePermission();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ loom_number: '', location: '' });

  if (!canEdit) return <Navigate to="/loom-production/looms" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api
      .post('/looms', {
        loom_number: String(form.loom_number || '').trim(),
        location: String(form.location || '').trim() || null,
      })
      .then(() => {
        toast.success('Loom added');
        setForm({ loom_number: '', location: '' });
        onSuccess?.();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Loom</h1>
          <p className="mt-1 text-sm text-gray-500">Add a new loom to the production unit.</p>
        </div>
        <Link to="/loom-production/looms">
          <Button variant="secondary">Back to Looms</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900">Loom details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormInput
                label="Loom number"
                required
                value={form.loom_number}
                onChange={(e) => setForm({ ...form, loom_number: e.target.value })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="!mb-0"
              />
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="submit" disabled={loading || !String(form.loom_number || '').trim()}>
              {loading ? 'Saving...' : 'Add loom'}
            </Button>
            <Link to="/loom-production/looms" className="text-sm text-gray-600 hover:text-brand">
              Cancel
            </Link>
          </div>
        </Card>
      </form>
    </div>
  );
}
