import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { usePagePermission } from '../../hooks/usePagePermission';
import { Card } from '../../components/Card';
import { FormInput, FormSelect } from '../../components/FormInput';
import Button from '../../components/Button';

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

export function AdminCreateUser() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { canEdit } = usePagePermission();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: '',
    status: 'active',
  });

  React.useEffect(() => {
    api.get('/roles').then(({ data }) => setRoles(data.data || [])).catch(() => {});
  }, []);

  const roleOptions = roles.map((r) => ({ value: String(r.id), label: (r.role_name || '').replace(/_/g, ' ') }));
  const filteredRoleOptions = currentUser?.role === 'super_admin'
    ? roleOptions
    : roleOptions.filter((r) => (r.label || '').toLowerCase() === 'user');

  React.useEffect(() => {
    if (form.role_id === '' && filteredRoleOptions.length > 0) {
      setForm((f) => ({ ...f, role_id: filteredRoleOptions[0].value }));
    }
  }, [filteredRoleOptions.length]);

  if (!canEdit) return <Navigate to="/admin/users" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users', form);
      toast.success('User created successfully');
      navigate('/admin/users');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : 'Failed to create user';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
          <p className="mt-1 text-sm text-gray-500">Create a new system user and assign a role.</p>
        </div>
        <Link to="/admin/users">
          <Button variant="secondary">Back to Users</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900">User Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormInput label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Password" type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Confirm Password" type="password" required value={form.password_confirmation} onChange={(e) => setForm((f) => ({ ...f, password_confirmation: e.target.value }))} placeholder="••••••••" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormSelect label="Role" required options={filteredRoleOptions} value={form.role_id} onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormSelect label="Status" options={STATUSES} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="!mb-0" />
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</Button>
            <Link to="/admin/users" className="text-sm text-gray-600 hover:text-brand">Cancel</Link>
          </div>
        </Card>
      </form>
    </div>
  );
}
