import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronDown, Plus, Pencil, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/Card';
import { StatusToggle } from '../../components/StatusToggle';
import Button from '../../components/Button';
import { FormInput, FormSelect, FormTextarea } from '../../components/FormInput';
import { FormPhoneInput } from '../../components/FormPhoneInput';
import { usePagePermission } from '../../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../../hooks/useRefreshOnSameMenuClick';
import { normalizePaginatedResponse } from '../../utils/pagination';
import { appendWeaverFieldsToFormData } from '../../utils/weaverFormData';
import { ensureInternationalFormat, isValidInternationalPhone } from '../../utils/phoneInternational';
import { getGstinValidationError, normalizeGstinInput } from '../../utils/gstin';
import { GstinFormField } from '../../components/GstinFormField';
import { GENERIC_CODE_TYPES, FALLBACK_ACTIVE_INACTIVE } from '../../constants/genericCodeTypes';
import { useGenericCode } from '../../hooks/useGenericCode';

/** Must match App\Models\GenericCode::DROPDOWN_TYPE_MASTER */
const MASTER_DROPDOWN_TYPE = 'MASTER';

function formatCodeTypeLabel(codeType) {
  const key = String(codeType || '');
  if (!key) return '';
  if (key === 'yarn_receipt_count') return 'Count';
  if (key === 'yarn_receipt_content') return 'Content';
  if (key === 'expense_category') return 'Expense Category';
  if (key === 'weave_technique') return 'Weave Technique';
  if (key === 'design') return 'Design';
  // Default: "some_key" -> "Some Key"
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminMasterSettings() {
  const { canEdit } = usePagePermission();
  const [rows, setRows] = useState([]);
  const [weavingUnits, setWeavingUnits] = useState([]);
  const [windingUnits, setWindingUnits] = useState([]);
  const [weavers, setWeavers] = useState([]);
  const [looms, setLooms] = useState([]);
  /** After the first full load, section refetches no longer hide the whole page. */
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState({ generic: true, units: true, windingUnits: true, weavers: true, looms: true });

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [addType, setAddType] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expanded, setExpanded] = useState(() => ({}));
  const [unitAddOpen, setUnitAddOpen] = useState(false);
  const [unitEdit, setUnitEdit] = useState(null);
  const [windingAddOpen, setWindingAddOpen] = useState(false);
  const [windingEdit, setWindingEdit] = useState(null);
  const [weaverAddOpen, setWeaverAddOpen] = useState(false);
  const [weaverEdit, setWeaverEdit] = useState(null);
  const [loomAddOpen, setLoomAddOpen] = useState(false);
  const [loomEdit, setLoomEdit] = useState(null);

  const fetchGenericCodes = useCallback(() => {
    let alive = true;
    setLoadingMasters((p) => ({ ...p, generic: true }));

    async function run() {
      try {
        const perPage = 100; // backend clamps; fetch all pages
        const first = await api.get('/admin/generic-codes', {
          params: { dropdown_type: MASTER_DROPDOWN_TYPE, page: 1, per_page: perPage },
        });
        const n1 = normalizePaginatedResponse(first.data);
        let all = Array.isArray(n1.data) ? [...n1.data] : [];

        const lastPage = Number(n1.last_page || 1);
        if (lastPage > 1) {
          for (let p = 2; p <= lastPage; p += 1) {
            const resp = await api.get('/admin/generic-codes', {
              params: { dropdown_type: MASTER_DROPDOWN_TYPE, page: p, per_page: perPage },
            });
            const nx = normalizePaginatedResponse(resp.data);
            if (Array.isArray(nx.data)) all = all.concat(nx.data);
          }
        }

        if (!alive) return;
        setRows(all);
      } catch (e) {
        if (!alive) return;
        toast.error('Failed to load master settings');
      } finally {
        if (!alive) return;
        setLoadingMasters((p) => ({ ...p, generic: false }));
      }
    }

    run();
    return () => { alive = false; };
  }, []);

  const fetchWeavingUnits = useCallback(() => {
    let alive = true;
    setLoadingMasters((p) => ({ ...p, units: true }));
    async function run() {
      try {
        const perPage = 100;
        const first = await api.get('/weaving-units', { params: { page: 1, per_page: perPage } });
        const n1 = normalizePaginatedResponse(first.data);
        let all = Array.isArray(n1.data) ? [...n1.data] : [];
        const lastPage = Number(n1.last_page || 1);
        if (lastPage > 1) {
          for (let p = 2; p <= lastPage; p += 1) {
            const resp = await api.get('/weaving-units', { params: { page: p, per_page: perPage } });
            const nx = normalizePaginatedResponse(resp.data);
            if (Array.isArray(nx.data)) all = all.concat(nx.data);
          }
        }
        if (!alive) return;
        // Ensure stable A→Z
        all.sort((a, b) => String(a.company_name || '').localeCompare(String(b.company_name || '')));
        setWeavingUnits(all);
      } catch {
        if (!alive) return;
        setWeavingUnits([]);
        toast.error('Failed to load weaving units');
      } finally {
        if (!alive) return;
        setLoadingMasters((p) => ({ ...p, units: false }));
      }
    }
    run();
    return () => { alive = false; };
  }, []);

  const fetchWindingUnits = useCallback(() => {
    let alive = true;
    setLoadingMasters((p) => ({ ...p, windingUnits: true }));
    async function run() {
      try {
        const perPage = 100;
        const first = await api.get('/winding-units', { params: { page: 1, per_page: perPage } });
        const n1 = normalizePaginatedResponse(first.data);
        let all = Array.isArray(n1.data) ? [...n1.data] : [];
        const lastPage = Number(n1.last_page || 1);
        if (lastPage > 1) {
          for (let p = 2; p <= lastPage; p += 1) {
            const resp = await api.get('/winding-units', { params: { page: p, per_page: perPage } });
            const nx = normalizePaginatedResponse(resp.data);
            if (Array.isArray(nx.data)) all = all.concat(nx.data);
          }
        }
        if (!alive) return;
        all.sort((a, b) => String(a.company_name || '').localeCompare(String(b.company_name || '')));
        setWindingUnits(all);
      } catch {
        if (!alive) return;
        setWindingUnits([]);
        toast.error('Failed to load winding units');
      } finally {
        if (!alive) return;
        setLoadingMasters((p) => ({ ...p, windingUnits: false }));
      }
    }
    run();
    return () => { alive = false; };
  }, []);

  const fetchWeavers = useCallback(() => {
    let alive = true;
    setLoadingMasters((p) => ({ ...p, weavers: true }));
    async function run() {
      try {
        const perPage = 100;
        const first = await api.get('/weavers', { params: { page: 1, per_page: perPage } });
        const n1 = normalizePaginatedResponse(first.data);
        let all = Array.isArray(n1.data) ? [...n1.data] : [];
        const lastPage = Number(n1.last_page || 1);
        if (lastPage > 1) {
          for (let p = 2; p <= lastPage; p += 1) {
            const resp = await api.get('/weavers', { params: { page: p, per_page: perPage } });
            const nx = normalizePaginatedResponse(resp.data);
            if (Array.isArray(nx.data)) all = all.concat(nx.data);
          }
        }
        if (!alive) return;
        all.sort((a, b) => String(a.weaver_name || '').localeCompare(String(b.weaver_name || '')));
        setWeavers(all);
      } catch {
        if (!alive) return;
        setWeavers([]);
        toast.error('Failed to load weavers');
      } finally {
        if (!alive) return;
        setLoadingMasters((p) => ({ ...p, weavers: false }));
      }
    }
    run();
    return () => { alive = false; };
  }, []);

  const fetchLooms = useCallback(() => {
    let alive = true;
    setLoadingMasters((p) => ({ ...p, looms: true }));
    async function run() {
      try {
        const perPage = 100;
        const first = await api.get('/looms', { params: { page: 1, per_page: perPage } });
        const n1 = normalizePaginatedResponse(first.data);
        let all = Array.isArray(n1.data) ? [...n1.data] : [];
        const lastPage = Number(n1.last_page || 1);
        if (lastPage > 1) {
          for (let p = 2; p <= lastPage; p += 1) {
            const resp = await api.get('/looms', { params: { page: p, per_page: perPage } });
            const nx = normalizePaginatedResponse(resp.data);
            if (Array.isArray(nx.data)) all = all.concat(nx.data);
          }
        }
        if (!alive) return;
        all.sort((a, b) => String(a.loom_number || '').localeCompare(String(b.loom_number || '')));
        setLooms(all);
      } catch {
        if (!alive) return;
        setLooms([]);
        toast.error('Failed to load looms');
      } finally {
        if (!alive) return;
        setLoadingMasters((p) => ({ ...p, looms: false }));
      }
    }
    run();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const cleanups = [];
    cleanups.push(fetchGenericCodes());
    cleanups.push(fetchWeavingUnits());
    cleanups.push(fetchWindingUnits());
    cleanups.push(fetchWeavers());
    cleanups.push(fetchLooms());
    return () => { cleanups.forEach((fn) => (typeof fn === 'function' ? fn() : null)); };
  }, [fetchGenericCodes, fetchWeavingUnits, fetchWindingUnits, fetchWeavers, fetchLooms]);

  useEffect(() => {
    const anyBusy =
      loadingMasters.generic ||
      loadingMasters.units ||
      loadingMasters.windingUnits ||
      loadingMasters.weavers ||
      loadingMasters.looms;
    if (!anyBusy) {
      setInitialLoadComplete(true);
    }
  }, [loadingMasters]);

  useRefreshOnSameMenuClick(() => {
    fetchGenericCodes();
    fetchWeavingUnits();
    fetchWindingUnits();
    fetchWeavers();
    fetchLooms();
  });

  const grouped = useMemo(() => {
    const byType = new Map();
    for (const r of rows || []) {
      const t = r.code_type || 'Unknown';
      if (!byType.has(t)) byType.set(t, []);
      byType.get(t).push(r);
    }
    const sortedTypes = Array.from(byType.keys()).sort((a, b) => String(a).localeCompare(String(b)));
    return sortedTypes.map((t) => {
      const items = byType.get(t) || [];
      items.sort((a, b) => {
        return String(a.code_description || '').localeCompare(String(b.code_description || ''));
      });
      return { codeType: t, items };
    });
  }, [rows]);

  const toggleActive = async (row) => {
    if (!canEdit) return;
    const next = !Boolean(row.is_active);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r)));
    try {
      await api.put(`/admin/generic-codes/${row.id}`, {
        code_type: row.code_type,
        code_description: row.code_description,
        is_active: next,
        dropdown_type: row.dropdown_type || MASTER_DROPDOWN_TYPE,
      });
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: Boolean(row.is_active) } : r)));
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const doDelete = async (row) => {
    try {
      await api.delete(`/admin/generic-codes/${row.id}`);
      toast.success('Deleted');
      setConfirmDelete(null);
      fetchGenericCodes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const toggleWeaverStatus = useCallback(
    async (it) => {
      if (!canEdit) return;
      const raw = it?.raw;
      if (!raw?.id) return;
      const isActive = String(raw.status ?? 'Active').trim() === 'Active';
      const next = isActive ? 'Inactive' : 'Active';
      setWeavers((prev) => prev.map((w) => (w.id === raw.id ? { ...w, status: next } : w)));
      try {
        await api.put(`/weavers/${raw.id}`, { status: next });
        toast.success(next === 'Active' ? 'Weaver activated' : 'Weaver deactivated');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Update failed');
        fetchWeavers();
      }
    },
    [canEdit, fetchWeavers],
  );

  const toggleLoomStatus = useCallback(
    async (it) => {
      if (!canEdit) return;
      const raw = it?.raw;
      if (!raw?.id) return;
      const isActive = String(raw.status ?? 'Active').trim() === 'Active';
      const next = isActive ? 'Inactive' : 'Active';
      const defaultInactiveReason = 'Marked inactive from Master settings.';
      setLooms((prev) =>
        prev.map((l) =>
          l.id === raw.id
            ? {
                ...l,
                status: next,
                inactive_reason: next === 'Active' ? null : String(l.inactive_reason || '').trim() || defaultInactiveReason,
              }
            : l,
        ),
      );
      try {
        if (next === 'Inactive') {
          const reason = String(raw.inactive_reason || '').trim() || defaultInactiveReason;
          await api.put(`/looms/${raw.id}`, { status: 'Inactive', inactive_reason: reason });
        } else {
          await api.put(`/looms/${raw.id}`, { status: 'Active' });
        }
        toast.success(next === 'Active' ? 'Loom activated' : 'Loom deactivated');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Update failed');
        fetchLooms();
      }
    },
    [canEdit, fetchLooms],
  );

  const toggleWeavingUnitStatus = useCallback(
    async (it) => {
      if (!canEdit) return;
      const raw = it?.raw;
      if (!raw?.id) return;
      const isActive = String(raw.status ?? 'Active').trim() === 'Active';
      const next = isActive ? 'Inactive' : 'Active';
      setWeavingUnits((prev) => prev.map((u) => (u.id === raw.id ? { ...u, status: next } : u)));
      try {
        await api.put(`/weaving-units/${raw.id}`, { status: next });
        toast.success(next === 'Active' ? 'Weaving unit activated' : 'Weaving unit deactivated');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Update failed');
        fetchWeavingUnits();
      }
    },
    [canEdit, fetchWeavingUnits],
  );

  const toggleWindingUnitStatus = useCallback(
    async (it) => {
      if (!canEdit) return;
      const raw = it?.raw;
      if (!raw?.id) return;
      const isActive = String(raw.status ?? 'Active').trim() === 'Active';
      const next = isActive ? 'Inactive' : 'Active';
      setWindingUnits((prev) => prev.map((u) => (u.id === raw.id ? { ...u, status: next } : u)));
      try {
        await api.put(`/winding-units/${raw.id}`, { status: next });
        toast.success(next === 'Active' ? 'Winding unit activated' : 'Winding unit deactivated');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Update failed');
        fetchWindingUnits();
      }
    },
    [canEdit, fetchWindingUnits],
  );

  return (
    <div className="font-sans" style={{ fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 p-4 sm:p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Master</h2>
            <p className="text-xs text-gray-500 mt-1">
              Only <strong>MASTER</strong> generic codes are listed here. Some screens (yarn stock, production planning, production expenses)
              read these values directly; other dropdowns still use <strong>CORE</strong> codes.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {!initialLoadComplete ? (
          <Card className="p-6">
            <div className="text-sm text-gray-500">Loading…</div>
          </Card>
        ) : (grouped.length === 0 && weavingUnits.length === 0 && windingUnits.length === 0 && weavers.length === 0 && looms.length === 0) ? (
          <Card className="p-6">
            <div className="text-sm text-gray-500">No MASTER generic codes match the filters.</div>
          </Card>
        ) : (
          <>
            <EntityCard
              title="Looms"
              subtitle="Manage looms stored in Looms table."
              count={looms.length}
              expanded={expanded.__looms ?? false}
              onToggleExpanded={() => setExpanded((p) => ({ ...p, __looms: !(p.__looms ?? false) }))}
              canEdit={canEdit}
              onAdd={() => setLoomAddOpen(true)}
              items={looms.map((l) => ({
                id: l.id,
                primary: l.loom_number,
                secondary: [l.location, l.status].filter(Boolean).join(' • '),
                raw: l,
              }))}
              onItemClick={(it) => setLoomEdit(it.raw)}
              entityStatusActive={(it) => String(it.raw?.status ?? 'Active').trim() === 'Active'}
              onToggleEntityStatus={toggleLoomStatus}
            />

            <EntityCard
              title="Weaving Units"
              subtitle="Manage weaving units stored in Weaving Units table."
              count={weavingUnits.length}
              expanded={expanded.__weaving_units ?? false}
              onToggleExpanded={() => setExpanded((p) => ({ ...p, __weaving_units: !(p.__weaving_units ?? false) }))}
              canEdit={canEdit}
              onAdd={() => setUnitAddOpen(true)}
              items={weavingUnits.map((u) => ({
                id: u.id,
                primary: u.company_name,
                secondary: [u.contact_person, u.phone, u.status].filter(Boolean).join(' • '),
                raw: u,
              }))}
              onItemClick={(it) => setUnitEdit(it.raw)}
              entityStatusActive={(it) => String(it.raw?.status ?? 'Active').trim() === 'Active'}
              onToggleEntityStatus={toggleWeavingUnitStatus}
            />

            <EntityCard
              title="Winding Units"
              subtitle="Manage winding units stored in Winding Units table."
              count={windingUnits.length}
              expanded={expanded.__winding_units ?? false}
              onToggleExpanded={() => setExpanded((p) => ({ ...p, __winding_units: !(p.__winding_units ?? false) }))}
              canEdit={canEdit}
              onAdd={() => setWindingAddOpen(true)}
              items={windingUnits.map((u) => ({
                id: u.id,
                primary: u.company_name,
                secondary: [u.contact_person, u.phone, u.status].filter(Boolean).join(' • '),
                raw: u,
              }))}
              onItemClick={(it) => setWindingEdit(it.raw)}
              entityStatusActive={(it) => String(it.raw?.status ?? 'Active').trim() === 'Active'}
              onToggleEntityStatus={toggleWindingUnitStatus}
            />

            <EntityCard
              title="Weavers"
              subtitle="Manage weavers stored in Weavers table."
              count={weavers.length}
              expanded={expanded.__weavers ?? false}
              onToggleExpanded={() => setExpanded((p) => ({ ...p, __weavers: !(p.__weavers ?? false) }))}
              canEdit={canEdit}
              onAdd={() => setWeaverAddOpen(true)}
              items={weavers.map((w) => ({
                id: w.id,
                primary: w.weaver_name,
                secondary: [w.employee_code, w.phone, w.status].filter(Boolean).join(' • '),
                raw: w,
              }))}
              onItemClick={(it) => setWeaverEdit(it.raw)}
              entityStatusActive={(it) => String(it.raw?.status ?? 'Active').trim() === 'Active'}
              onToggleEntityStatus={toggleWeaverStatus}
            />

            {grouped.map(({ codeType, items }) => (
              <CodeTypeCard
                key={codeType}
                codeType={codeType}
                items={items}
                canEdit={canEdit}
                expanded={expanded[codeType] ?? false}
                onToggleExpanded={() => setExpanded((p) => ({ ...p, [codeType]: !(p[codeType] ?? false) }))}
                onAdd={() => { setAddType(codeType); setAddOpen(true); }}
                onEdit={(row) => setEditRow(row)}
                onDelete={(row) => setConfirmDelete(row)}
                onToggleActive={toggleActive}
              />
            ))}
          </>
        )}
      </div>

      {addOpen && addType && (
        <GenericCodeFormModal
          title={`Add new ${formatCodeTypeLabel(addType) || addType}`}
          dropdownType={MASTER_DROPDOWN_TYPE}
          initial={{ code_type: addType, code_description: '', is_active: true }}
          codeTypeLocked
          onClose={() => { setAddOpen(false); setAddType(''); }}
          onSaved={() => {
            setAddOpen(false);
            setAddType('');
            fetchGenericCodes();
            toast.success('Saved');
          }}
        />
      )}

      {editRow && (
        <GenericCodeFormModal
          title={`Edit ${formatCodeTypeLabel(editRow.code_type) || editRow.code_type}`}
          dropdownType={editRow.dropdown_type || MASTER_DROPDOWN_TYPE}
          initial={{
            id: editRow.id,
            code_type: editRow.code_type,
            code_description: editRow.code_description,
            is_active: Boolean(editRow.is_active),
          }}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            setEditRow(null);
            fetchGenericCodes();
            toast.success('Updated');
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete item?"
          message={`Delete "${confirmDelete.code_description}" from ${confirmDelete.code_type}? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => doDelete(confirmDelete)}
        />
      )}

      {unitAddOpen && (
        <WeavingUnitModal
          title="Add Weaving Unit"
          initial={null}
          onClose={() => setUnitAddOpen(false)}
          onSaved={() => { setUnitAddOpen(false); fetchWeavingUnits(); toast.success('Saved'); }}
        />
      )}
      {unitEdit && (
        <WeavingUnitModal
          title="Edit Weaving Unit"
          initial={unitEdit}
          onClose={() => setUnitEdit(null)}
          onSaved={() => { setUnitEdit(null); fetchWeavingUnits(); toast.success('Updated'); }}
        />
      )}
      {windingAddOpen && (
        <WindingUnitModal
          title="Add Winding Unit"
          initial={null}
          onClose={() => setWindingAddOpen(false)}
          onSaved={() => { setWindingAddOpen(false); fetchWindingUnits(); toast.success('Saved'); }}
        />
      )}
      {windingEdit && (
        <WindingUnitModal
          title="Edit Winding Unit"
          initial={windingEdit}
          onClose={() => setWindingEdit(null)}
          onSaved={() => { setWindingEdit(null); fetchWindingUnits(); toast.success('Updated'); }}
        />
      )}
      {weaverAddOpen && (
        <WeaverModal
          title="Add Weaver"
          initial={null}
          onClose={() => setWeaverAddOpen(false)}
          onSaved={() => { setWeaverAddOpen(false); fetchWeavers(); toast.success('Saved'); }}
        />
      )}
      {weaverEdit && (
        <WeaverModal
          title="Edit Weaver"
          initial={weaverEdit}
          onClose={() => setWeaverEdit(null)}
          onSaved={() => { setWeaverEdit(null); fetchWeavers(); toast.success('Updated'); }}
        />
      )}
      {loomAddOpen && (
        <LoomModal
          title="Add Loom"
          initial={null}
          onClose={() => setLoomAddOpen(false)}
          onSaved={() => { setLoomAddOpen(false); fetchLooms(); toast.success('Saved'); }}
        />
      )}
      {loomEdit && (
        <LoomModal
          title="Edit Loom"
          initial={loomEdit}
          onClose={() => setLoomEdit(null)}
          onSaved={() => { setLoomEdit(null); fetchLooms(); toast.success('Updated'); }}
        />
      )}
    </div>
  );
}

function EntityCard({
  title,
  subtitle,
  count,
  expanded,
  onToggleExpanded,
  canEdit,
  onAdd,
  items,
  onItemClick,
  onItemDelete,
  /** When set with `onToggleEntityStatus`, each tile shows an Active/Inactive toggle like generic MASTER values. */
  entityStatusActive,
  onToggleEntityStatus,
}) {
  const reduceMotion = useReducedMotion();
  const countLabel = `${count} item${count === 1 ? '' : 's'}`;
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 overflow-hidden">
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
        <button type="button" onClick={onToggleExpanded} className="flex items-center gap-3 min-w-0 text-left">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand/10 text-brand shrink-0" aria-hidden>
            <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{countLabel}</span>
            </div>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </button>

        {canEdit && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm bg-brand hover:bg-brand-dark transition-colors"
            title={`Add ${title}`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={reduceMotion ? false : { height: 'auto', opacity: 1 }}
            exit={reduceMotion ? false : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 flex items-center justify-between gap-3">
                  <span>No items yet.</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={onAdd}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white bg-brand hover:bg-brand-dark transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {items.map((it) => {
                    const showStatusToggle = typeof onToggleEntityStatus === 'function' && typeof entityStatusActive === 'function';
                    if (showStatusToggle) {
                      return (
                        <div
                          key={it.id}
                          className="group rounded-xl bg-white border border-gray-200/70 px-3 py-3 sm:px-4 sm:py-3.5 flex flex-col gap-2.5 hover:shadow-sm hover:-translate-y-[1px] transition-all min-w-0 h-full"
                        >
                          <button type="button" className="min-w-0 text-left w-full" onClick={() => onItemClick?.(it)}>
                            <div className="text-sm font-medium text-gray-900 truncate">{it.primary}</div>
                            {it.secondary ? <div className="text-xs text-gray-500 mt-0.5 truncate">{it.secondary}</div> : null}
                          </button>
                          <div className="flex items-center justify-between gap-2 shrink-0 pt-1 border-t border-gray-100">
                            <StatusToggle
                              checked={Boolean(entityStatusActive(it))}
                              disabled={!canEdit}
                              onChange={() => onToggleEntityStatus(it)}
                              ariaLabel={`${title}: toggle active`}
                            />
                            {canEdit && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onItemClick?.(it)}
                                  className="p-2 rounded-lg text-gray-500 hover:text-brand hover:bg-brand/10 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {onItemDelete && (
                                  <button
                                    type="button"
                                    onClick={() => onItemDelete(it)}
                                    className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={it.id}
                        className="group rounded-xl bg-white border border-gray-200/70 px-3 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3 hover:shadow-sm hover:-translate-y-[1px] transition-all min-w-0"
                      >
                        <button type="button" className="min-w-0 text-left flex-1" onClick={() => onItemClick?.(it)}>
                          <div className="text-sm font-medium text-gray-900 truncate">{it.primary}</div>
                          {it.secondary ? <div className="text-xs text-gray-500 mt-0.5 truncate">{it.secondary}</div> : null}
                        </button>
                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onItemClick?.(it)}
                              className="p-2 rounded-lg text-gray-500 hover:text-brand hover:bg-brand/10 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {onItemDelete && (
                              <button
                                type="button"
                                onClick={() => onItemDelete(it)}
                                className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WeavingUnitModal({ title, initial, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    company_name: initial?.company_name ?? '',
    gst_number: normalizeGstinInput(initial?.gst_number ?? ''),
    address: initial?.address ?? '',
    contact_person: initial?.contact_person ?? '',
    phone: ensureInternationalFormat(initial?.phone),
    payment_terms: initial?.payment_terms ?? '',
    status: initial?.status ?? 'Active',
  }));
  const [gstinBlurred, setGstinBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const isEdit = Boolean(initial?.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (getGstinValidationError(form.gst_number, { required: true })) return;
    if (form.phone && !isValidInternationalPhone(form.phone)) {
      toast.error('Enter a valid phone number for the selected country');
      return;
    }
    setSaving(true);
    const payload = { ...form, phone: form.phone || null, status: form.status || 'Active' };
    const req = isEdit ? api.put(`/weaving-units/${initial.id}`, payload) : api.post('/weaving-units', payload);
    req
      .then(() => onSaved?.())
      .catch((err) => toast.error(err.response?.data?.message || 'Save failed'))
      .finally(() => setSaving(false));
  };

  const fieldClass = 'space-y-1.5';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput label="Weaving Unit Name" required value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <GstinFormField
                id={`master-weaving-gst-${initial?.id ?? 'new'}`}
                value={form.gst_number}
                onValueChange={(v) => setForm((f) => ({ ...f, gst_number: v }))}
                fieldBlurred={gstinBlurred}
                onFieldBlur={() => setGstinBlurred(true)}
                submitAttempted={submitAttempted}
                required
              />
            </div>
            <div className={fieldClass}>
              <FormInput label="Contact Person" value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormPhoneInput
                id={`master-weaving-phone-${initial?.id ?? 'new'}`}
                label="Phone"
                value={form.phone}
                onChange={(next) => setForm((f) => ({ ...f, phone: next }))}
                placeholder="Mobile number (optional)"
                className="!mb-0"
              />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormTextarea label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="!mb-0" />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormInput label="Payment Terms" value={form.payment_terms} onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))} className="!mb-0" />
              </div>
            </div>
            <div className={fieldClass}>
              <span className="block text-sm font-medium text-gray-700">Status</span>
              <div className="flex items-center gap-3 mt-2">
                <StatusToggle
                  checked={String(form.status || '').trim() === 'Active'}
                  disabled={false}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      status: String(f.status || '').trim() === 'Active' ? 'Inactive' : 'Active',
                    }))
                  }
                  ariaLabel="Toggle weaving unit active"
                />
                <span className="text-sm text-gray-600">{String(form.status || '').trim() === 'Active' ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WindingUnitModal({ title, initial, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    company_name: initial?.company_name ?? '',
    gst_number: normalizeGstinInput(initial?.gst_number ?? ''),
    address: initial?.address ?? '',
    contact_person: initial?.contact_person ?? '',
    phone: ensureInternationalFormat(initial?.phone),
    payment_terms: initial?.payment_terms ?? '',
    status: initial?.status ?? 'Active',
  }));
  const [gstinBlurred, setGstinBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const isEdit = Boolean(initial?.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (getGstinValidationError(form.gst_number, { required: true })) return;
    if (form.phone && !isValidInternationalPhone(form.phone)) {
      toast.error('Enter a valid phone number for the selected country');
      return;
    }
    setSaving(true);
    const payload = { ...form, phone: form.phone || null, status: form.status || 'Active' };
    const req = isEdit ? api.put(`/winding-units/${initial.id}`, payload) : api.post('/winding-units', payload);
    req
      .then(() => onSaved?.())
      .catch((err) => toast.error(err.response?.data?.message || 'Save failed'))
      .finally(() => setSaving(false));
  };

  const fieldClass = 'space-y-1.5';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput label="Winding Unit Name" required value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <GstinFormField
                id={`master-winding-gst-${initial?.id ?? 'new'}`}
                value={form.gst_number}
                onValueChange={(v) => setForm((f) => ({ ...f, gst_number: v }))}
                fieldBlurred={gstinBlurred}
                onFieldBlur={() => setGstinBlurred(true)}
                submitAttempted={submitAttempted}
                required
              />
            </div>
            <div className={fieldClass}>
              <FormInput label="Contact Person" value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormPhoneInput
                id={`master-winding-phone-${initial?.id ?? 'new'}`}
                label="Phone"
                value={form.phone}
                onChange={(next) => setForm((f) => ({ ...f, phone: next }))}
                placeholder="Mobile number (optional)"
                className="!mb-0"
              />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormTextarea label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="!mb-0" />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormInput label="Payment Terms" value={form.payment_terms} onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))} className="!mb-0" />
              </div>
            </div>
            <div className={fieldClass}>
              <span className="block text-sm font-medium text-gray-700">Status</span>
              <div className="flex items-center gap-3 mt-2">
                <StatusToggle
                  checked={String(form.status || '').trim() === 'Active'}
                  disabled={false}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      status: String(f.status || '').trim() === 'Active' ? 'Inactive' : 'Active',
                    }))
                  }
                  ariaLabel="Toggle winding unit active"
                />
                <span className="text-sm text-gray-600">{String(form.status || '').trim() === 'Active' ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WeaverModal({ title, initial, onClose, onSaved }) {
  const { options: statusOptions } = useGenericCode(GENERIC_CODE_TYPES.ACTIVE_INACTIVE, {
    fallback: FALLBACK_ACTIVE_INACTIVE,
  });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    employee_code: initial?.employee_code ?? '',
    weaver_name: initial?.weaver_name ?? '',
    phone: ensureInternationalFormat(initial?.phone),
    address: initial?.address ?? '',
    joining_date: initial?.joining_date ? String(initial.joining_date).slice(0, 10) : '',
    status: initial?.status ?? (statusOptions?.[0]?.value || 'Active'),
    account_number: initial?.account_number ?? '',
    aadhar_number: initial?.aadhar_number ?? '',
    pan_number: (initial?.pan_number ?? '').toUpperCase(),
  }));
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);

  const isEdit = Boolean(initial?.id);

  // Keep status valid when options arrive
  useEffect(() => {
    if (!form.status && statusOptions?.length) {
      setForm((f) => ({ ...f, status: statusOptions[0].value }));
    }
  }, [statusOptions, form.status]);

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    api.get('/weavers/next-employee-code')
      .then(({ data: res }) => {
        const code = res?.data?.employee_code;
        if (!cancelled && code) {
          setForm((f) => ({ ...f, employee_code: code }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.phone && !isValidInternationalPhone(form.phone)) {
      toast.error('Enter a valid phone number for the selected country');
      return;
    }
    setSaving(true);
    const fd = new FormData();
    appendWeaverFieldsToFormData(fd, form);
    if (aadharFile) fd.append('aadhar_document', aadharFile);
    if (panFile) fd.append('pan_document', panFile);
    const req = isEdit ? api.put(`/weavers/${initial.id}`, fd) : api.post('/weavers', fd);
    req
      .then(() => onSaved?.())
      .catch((err) => {
        const msg = err.response?.data?.message
          || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Save failed');
        toast.error(msg);
      })
      .finally(() => setSaving(false));
  };

  const fieldClass = 'space-y-1.5';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput
                label="Employee Code"
                required
                value={form.employee_code}
                onChange={(e) => setForm((f) => ({ ...f, employee_code: e.target.value }))}
                placeholder="EMP001"
                className="!mb-0"
              />
              {!isEdit && (
                <p className="text-xs text-gray-500 mt-0.5">Suggested automatically (EMP001, EMP002, …). You can edit if needed.</p>
              )}
            </div>
            <div className={fieldClass}>
              <FormInput label="Weaver Name" required value={form.weaver_name} onChange={(e) => setForm((f) => ({ ...f, weaver_name: e.target.value }))} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormPhoneInput
                id={`master-weaver-phone-${initial?.id ?? 'new'}`}
                label="Phone"
                value={form.phone}
                onChange={(next) => setForm((f) => ({ ...f, phone: next }))}
                placeholder="Mobile number (optional)"
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Joining Date"
                type="date"
                value={form.joining_date}
                onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <span className="block text-sm font-medium text-gray-700">Status</span>
              <div className="flex items-center gap-3 mt-2">
                <StatusToggle
                  checked={String(form.status || '').trim() === 'Active'}
                  disabled={false}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      status: String(f.status || '').trim() === 'Active' ? 'Inactive' : 'Active',
                    }))
                  }
                  ariaLabel="Toggle weaver active"
                />
                <span className="text-sm text-gray-600">{String(form.status || '').trim() === 'Active' ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Account number"
                value={form.account_number}
                onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Aadhar number"
                value={form.aadhar_number}
                onChange={(e) => setForm((f) => ({ ...f, aadhar_number: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                inputMode="numeric"
                maxLength={12}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="PAN"
                value={form.pan_number}
                onChange={(e) => setForm((f) => ({ ...f, pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) }))}
                maxLength={10}
                placeholder="ABCDE1234F"
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <span className="block text-sm font-medium text-gray-700 mb-1">Aadhar document (PDF / JPG / PNG, max 5MB)</span>
              {isEdit && initial?.aadhar_document_url && (
                <a href={initial.aadhar_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline block mb-1">View current file</a>
              )}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-800"
                onChange={(e) => setAadharFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className={fieldClass}>
              <span className="block text-sm font-medium text-gray-700 mb-1">PAN document (PDF / JPG / PNG, max 5MB)</span>
              {isEdit && initial?.pan_document_url && (
                <a href={initial.pan_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline block mb-1">View current file</a>
              )}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-800"
                onChange={(e) => setPanFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormTextarea label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="!mb-0" />
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoomModal({ title, initial, onClose, onSaved }) {
  const { options: statusOptions } = useGenericCode(GENERIC_CODE_TYPES.ACTIVE_INACTIVE, {
    fallback: FALLBACK_ACTIVE_INACTIVE,
  });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    loom_number: initial?.loom_number ?? '',
    location: initial?.location ?? '',
    status: initial?.status ?? (statusOptions?.[0]?.value || 'Active'),
    inactive_reason: initial?.inactive_reason ?? '',
  }));

  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    if (!form.status && statusOptions?.length) {
      setForm((f) => ({ ...f, status: statusOptions[0].value }));
    }
  }, [statusOptions, form.status]);

  useEffect(() => {
    if (form.status === 'Active' && form.inactive_reason) {
      // Keep it but don't force clear; backend clears on Active update.
    }
  }, [form.status]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!String(form.loom_number || '').trim()) {
      toast.error('Loom number is required');
      return;
    }
    setSaving(true);
    const payload = {
      loom_number: String(form.loom_number || '').trim(),
      location: String(form.location || '').trim() || null,
      status: form.status || 'Active',
      inactive_reason: form.status === 'Inactive' ? String(form.inactive_reason || '').trim() : null,
    };
    const req = isEdit ? api.put(`/looms/${initial.id}`, payload) : api.post('/looms', payload);
    req
      .then(() => onSaved?.())
      .catch((err) => {
        const msg = err.response?.data?.message
          || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Save failed');
        toast.error(msg);
      })
      .finally(() => setSaving(false));
  };

  const fieldClass = 'space-y-1.5';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput label="Loom number" required value={form.loom_number} onChange={(e) => setForm((f) => ({ ...f, loom_number: e.target.value }))} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <span className="block text-sm font-medium text-gray-700">Status</span>
              <div className="flex items-center gap-3 mt-2">
                <StatusToggle
                  checked={String(form.status || '').trim() === 'Active'}
                  disabled={false}
                  onChange={() =>
                    setForm((f) => {
                      const nextActive = String(f.status || '').trim() !== 'Active';
                      return {
                        ...f,
                        status: nextActive ? 'Active' : 'Inactive',
                      };
                    })
                  }
                  ariaLabel="Toggle loom active"
                />
                <span className="text-sm text-gray-600">{String(form.status || '').trim() === 'Active' ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            {form.status === 'Inactive' && (
              <div className="md:col-span-2">
                <div className={fieldClass}>
                  <FormTextarea
                    label="Inactive reason"
                    required
                    value={form.inactive_reason}
                    onChange={(e) => setForm((f) => ({ ...f, inactive_reason: e.target.value }))}
                    className="!mb-0"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CodeTypeCard({
  codeType,
  items,
  expanded,
  canEdit,
  onToggleExpanded,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
}) {
  const reduceMotion = useReducedMotion();
  const title = formatCodeTypeLabel(codeType);
  const countLabel = `${items.length} item${items.length === 1 ? '' : 's'}`;
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 overflow-hidden">
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex items-center gap-3 min-w-0 text-left"
        >
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand/10 text-brand shrink-0"
            aria-hidden
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{countLabel}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Manage values under this code type.</p>
          </div>
        </button>

        {canEdit && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm bg-brand hover:bg-brand-dark transition-colors"
            title={`Add under ${title}`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={reduceMotion ? false : { height: 'auto', opacity: 1 }}
            exit={reduceMotion ? false : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 flex items-center justify-between gap-3">
                  <span>No items yet.</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={onAdd}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white bg-brand hover:bg-brand-dark transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {items.map((row) => (
                    <SubCodeItem
                      key={row.id}
                      row={row}
                      canEdit={canEdit}
                      onEdit={() => onEdit(row)}
                      onDelete={() => onDelete(row)}
                      onToggleActive={() => onToggleActive(row)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubCodeItem({ row, canEdit, onEdit, onDelete, onToggleActive }) {
  return (
    <div
      className="group rounded-xl bg-white border border-gray-200/70 px-3 py-3 sm:px-4 sm:py-3.5 flex flex-col gap-2.5 hover:shadow-sm hover:-translate-y-[1px] transition-all min-w-0 h-full"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 line-clamp-2">{row.code_description}</div>
        <div className="text-xs text-gray-500 mt-1 truncate">
          Key: <span className="font-medium text-gray-600">{row.code_type}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 shrink-0 pt-1 border-t border-gray-100">
        <StatusToggle
          checked={Boolean(row.is_active)}
          disabled={!canEdit}
          onChange={onToggleActive}
          ariaLabel="Toggle active for this value"
        />
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="p-2 rounded-lg text-gray-500 hover:text-brand hover:bg-brand/10 transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel = 'Confirm', onCancel, onConfirm }) {
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-sm text-gray-600">{message}</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onConfirm?.();
                } finally {
                  setSaving(false);
                }
              }}
              className="text-white"
              style={{ backgroundColor: '#dc2626' }}
            >
              {saving ? 'Deleting…' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericCodeFormModal({ title, initial, dropdownType, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    code_description: initial.code_description,
    is_active: initial.is_active ? '1' : '0',
  }));

  const isEdit = Boolean(initial.id);
  const codeType = String(initial.code_type || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code_type: codeType.trim(),
      code_description: form.code_description.trim(),
      is_active: form.is_active === '1',
      dropdown_type: dropdownType,
    };
    const req = isEdit
      ? api.put(`/admin/generic-codes/${initial.id}`, payload)
      : api.post('/admin/generic-codes', payload);
    req
      .then(() => onSaved?.())
      .catch((err) => {
        const msg = err.response?.data?.message
          || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Save failed');
        toast.error(msg);
      })
      .finally(() => setSaving(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Code type: <span className="font-medium text-gray-700">{formatCodeTypeLabel(codeType) || codeType}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className={fieldClass}>
            <FormInput
              label="Code description"
              required
              value={form.code_description}
              onChange={(e) => setForm((f) => ({ ...f, code_description: e.target.value }))}
              className="!mb-0"
            />
          </div>
          <div className={fieldClass}>
            <span className="block text-sm font-medium text-gray-700">Active</span>
            <div className="flex items-center gap-3 mt-2">
              <StatusToggle
                checked={form.is_active === '1'}
                disabled={false}
                onChange={() => setForm((f) => ({ ...f, is_active: f.is_active === '1' ? '0' : '1' }))}
                ariaLabel="Toggle active"
              />
              <span className="text-sm text-gray-600">{form.is_active === '1' ? 'Yes' : 'No'}</span>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
