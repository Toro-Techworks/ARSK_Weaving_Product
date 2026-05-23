import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { FormInput, FormSelect, FormTextarea } from '../components/FormInput';
import AnimatedModal from '../components/AnimatedModal';
import SearchableSelect from '../components/ui/SearchableSelect';
import { usePagePermission } from '../hooks/usePagePermission';
import { fetchAllPaginated } from '../utils/pagination';
import { formatOrderId } from '../utils/formatOrderId';
import { GENERIC_CODE_TYPES, FALLBACK_ACTIVE_INACTIVE } from '../constants/genericCodeTypes';
import { useGenericCode } from '../hooks/useGenericCode';
import {
  isLoomInactiveStatus,
  loomStatusTablePillClassName,
  normalizeLoomStatus,
} from '../utils/loomStatus';
import { LOOM_INACTIVE_REASONS } from '../constants/loomInactiveReasons';
import { useAuth } from '../context/AuthContext';
import { canManageLoomStatus } from '../utils/loomPermissions';
import { LoomInactiveRecordModal } from '../components/LoomInactiveRecordModal';

/** Label for SL dropdown: human-readable; value remains fabric id for API. */
function fabricAssignSelectLabel(f) {
  const size =
    f.required_width != null && f.required_width !== ''
      ? String(f.required_width).trim()
      : '';
  const parts = [f.description, f.colour, f.design, f.weave_technique, size ? `Width ${size}` : '']
    .map((x) => (x != null && String(x).trim() !== '' ? String(x).trim() : null))
    .filter(Boolean);
  if (parts.length > 0) return parts.join(' · ');
  return `Row #${f.id}`;
}

function rowAssignment(loom) {
  const assigned = Array.isArray(loom?.assigned_fabrics) ? loom.assigned_fabrics : [];
  if (assigned.length === 0) return null;
  return [...assigned].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))[0];
}

/** Prefill company / order / fabric from existing fabrics.loom_id mapping on this loom. */
function assignmentFormFieldsFromLoom(loom, orders) {
  if (!loom) {
    return { company_name: '', yarn_order_id: '', fabric_id: '' };
  }
  const a = rowAssignment(loom);
  if (!a?.yarn_order_id) {
    return { company_name: '', yarn_order_id: '', fabric_id: '' };
  }
  const order = (orders || []).find((o) => Number(o.id) === Number(a.yarn_order_id));
  return {
    company_name: order ? String(order.order_from || '').trim() : '',
    yarn_order_id: String(a.yarn_order_id),
    fabric_id: a.id != null ? String(a.id) : '',
  };
}

function fabricOptionLabelFromAssignment(a) {
  if (!a) return '';
  const parts = [a.design, a.colour, a.weave_technique, a.sl_number]
    .map((x) => (x != null && String(x).trim() !== '' ? String(x).trim() : null))
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : `Row #${a.id}`;
}

