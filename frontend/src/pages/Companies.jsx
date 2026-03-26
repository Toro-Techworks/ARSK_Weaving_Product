import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormTextarea } from '../components/FormInput';
import { AnimatedModal } from '../components/AnimatedModal';
import { Plus, Building2, X } from 'lucide-react';
import { usePagePermission } from '../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import { TablePagination } from '../components/TablePagination';
import { normalizePaginatedResponse } from '../utils/pagination';

export function CompanyList() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/companies', { params: { page, per_page: perPage, search: search || undefined } })
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
      .catch(() => toast.error('Failed to load companies'))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), [page, perPage]);
  useEffect(() => {
    const t = setTimeout(() => { if (page === 1) fetch(); else setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useRefreshOnSameMenuClick(fetch);

  const deleteCompany = (id, name) => {
    if (!window.confirm(`Delete company "${name}"?`)) return;
    api.delete(`/companies/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Delete failed'));
  };

  const columns = [
    { key: 'company_name', label: 'Company Name' },
    { key: 'contact_person', label: 'Contact' },
    { key: 'gst_number', label: 'GST No.' },
    { key: 'phone', label: 'Phone' },
    ...(canEdit ? [{
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <span className="flex gap-2">
          <button type="button" onClick={() => setEditCompany(row)} className="text-brand hover:underline">Edit</button>
          <button type="button" onClick={() => deleteCompany(row.id, row.company_name)} className="text-red-600 hover:underline">Delete</button>
        </span>
      ),
    }] : []),
  ];

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editCompany, setEditCompany] = useState(null);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Company List</h2>
        {canEdit && <Button className="gap-2 w-full sm:w-auto" onClick={() => setAddModalOpen(true)}><Plus className="w-4 h-4" /> Add Company</Button>}
      </div>
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <FormInput placeholder="Search company or GST..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-xs" />
        </div>
        <Table columns={columns} data={data} isLoading={loading} emptyMessage="No companies yet." />
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
        <CompanyAddModal
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => { setAddModalOpen(false); fetch(); }}
        />
      )}
      {editCompany && (
        <CompanyEditModal
          key={editCompany.id}
          company={editCompany}
          onClose={() => setEditCompany(null)}
          onSuccess={() => { setEditCompany(null); fetch(); }}
        />
      )}
    </div>
  );
}

function normalizePhone(v) {
  const digits = String(v || '').replace(/\D/g, '');
  return digits.slice(0, 10);
}

/** Map API row (list or show) to edit form — list already returns full CompanyResource fields. */
function companyRowToForm(c) {
  if (!c) {
    return {
      company_name: '',
      gst_number: '',
      address: '',
      contact_person: '',
      phone: '',
      payment_terms: '',
    };
  }
  return {
    company_name: c.company_name ?? '',
    gst_number: c.gst_number ?? '',
    address: c.address ?? '',
    contact_person: c.contact_person ?? '',
    phone: normalizePhone(c.phone),
    payment_terms: c.payment_terms ?? '',
  };
}

function isValidPhone(v) {
  return /^\d{10}$/.test(String(v || ''));
}

function CompanyAddModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '', gst_number: '', address: '', contact_person: '', phone: '', payment_terms: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const phone = normalizePhone(form.phone);
    if (phone && !isValidPhone(phone)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    setLoading(true);
    api.post('/companies', { ...form, phone })
      .then(() => { toast.success('Company added'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <AnimatedModal open onClose={onClose} maxWidth="max-w-2xl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add Company</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-brand" />
            <span className="text-sm font-medium text-gray-900">Company Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput label="Company Name" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="GST Number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Contact Person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: normalizePhone(e.target.value) })}
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit phone (optional)"
                title="Up to 10 digits; leave blank if not applicable"
                className="!mb-0"
              />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormTextarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="!mb-0" />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormInput label="Payment Terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} className="!mb-0" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? 'Saving...' : 'Add Company'}</Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

function CompanyEditModal({ company, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => companyRowToForm(company));

  // Row from grid already includes full CompanyResource; no extra fetch — form is instant.
  // If the list API is ever trimmed, reintroduce a background GET here and merge into form.

  const handleSubmit = (e) => {
    e.preventDefault();
    const phone = normalizePhone(form.phone);
    if (phone && !isValidPhone(phone)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    setSaving(true);
    api.put(`/companies/${company.id}`, { ...form, phone })
      .then(() => { toast.success('Company updated'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setSaving(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <AnimatedModal open onClose={onClose} maxWidth="max-w-2xl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Edit Company</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-brand" />
            <span className="text-sm font-medium text-gray-900">Company Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput label="Company Name" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="GST Number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Contact Person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: normalizePhone(e.target.value) })}
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit phone (optional)"
                title="Up to 10 digits; leave blank if not applicable"
                className="!mb-0"
              />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormTextarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="!mb-0" />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormInput label="Payment Terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} className="!mb-0" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">{saving ? 'Saving...' : 'Update Company'}</Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export function CompanyForm({ id, onSuccess }) {
  const { canEdit } = usePagePermission();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '', gst_number: '', address: '', contact_person: '', phone: '', payment_terms: '',
  });

  useEffect(() => {
    if (id) api.get(`/companies/${id}`).then(({ data }) => setForm(data.data)).catch(() => toast.error('Failed to load'));
  }, [id]);

  if (!canEdit) return <Navigate to="/companies" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    const phone = normalizePhone(form.phone);
    if (phone && !isValidPhone(phone)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }
    setLoading(true);
    const payload = { ...form, phone };
    const promise = isEdit ? api.put(`/companies/${id}`, payload) : api.post('/companies', payload);
    promise
      .then(() => { toast.success(isEdit ? 'Updated' : 'Company added'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Company' : 'Add Company'}</h1>
          <p className="mt-1 text-sm text-gray-500">{isEdit ? 'Update company details.' : 'Add a new company to the list.'}</p>
        </div>
        <Link to="/companies">
          <Button variant="secondary">Back to Companies</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900">Company Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormInput label="Company Name" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="GST Number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Contact Person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: normalizePhone(e.target.value) })}
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit phone (optional)"
                title="Up to 10 digits; leave blank if not applicable"
                className="!mb-0"
              />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormTextarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="!mb-0" />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormInput label="Payment Terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} className="!mb-0" />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Update Company' : 'Add Company'}</Button>
            <Link to="/companies" className="text-sm text-gray-600 hover:text-brand">Cancel</Link>
          </div>
        </Card>
      </form>
    </div>
  );
}
