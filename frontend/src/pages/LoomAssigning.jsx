import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { FormInput } from '../components/FormInput';
import AnimatedModal from '../components/AnimatedModal';
import SearchableSelect from '../components/ui/SearchableSelect';
import { usePagePermission } from '../hooks/usePagePermission';
import { fetchAllPaginated } from '../utils/pagination';
import { formatOrderId } from '../utils/formatOrderId';

function rowAssignment(loom) {
  const assigned = Array.isArray(loom?.assigned_fabrics) ? loom.assigned_fabrics : [];
  if (assigned.length === 0) return null;
  return [...assigned].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))[0];
}

export function LoomAssigningPage() {
  const { canEdit } = usePagePermission();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [looms, setLooms] = useState([]);
  const [orders, setOrders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [form, setForm] = useState({
    loom_id: '',
    company_name: '',
    yarn_order_id: '',
    fabric_id: '',
  });

  const orderById = useMemo(() => {
    const map = new Map();
    (orders || []).forEach((o) => map.set(Number(o.id), o));
    return map;
  }, [orders]);

  const selectedFabric = useMemo(
    () => fabrics.find((f) => String(f.id) === String(form.fabric_id || '')) || null,
    [fabrics, form.fabric_id],
  );

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [loomRes, orderList, companyRes] = await Promise.all([
        api.get('/looms-list'),
        fetchAllPaginated(api, '/yarn-orders', { perPage: 200 }),
        api.get('/companies-list'),
      ]);
      setLooms(loomRes?.data?.data || []);
      setOrders(orderList || []);
      setCompanies(companyRes?.data?.data || []);
    } catch {
      toast.error('Failed to load loom assignment data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    const oid = form.yarn_order_id ? Number(form.yarn_order_id) : null;
    if (!oid) {
      setFabrics([]);
      if (form.fabric_id) setForm((prev) => ({ ...prev, fabric_id: '' }));
      return;
    }
    let cancelled = false;
    fetchAllPaginated(api, `/fabrics/yarn-order/${oid}`, { perPage: 200 })
      .then((list) => {
        if (cancelled) return;
        const withSl = (list || []).filter((f) => String(f.sl_number || '').trim() !== '');
        setFabrics(withSl);
      })
      .catch(() => {
        if (!cancelled) setFabrics([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.yarn_order_id, form.fabric_id]);

  const loomOptions = useMemo(
    () =>
      (looms || []).map((l) => ({
        value: String(l.id),
        label: `${String(l.loom_number || l.id)}${String(l.status || '').toLowerCase() === 'inactive' ? ' · Inactive' : ''}`,
      })),
    [looms],
  );

  const slOptions = useMemo(
    () =>
      (fabrics || []).map((f) => ({
        value: String(f.id),
        label: String(f.sl_number || `Line #${f.id}`),
      })),
    [fabrics],
  );

  const companyOptions = useMemo(
    () =>
      (companies || []).map((c) => ({
        value: String(c.company_name || ''),
        label: String(c.company_name || ''),
      })),
    [companies],
  );

  const ordersForCompany = useMemo(() => {
    const selectedCompany = String(form.company_name || '').trim().toLowerCase();
    if (!selectedCompany) return [];
    return (orders || []).filter((o) => String(o?.order_from || '').trim().toLowerCase() === selectedCompany);
  }, [orders, form.company_name]);

  const orderOptions = useMemo(
    () =>
      ordersForCompany.map((o) => ({
        value: String(o.id),
        label: `${formatOrderId(o)}${o.po_number ? ` · ${o.po_number}` : ''}${o.customer ? ` · ${o.customer}` : ''}`,
      })),
    [ordersForCompany],
  );

  const columns = useMemo(
    () => [
      { key: 'loom_number', label: 'Loom Number', render: (v) => v || '—' },
      { key: 'status', label: 'Status', render: (v) => v || '—' },
      {
        key: 'company',
        label: 'Order From (Company)',
        render: (_, row) => {
          const a = rowAssignment(row);
          if (!a?.yarn_order_id) return '—';
          const o = orderById.get(Number(a.yarn_order_id));
          return o?.order_from || '—';
        },
      },
      {
        key: 'order_number',
        label: 'Orders',
        render: (_, row) => {
          const a = rowAssignment(row);
          if (!a?.yarn_order_id) return '—';
          const o = orderById.get(Number(a.yarn_order_id));
          return `${formatOrderId(o || a.yarn_order_id)}${o?.po_number ? ` · ${o.po_number}` : ''}${o?.customer ? ` · ${o.customer}` : ''}`;
        },
      },
      {
        key: 'sl_number',
        label: 'SL No',
        render: (_, row) => {
          const a = rowAssignment(row);
          return a?.sl_number ? String(a.sl_number) : '—';
        },
      },
      {
        key: 'design',
        label: 'Design planning',
        render: (_, row) => {
          const a = rowAssignment(row);
          return a?.design ? String(a.design) : '—';
        },
      },
      {
        key: 'weave_technique',
        label: 'Weaving technique',
        render: (_, row) => {
          const a = rowAssignment(row);
          return a?.weave_technique ? String(a.weave_technique) : '—';
        },
      },
      {
        key: 'colour',
        label: 'Colour from production planning',
        render: (_, row) => {
          const a = rowAssignment(row);
          return a?.colour ? String(a.colour) : '—';
        },
      },
    ],
    [orderById],
  );

  const resetForm = () => {
    setForm({ loom_id: '', company_name: '', yarn_order_id: '', fabric_id: '' });
    setFabrics([]);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!form.loom_id || !form.company_name || !form.yarn_order_id || !form.fabric_id) {
      toast.error('Loom number, Company, Order, and SL No are required.');
      return;
    }
    setSaving(true);
    try {
      const loomId = Number(form.loom_id);
      const fabricId = Number(form.fabric_id);
      const targetLoom = looms.find((l) => Number(l.id) === loomId);
      if (!targetLoom) {
        toast.error('Selected loom not found.');
        return;
      }
      if (String(targetLoom.status || '').toLowerCase() === 'inactive') {
        toast.error('Cannot assign an inactive loom.');
        return;
      }
      const assigned = Array.isArray(targetLoom?.assigned_fabrics) ? targetLoom.assigned_fabrics : [];
      const clearCalls = assigned
        .filter((f) => Number(f.id) !== fabricId)
        .map((f) => api.put(`/fabrics/${f.id}`, { loom_id: null }));
      if (clearCalls.length > 0) {
        await Promise.all(clearCalls);
      }
      await api.put(`/fabrics/${fabricId}`, { loom_id: loomId });
      toast.success('Loom assigned successfully.');
      setOpenAssign(false);
      resetForm();
      await loadBase();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to assign loom.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Loom Assigning</h2>
        {canEdit && (
          <Button type="button" onClick={() => setOpenAssign(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Assign Loom
          </Button>
        )}
      </div>

      <Card className="border-gray-100 overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
          <span className="text-sm font-medium text-gray-700">Loom assignments</span>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={looms}
            keyField="id"
            isLoading={loading}
            emptyMessage="No looms found."
          />
        </div>
      </Card>

      <AnimatedModal open={openAssign} onClose={() => { setOpenAssign(false); resetForm(); }} maxWidth="max-w-2xl">
        <div className="p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Assign Loom</h3>
            <p className="text-xs text-gray-500 mt-1">
              Assignment is stored in production planning data for the selected SL.
            </p>
          </div>
          <form onSubmit={handleSaveAssignment} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Loom Number</label>
              <SearchableSelect
                options={loomOptions}
                value={form.loom_id}
                onChange={(v) => setForm((prev) => ({ ...prev, loom_id: v ? String(v) : '' }))}
                placeholder="Select loom"
                isClearable
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Order from (Company)</label>
              <SearchableSelect
                options={companyOptions}
                value={form.company_name}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    company_name: v ? String(v) : '',
                    yarn_order_id: '',
                    fabric_id: '',
                  }))
                }
                placeholder="Select company"
                isClearable
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Orders</label>
              <SearchableSelect
                options={orderOptions}
                value={form.yarn_order_id}
                onChange={(v) => setForm((prev) => ({ ...prev, yarn_order_id: v ? String(v) : '', fabric_id: '' }))}
                placeholder={form.company_name ? 'Select order' : 'Select company first'}
                isDisabled={!form.company_name}
                isClearable
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">SL No</label>
              <SearchableSelect
                options={slOptions}
                value={form.fabric_id}
                onChange={(v) => setForm((prev) => ({ ...prev, fabric_id: v ? String(v) : '' }))}
                placeholder={form.yarn_order_id ? 'Select SL number' : 'Select order first'}
                isDisabled={!form.yarn_order_id}
                isClearable
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Design planning"
                value={selectedFabric?.design || ''}
                readOnly
                className="!mb-0"
              />
              <FormInput
                label="Weaving technique"
                value={selectedFabric?.weave_technique || ''}
                readOnly
                className="!mb-0"
              />
            </div>

            <FormInput
              label="Colour from production planning"
              value={selectedFabric?.colour || ''}
              readOnly
              className="!mb-0"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => { setOpenAssign(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !canEdit}>
                {saving ? 'Saving...' : 'Save Assignment'}
              </Button>
            </div>
          </form>
        </div>
      </AnimatedModal>
    </div>
  );
}

export default LoomAssigningPage;
