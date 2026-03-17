import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { usePagePermission } from '../hooks/usePagePermission';
import { LoomGridTable } from '../components/LoomGridTable';

export function LoomList() {
  const { canEdit } = usePagePermission();

  return (
    <div>
      <LoomGridTable canEdit={canEdit} />
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
