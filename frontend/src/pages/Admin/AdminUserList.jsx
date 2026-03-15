import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { usePagePermission } from '../../hooks/usePagePermission';
import { Card } from '../../components/Card';
import { FormInput, FormSelect } from '../../components/FormInput';
import Button from '../../components/Button';

export function AdminUserList() {
  const { user: currentUser } = useAuth();
  const { canEdit: pageCanEdit } = usePagePermission();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/users', { params: { page, per_page: 15, search: search || undefined } })
      .then(({ data }) => {
        setUsers(data.data);
        setMeta(data.meta || {});
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleDisable = (u) => {
    if (!window.confirm(`Disable user ${u.email}?`)) return;
    api.put(`/users/${u.id}`, { status: 'disabled' })
      .then(() => { toast.success('User disabled'); fetchUsers(); })
      .catch(() => toast.error('Failed to update'));
  };

  const handleEnable = (u) => {
    api.put(`/users/${u.id}`, { status: 'active' })
      .then(() => { toast.success('User enabled'); fetchUsers(); })
      .catch(() => toast.error('Failed to update'));
  };

  const handleDelete = (u) => {
    if (u.role === 'super_admin') return toast.error('Cannot delete SuperAdmin.');
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    api.delete(`/users/${u.id}`)
      .then(() => { toast.success('User deleted'); fetchUsers(); setEditModal(null); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to delete'));
  };

  const handleResetPassword = async (userId, password, password_confirmation) => {
    try {
      await api.post(`/users/${userId}/reset-password`, { password, password_confirmation });
      toast.success('Password reset successfully');
      setResetPasswordUser(null);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : 'Failed to reset password';
      toast.error(msg);
    }
  };

  const canEdit = (u) => {
    if (currentUser?.role === 'super_admin') return true;
    return u.role !== 'super_admin';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Manage Users</h2>
        {pageCanEdit && (
          <Link to="/admin/users/create">
            <Button>Create User</Button>
          </Link>
        )}
      </div>

      <Card>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="search"
            placeholder="Search by name or email..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-sm">{u.role_label}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {u.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit(u) && (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-sm text-brand hover:underline"
                            onClick={() => setEditModal(u)}
                          >
                            Edit
                          </button>
                          {u.status === 'active' ? (
                            <button type="button" className="text-sm text-amber-600 hover:underline" onClick={() => handleDisable(u)}>Disable</button>
                          ) : (
                            <button type="button" className="text-sm text-green-600 hover:underline" onClick={() => handleEnable(u)}>Enable</button>
                          )}
                          <button type="button" className="text-sm text-brand hover:underline" onClick={() => setResetPasswordUser(u)}>Reset Password</button>
                          {u.role !== 'super_admin' && (
                            <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => handleDelete(u)}>Delete</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="py-2 text-sm text-gray-600">Page {meta.current_page} of {meta.last_page}</span>
            <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </Card>

      {editModal && (
        <EditUserModal
          user={editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); fetchUsers(); }}
          canAssignRole={currentUser?.role === 'super_admin'}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onReset={handleResetPassword}
        />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved, canAssignRole }) {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: user.name, email: user.email, role_id: String(user.role_id || ''), status: user.status });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    api.get('/roles').then(({ data }) => setRoles(data.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/users/${user.id}`, { ...form, role_id: form.role_id ? Number(form.role_id) : undefined });
      toast.success('User updated');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = roles.map((r) => ({ value: String(r.id), label: (r.role_name || '').replace(/_/g, ' ') }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Edit User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <FormInput label="Email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          {canAssignRole && (
            <FormSelect
              label="Role"
              options={roleOptions}
              value={form.role_id}
              onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
            />
          )}
          <FormSelect
            label="Status"
            options={[{ value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }]}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose, onReset }) {
  const [password, setPassword] = useState('');
  const [password_confirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== password_confirmation) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    onReset(user.id, password, password_confirmation);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Reset Password</h3>
        <p className="text-sm text-gray-600 mb-4">Set a new password for {user.email}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="New Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <FormInput label="Confirm Password" type="password" required value={password_confirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder="••••••••" />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
