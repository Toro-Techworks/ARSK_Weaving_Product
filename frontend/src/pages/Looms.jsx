import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Plus, Layers, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { usePagePermission } from '../hooks/usePagePermission';

export function LoomList() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/looms', { params: { page, per_page: 15 } })
      .then(({ data: res }) => { setData(res.data); setMeta(res.meta || {}); })
      .catch(() => toast.error('Failed to load looms'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [page]);

  const deleteLoom = (id, num) => {
    if (!window.confirm(`Delete loom ${num}?`)) return;
    api.delete(`/looms/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Delete failed'));
  };

  const columns = [
    { key: 'loom_number', label: 'Loom No.' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    ...(canEdit ? [{
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <span className="flex gap-2">
          <button type="button" onClick={() => setEditLoom(row)} className="text-brand hover:underline">Edit</button>
          <button type="button" onClick={() => deleteLoom(row.id, row.loom_number)} className="text-red-600 hover:underline">Delete</button>
        </span>
      ),
    }] : []),
  ];

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editLoom, setEditLoom] = useState(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Looms</h2>
        {canEdit && (
          <Button className="gap-2" onClick={() => setAddModalOpen(true)}><Plus className="w-4 h-4" /> Add Loom</Button>
        )}
      </div>
      <Card>
        <Table columns={columns} data={data} isLoading={loading} />
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
        <LoomAddModal
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => { setAddModalOpen(false); fetch(); }}
        />
      )}
      {editLoom && (
        <LoomEditModal
          loom={editLoom}
          onClose={() => setEditLoom(null)}
          onSuccess={() => { setEditLoom(null); fetch(); }}
        />
      )}
    </div>
  );
}

function LoomEditModal({ loom, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ loom_number: '', location: '', status: 'Active' });

  useEffect(() => {
    if (loom?.id) setForm({ loom_number: loom.loom_number ?? '', location: loom.location ?? '', status: loom.status ?? 'Active' });
  }, [loom?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.put(`/looms/${loom.id}`, form)
      .then(() => { toast.success('Loom updated'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Edit Loom</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-brand" />
            <span className="text-sm font-medium text-gray-900">Loom Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput label="Loom Number" required value={form.loom_number} onChange={(e) => setForm({ ...form, loom_number: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormSelect label="Status" options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="!mb-0" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Update Loom'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoomAddModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ loom_number: '', location: '', status: 'Active' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.post('/looms', form)
      .then(() => { toast.success('Loom added'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add Loom</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-brand" />
            <span className="text-sm font-medium text-gray-900">Loom Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput label="Loom Number" required value={form.loom_number} onChange={(e) => setForm({ ...form, loom_number: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormSelect label="Status" options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="!mb-0" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Loom'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LoomForm({ onSuccess }) {
  const { canEdit } = usePagePermission();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ loom_number: '', location: '', status: 'Active' });

  if (!canEdit) return <Navigate to="/loom-production/looms" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.post('/looms', form)
      .then(() => { toast.success('Loom added'); setForm({ loom_number: '', location: '', status: 'Active' }); onSuccess?.(); })
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
            <h3 className="text-base font-semibold text-gray-900">Loom Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormInput label="Loom Number" required value={form.loom_number} onChange={(e) => setForm({ ...form, loom_number: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormSelect label="Status" options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="!mb-0" />
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Loom'}</Button>
            <Link to="/loom-production/looms" className="text-sm text-gray-600 hover:text-brand">Cancel</Link>
          </div>
        </Card>
      </form>
    </div>
  );
}
