import React, { useState, useEffect } from 'react';
import { UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { usePagePermission } from '../../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../../hooks/useRefreshOnSameMenuClick';
import { Card } from '../../components/Card';
import { FormInput, FormSelect } from '../../components/FormInput';
import Button from '../../components/Button';
import { TablePagination } from '../../components/TablePagination';
import { normalizePaginatedResponse } from '../../utils/pagination';
import { GENERIC_CODE_TYPES, FALLBACK_USER_STATUS } from '../../constants/genericCodeTypes';
import { useGenericCode } from '../../hooks/useGenericCode';
import { useAssignableRoleSelectOptions } from '../../hooks/useAssignableRoleSelectOptions';

export function AdminUserList() {
  const { user: currentUser } = useAuth();
  const { canEdit: pageCanEdit } = usePagePermission();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/users', { params: { page, per_page: perPage, search: searchApplied || undefined } })
      .then(({ data }) => {
        const n = normalizePaginatedResponse(data);
        setUsers(n.data);
        setMeta({ current_page: n.current_page, last_page: n.last_page, per_page: n.per_page, total: n.total });
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [page, perPage, searchApplied]);
  useRefreshOnSameMenuClick(fetchUsers);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchApplied(searchInput.trim());
    setPage(1);
  };

  const handleDisable = (u) => {
    if (!window.confirm(`Disable user ${u.username}?`)) return;
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
    if (!window.confirm(`Delete ${u.username}? This cannot be undone.`)) return;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Manage Users</h2>
        {pageCanEdit && (
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setCreateModalOpen(true)}><UserPlus className="w-4 h-4" /> Create User</Button>
        )}
      </div>

      <Card>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="search"
            placeholder="Search by name or username..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>

        <div className="overflow-x-auto min-w-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
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
                    <td className="px-4 py-3 text-sm text-gray-600">{u.username}</td>
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

      {createModalOpen && (
        <CreateUserModal
          currentUser={currentUser}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => { setCreateModalOpen(false); fetchUsers(); }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ currentUser, onClose, onSuccess }) {
  const { options: userStatusOptions } = useGenericCode(GENERIC_CODE_TYPES.USER_STATUS, {
    fallback: FALLBACK_USER_STATUS,
  });
  const { roleSelectOptions: filteredRoleOptions } = useAssignableRoleSelectOptions({
    currentUserRole: currentUser?.role ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    password_confirmation: '',
    role_id: '',
    status: 'active',
  });

  useEffect(() => {
    if (form.role_id === '' && filteredRoleOptions.length > 0) {
      setForm((f) => ({ ...f, role_id: filteredRoleOptions[0].value }));
    }
  }, [filteredRoleOptions.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users', form);
      toast.success('User created successfully');
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : 'Failed to create user');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Create New User</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <p className="text-sm text-gray-600 -mt-2">Create a new system user and assign a role.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormInput label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Username" type="text" required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.trim().replace(/\s+/g, '') }))} placeholder="username" minLength={4} className="!mb-0" title="Min 4 characters, no spaces" />
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
              <FormSelect label="Status" options={userStatusOptions} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="!mb-0" />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? 'Creating...' : 'Create User'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved, canAssignRole }) {
  const { options: userStatusOptions } = useGenericCode(GENERIC_CODE_TYPES.USER_STATUS, {
    fallback: FALLBACK_USER_STATUS,
  });
  const { roleSelectOptions } = useAssignableRoleSelectOptions({
    currentUserRole: 'super_admin',
    enabled: canAssignRole,
  });
  const [form, setForm] = useState({ name: user.name, username: user.username, role_id: String(user.role_id || ''), status: user.status });
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Edit User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <FormInput label="Username" type="text" required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.trim().replace(/\s+/g, '') }))} placeholder="username" minLength={4} title="Min 4 characters, no spaces" />
          {canAssignRole && (
            <FormSelect
              label="Role"
              options={roleSelectOptions}
              value={form.role_id}
              onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
            />
          )}
          <FormSelect
            label="Status"
            options={userStatusOptions}
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
        <p className="text-sm text-gray-600 mb-4">Set a new password for {user.username}</p>
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