export function LoomAssigningPage() {
  const { user } = useAuth();
  const { canEdit } = usePagePermission();
  const canViewFullHistory = canManageLoomStatus(user);
  const { options: loomStatusOptions } = useGenericCode(GENERIC_CODE_TYPES.ACTIVE_INACTIVE, {
    fallback: FALLBACK_ACTIVE_INACTIVE,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [inactiveRecordLoom, setInactiveRecordLoom] = useState(null);
  const [looms, setLooms] = useState([]);
  const [orders, setOrders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [form, setForm] = useState({
    loom_id: '',
    loom_status: 'Active',
    inactive_reason: '',
    inactive_remarks: '',
    company_name: '',
    yarn_order_id: '',
    fabric_id: '',
  });

  const assignmentSectionDisabled = isLoomInactiveStatus(form.loom_status);

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

  const slOptions = useMemo(() => {
    const base = (fabrics || []).map((f) => ({
      value: String(f.id),
      label: fabricAssignSelectLabel(f),
    }));
    const fid = String(form.fabric_id || '');
    if (!fid || base.some((o) => o.value === fid)) return base;
    const loom = form.loom_id ? looms.find((l) => String(l.id) === String(form.loom_id)) : null;
    const a = loom ? rowAssignment(loom) : null;
    if (a && String(a.id) === fid) {
      return [{ value: fid, label: fabricOptionLabelFromAssignment(a) }, ...base];
    }
    return [{ value: fid, label: `Fabric #${fid}` }, ...base];
  }, [fabrics, form.fabric_id, form.loom_id, looms]);

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
      {
        key: 'status',
        label: 'Status',
        render: (v) => (
          <span
            className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-md border ${loomStatusTablePillClassName(v)}`}
          >
            {normalizeLoomStatus(v)}
          </span>
        ),
      },
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
      {
        key: '_inactive_record',
        label: '',
        render: (_, row) =>
          isLoomInactiveStatus(row.status) ? (
            <button
              type="button"
              onClick={() => setInactiveRecordLoom(row)}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-950 hover:underline whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              Inactive record
            </button>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          ),
      },
    ],
    [orderById],
  );

  const resetForm = () => {
    setForm({
      loom_id: '',
      loom_status: 'Active',
      inactive_reason: '',
    inactive_remarks: '',
      company_name: '',
      yarn_order_id: '',
      fabric_id: '',
    });
    setFabrics([]);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!form.loom_id) {
      toast.error('Loom number is required.');
      return;
    }
    const loomId = Number(form.loom_id);
    const targetLoom = looms.find((l) => Number(l.id) === loomId);
    if (!targetLoom) {
      toast.error('Selected loom not found.');
      return;
    }

    const nextStatus = normalizeLoomStatus(form.loom_status);
    const prevStatus = normalizeLoomStatus(targetLoom.status);
    const nextReason = String(form.inactive_reason || '').trim();
    const prevReason = String(targetLoom.inactive_reason || '').trim();

    if (nextStatus === 'Inactive') {
      if (!nextReason) {
        toast.error('A reason is required when status is Inactive.');
        return;
      }
      setSaving(true);
      try {
        await api.put(`/looms/${loomId}`, {
          status: 'Inactive',
          inactive_reason: nextReason,
          remarks: String(form.inactive_remarks || '').trim() || null,
        });
        toast.success('Loom status updated.');
        setOpenAssign(false);
        resetForm();
        await loadBase();
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to update loom.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!form.company_name || !form.yarn_order_id || !form.fabric_id) {
      toast.error('Company, order, and fabric line are required when the loom is Active.');
      return;
    }

    setSaving(true);
    try {
      const fabricId = Number(form.fabric_id);
      if (prevStatus !== 'Active' || prevReason !== '') {
        await api.put(`/looms/${loomId}`, { status: 'Active', inactive_reason: null });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Loom Assigning</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canViewFullHistory ? (
            <Link to="/admin/loom-history">
              <Button type="button" variant="secondary" className="gap-1.5">
                <History className="w-4 h-4" />
                All inactive history
              </Button>
            </Link>
          ) : null}
          {canEdit && (
            <Button type="button" onClick={() => setOpenAssign(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Assign Loom
            </Button>
          )}
        </div>
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
                onChange={(v) => {
                  const id = v ? String(v) : '';
                  const loom = id ? looms.find((l) => String(l.id) === id) : null;
                  const mapping = assignmentFormFieldsFromLoom(loom, orders);
                  setForm((prev) => ({
                    ...prev,
                    loom_id: id,
                    loom_status: loom ? normalizeLoomStatus(loom.status) : 'Active',
                    inactive_reason:
                      loom && isLoomInactiveStatus(loom.status)
                        ? String(loom.inactive_reason ?? '')
                        : '',
                    company_name: mapping.company_name,
                    yarn_order_id: mapping.yarn_order_id,
                    fabric_id: mapping.fabric_id,
                  }));
                }}
                placeholder="Select loom"
                isClearable
              />
            </div>

            <div className="space-y-1.5">
              <FormSelect
                label="Loom status"
                options={loomStatusOptions}
                isClearable={false}
                value={form.loom_status}
                onChange={(e) => {
                  const v = e.target.value || loomStatusOptions[0]?.value || 'Active';
                  setForm((prev) => ({
                    ...prev,
                    loom_status: v,
                    inactive_reason: normalizeLoomStatus(v) === 'Active' ? '' : prev.inactive_reason,
                  }));
                }}
                className="!mb-0"
              />
            </div>

            {isLoomInactiveStatus(form.loom_status) && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Inactive reason <span className="text-red-600">*</span>
                  </label>
                  <SearchableSelect
                    options={LOOM_INACTIVE_REASONS.map((r) => ({ value: r, label: r }))}
                    value={form.inactive_reason}
                    onChange={(v) => setForm((prev) => ({ ...prev, inactive_reason: v ? String(v) : '' }))}
                    placeholder="Select reason"
                  />
                </div>
                <FormTextarea
                  label="Remarks"
                  value={form.inactive_remarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, inactive_remarks: e.target.value }))}
                  className="!mb-0"
                />
              </>
            )}

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
                isDisabled={assignmentSectionDisabled}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Orders</label>
              <SearchableSelect
                options={orderOptions}
                value={form.yarn_order_id}
                onChange={(v) => setForm((prev) => ({ ...prev, yarn_order_id: v ? String(v) : '', fabric_id: '' }))}
                placeholder={form.company_name ? 'Select order' : 'Select company first'}
                isDisabled={!form.company_name || assignmentSectionDisabled}
                isClearable
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Fabric line</label>
              <SearchableSelect
                options={slOptions}
                value={form.fabric_id}
                onChange={(v) => setForm((prev) => ({ ...prev, fabric_id: v ? String(v) : '' }))}
                placeholder={form.yarn_order_id ? 'Select fabric line' : 'Select order first'}
                isDisabled={!form.yarn_order_id || assignmentSectionDisabled}
                isClearable
              />
            </div>

            {!assignmentSectionDisabled && (
              <>
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
              </>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => { setOpenAssign(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !canEdit}>
                {saving ? 'Saving...' : assignmentSectionDisabled ? 'Save status' : 'Save assignment'}
              </Button>
            </div>
          </form>
        </div>
      </AnimatedModal>

      <LoomInactiveRecordModal
        open={Boolean(inactiveRecordLoom)}
        loomId={inactiveRecordLoom?.id}
        loomNumber={inactiveRecordLoom?.loom_number}
        onClose={() => setInactiveRecordLoom(null)}
      />
    </div>
  );
}

export default LoomAssigningPage;
