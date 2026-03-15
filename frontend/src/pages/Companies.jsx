import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormTextarea } from '../components/FormInput';
import { AnimatedModal } from '../components/AnimatedModal';
import { Plus, Building2, X } from 'lucide-react';
import { usePagePermission } from '../hooks/usePagePermission';

export function CompanyList() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/companies', { params: { page, per_page: 15, search: search || undefined } })
      .then(({ data: res }) => {
        setData(res.data);
        setMeta(res.meta || {});
      })
      .catch(() => toast.error('Failed to load companies'))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), [page]);
  useEffect(() => {
    const t = setTimeout(() => { if (page === 1) fetch(); else setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const deleteCompany = (id, name) => {
    if (!window.confirm(`Delete company "${name}"?`)) return;
    api.delete(`/companies/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Delete failed'));
  };

  const columns = [
    { key: 'company_name', label: 'Company Name' },
    { key: 'gst_number', label: 'GST No.' },
    { key: 'contact_person', label: 'Contact' },
    { key: 'phone', label: 'Phone' },
    ...(canEdit ? [{
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <span className="flex gap-2">
          <Link to={`/companies/${row.id}/edit`} className="text-brand hover:underline">Edit</Link>
          <button type="button" onClick={() => deleteCompany(row.id, row.company_name)} className="text-red-600 hover:underline">Delete</button>
        </span>
      ),
    }] : []),
  ];

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editCompany, setEditCompany] = useState(null);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Company List</h2>
        {canEdit && <Button className="gap-2" onClick={() => setAddModalOpen(true)}><Plus className="w-4 h-4" /> Add Company</Button>}
      </div>
      <Card>
        <div className="flex gap-4 mb-4">
          <FormInput placeholder="Search company or GST..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <Table columns={columns} data={data} isLoading={loading} emptyMessage="No companies yet." />
        {meta.last_page > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="text-sm text-gray-500">Page {meta.current_page} of {meta.last_page}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
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
          company={editCompany}
          onClose={() => setEditCompany(null)}
          onSuccess={() => { setEditCompany(null); fetch(); }}
        />
      )}
    </div>
  );
}

function CompanyAddModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '', gst_number: '', address: '', contact_person: '', phone: '', payment_terms: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.post('/companies', form)
      .then(() => { toast.success('Company added'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <AnimatedModal open onClose={onClose} maxWidth="max-w-2xl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-xl">
        <h3 className="text-lg font-semibold text-gray-900">Add Company</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              <FormInput label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="!mb-0" />
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
        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Company'}</Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

function CompanyEditModal({ company, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '', gst_number: '', address: '', contact_person: '', phone: '', payment_terms: '',
  });

  useEffect(() => {
    if (company?.id) {
      api.get(`/companies/${company.id}`).then(({ data }) => setForm(data.data || {})).catch(() => toast.error('Failed to load'));
    }
  }, [company?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.put(`/companies/${company.id}`, form)
      .then(() => { toast.success('Company updated'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <AnimatedModal open onClose={onClose} maxWidth="max-w-2xl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-xl">
        <h3 className="text-lg font-semibold text-gray-900">Edit Company</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              <FormInput label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="!mb-0" />
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
        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Update Company'}</Button>
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
    setLoading(true);
    const promise = isEdit ? api.put(`/companies/${id}`, form) : api.post('/companies', form);
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
              <FormInput label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="!mb-0" />
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
