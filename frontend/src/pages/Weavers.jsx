import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect, FormTextarea } from '../components/FormInput';
import { FormPhoneInput } from '../components/FormPhoneInput';
import { AnimatedModal } from '../components/AnimatedModal';
import { Plus, Users, X, Archive } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePagePermission } from '../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import { TablePagination } from '../components/TablePagination';
import { normalizePaginatedResponse } from '../utils/pagination';
import { appendWeaverFieldsToFormData } from '../utils/weaverFormData';
import { ensureInternationalFormat, isValidInternationalPhone } from '../utils/phoneInternational';
import api from '../api/client';
import { GENERIC_CODE_TYPES, FALLBACK_ACTIVE_INACTIVE } from '../constants/genericCodeTypes';
import { useGenericCode } from '../hooks/useGenericCode';

export function WeaverList() {
  const { user } = useAuth();
  const { canEdit } = usePagePermission();
  const isSuperAdmin = user?.role === 'super_admin';
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editWeaver, setEditWeaver] = useState(null);

  const fetch = () => {
    setLoading(true);
    api.get('/weavers', { params: { page, per_page: perPage, search: search || undefined } })
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
      .catch(() => toast.error('Failed to load weavers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), [page, perPage]);
  useEffect(() => {
    const t = setTimeout(() => { if (page === 1) fetch(); else setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);
  useRefreshOnSameMenuClick(fetch);

  const deleteWeaver = (id, name) => {
    if (!window.confirm(`Delete weaver "${name}"?`)) return;
    api.delete(`/weavers/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Delete failed'));
  };

  const columns = [
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'weaver_name', label: 'Weaver Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
    ...(canEdit ? [{
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <span className="flex gap-2">
          <button type="button" onClick={() => setEditWeaver(row)} className="text-brand hover:underline">Edit</button>
          <button type="button" onClick={() => deleteWeaver(row.id, row.weaver_name)} className="text-red-600 hover:underline">Delete</button>
        </span>
      ),
    }] : []),
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Weaver List</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center">
          {isSuperAdmin && (
            <Link
              to="/admin/weavers/deleted"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400 text-sm"
            >
              <Archive className="w-4 h-4 shrink-0" />
              View deleted entries
            </Link>
          )}
          {canEdit && (
            <Button className="gap-2 w-full sm:w-auto" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4" /> Add Weaver
            </Button>
          )}
        </div>
      </div>
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <FormInput placeholder="Search by name, code, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-xs" />
        </div>
        <Table columns={columns} data={data} isLoading={loading} emptyMessage="No weavers yet." />
        {(meta.total > 0 || page > 1) && (
          <TablePagination
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            perPage={meta.per_page}
            onPageChange={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
            disabled={loading}
          />
        )}
      </Card>
      {addModalOpen && (
        <WeaverAddModal
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => { setAddModalOpen(false); fetch(); }}
        />
      )}
      {editWeaver && (
        <WeaverEditModal
          key={editWeaver.id}
          weaver={editWeaver}
          onClose={() => setEditWeaver(null)}
          onSuccess={() => { setEditWeaver(null); fetch(); }}
        />
      )}
    </div>
  );
}

function weaverRowToForm(weaver) {
  if (!weaver) {
    return {
      employee_code: '',
      weaver_name: '',
      phone: '',
      address: '',
      joining_date: '',
      status: 'Active',
      account_number: '',
      aadhar_number: '',
      pan_number: '',
    };
  }
  return {
    employee_code: weaver.employee_code ?? '',
    weaver_name: weaver.weaver_name ?? '',
    phone: ensureInternationalFormat(weaver.phone),
    address: weaver.address ?? '',
    joining_date: weaver.joining_date ? String(weaver.joining_date).slice(0, 10) : '',
    status: weaver.status ?? 'Active',
    account_number: weaver.account_number ?? '',
    aadhar_number: weaver.aadhar_number ?? '',
    pan_number: (weaver.pan_number ?? '').toUpperCase(),
  };
}

function WeaverAddModal({ onClose, onSuccess }) {
  const { options: statusOptions } = useGenericCode(GENERIC_CODE_TYPES.ACTIVE_INACTIVE, {
    fallback: FALLBACK_ACTIVE_INACTIVE,
  });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(weaverRowToForm());
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);

  useEffect(() => {
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
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.phone && !isValidInternationalPhone(form.phone)) {
      toast.error('Enter a valid phone number for the selected country');
      return;
    }
    setLoading(true);
    const fd = new FormData();
    appendWeaverFieldsToFormData(fd, form);
    if (aadharFile) fd.append('aadhar_document', aadharFile);
    if (panFile) fd.append('pan_document', panFile);
    api.post('/weavers', fd)
      .then(() => { toast.success('Weaver added'); onSuccess?.(); })
      .catch((err) => {
        const msg = err.response?.data?.message
          || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed');
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <AnimatedModal open onClose={onClose} maxWidth="max-w-2xl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add Weaver</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-brand" />
            <span className="text-sm font-medium text-gray-900">Weaver Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput
                label="Employee Code"
                required
                value={form.employee_code}
                onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                placeholder="EMP001"
                className="!mb-0"
              />
              <p className="text-xs text-gray-500">Suggested automatically (EMP001, EMP002, …). You can edit if needed.</p>
            </div>
            <div className={fieldClass}>
              <FormInput label="Weaver Name" required value={form.weaver_name} onChange={(e) => setForm({ ...form, weaver_name: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormPhoneInput
                id="weaver-add-phone"
                label="Phone"
                value={form.phone}
                onChange={(next) => setForm({ ...form, phone: next })}
                placeholder="Mobile number (optional)"
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Joining Date"
                type="date"
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormSelect
                label="Status"
                options={statusOptions}
                isClearable={false}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value || statusOptions[0]?.value || 'Active' })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Account number"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Aadhar number"
                value={form.aadhar_number}
                onChange={(e) => setForm({ ...form, aadhar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                inputMode="numeric"
                maxLength={12}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="PAN"
                value={form.pan_number}
                onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                maxLength={10}
                placeholder="ABCDE1234F"
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <span className="block text-sm font-medium text-gray-700 mb-1">Aadhar document (PDF / JPG / PNG, max 5MB)</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-800"
                onChange={(e) => setAadharFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className={fieldClass}>
              <span className="block text-sm font-medium text-gray-700 mb-1">PAN document (PDF / JPG / PNG, max 5MB)</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-800"
                onChange={(e) => setPanFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormTextarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="!mb-0" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? 'Saving...' : 'Add Weaver'}</Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

function WeaverEditModal({ weaver, onClose, onSuccess }) {
  const { options: statusOptions } = useGenericCode(GENERIC_CODE_TYPES.ACTIVE_INACTIVE, {
    fallback: FALLBACK_ACTIVE_INACTIVE,
  });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => weaverRowToForm(weaver));
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);

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
    api.put(`/weavers/${weaver.id}`, fd)
      .then(() => { toast.success('Weaver updated'); onSuccess?.(); })
      .catch((err) => {
        const msg = err.response?.data?.message
          || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed');
        toast.error(msg);
      })
      .finally(() => setSaving(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <AnimatedModal open onClose={onClose} maxWidth="max-w-2xl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Edit Weaver</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-brand" />
            <span className="text-sm font-medium text-gray-900">Weaver Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput label="Employee Code" required value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Weaver Name" required value={form.weaver_name} onChange={(e) => setForm({ ...form, weaver_name: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormPhoneInput
                id={`weaver-edit-phone-${weaver.id}`}
                label="Phone"
                value={form.phone}
                onChange={(next) => setForm({ ...form, phone: next })}
                placeholder="Mobile number (optional)"
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Joining Date"
                type="date"
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormSelect
                label="Status"
                options={statusOptions}
                isClearable={false}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value || statusOptions[0]?.value || 'Active' })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Account number"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Aadhar number"
                value={form.aadhar_number}
                onChange={(e) => setForm({ ...form, aadhar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                inputMode="numeric"
                maxLength={12}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="PAN"
                value={form.pan_number}
                onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                maxLength={10}
                placeholder="ABCDE1234F"
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <span className="block text-sm font-medium text-gray-700 mb-1">Aadhar document (PDF / JPG / PNG, max 5MB)</span>
              {weaver.aadhar_document_url && (
                <a href={weaver.aadhar_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline block mb-1">View current file</a>
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
              {weaver.pan_document_url && (
                <a href={weaver.pan_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline block mb-1">View current file</a>
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
                <FormTextarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="!mb-0" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">{saving ? 'Saving...' : 'Update Weaver'}</Button>
        </div>
      </form>
    </AnimatedModal>
  );
}
