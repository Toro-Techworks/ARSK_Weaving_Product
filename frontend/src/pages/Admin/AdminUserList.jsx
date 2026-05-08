import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, UserPlus, X } from 'lucide-react';
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

/** Map legacy API values to current user_status codes. */
function normalizeUserStatusForForm(status) {
  const s = String(status ?? '').trim();
  if (s === 'disabled') return 'inactive';
  return s || 'active';
}

function userStatusBadgeClasses(status) {
  const s = String(status ?? '').trim();
  if (s === 'active') return 'bg-green-100 text-green-800';
  if (s === 'inactive' || s === 'disabled') return 'bg-amber-100 text-amber-800';
  if (s === 'left') return 'bg-slate-200 text-slate-700';
  return 'bg-gray-100 text-gray-700';
}

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

  const handleSetInactive = (u) => {
    if (!window.confirm(`Set user ${u.username} to Inactive?`)) return;
    api.put(`/users/${u.id}`, { status: 'inactive' })
      .then(() => { toast.success('User set to Inactive'); fetchUsers(); })
      .catch(() => toast.error('Failed to update'));
  };

  const handleActivate = (u) => {
    api.put(`/users/${u.id}`, { status: 'active' })
      .then(() => { toast.success('User set to Active'); fetchUsers(); })
      .catch(() => toast.error('Failed to update'));
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
            placeholder="Search by name, username, or designation..."
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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.designation?.trim() ? u.designation : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.username}</td>
                    <td className="px-4 py-3 text-sm">{u.role_label}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${userStatusBadgeClasses(
                          u.status
                        )}`}
                      >
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
                            <button type="button" className="text-sm text-amber-600 hover:underline" onClick={() => handleSetInactive(u)}>Set inactive</button>
                          ) : (
                            <button type="button" className="text-sm text-green-600 hover:underline" onClick={() => handleActivate(u)}>Set active</button>
                          )}
                          <button type="button" className="text-sm text-brand hover:underline" onClick={() => setResetPasswordUser(u)}>Reset Password</button>
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
          canAssignRole={currentUser?.role === 'super_admin' || currentUser?.role === 'admin'}
          currentUserRole={currentUser?.role ?? ''}
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
    designation: '',
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
              <FormInput label="Designation" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} placeholder="e.g. Production Manager" className="!mb-0" />
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

function passwordStrengthBars(password) {
  if (!password) return { filled: 0, strengthLabel: '' };
  if (password.length < 8) {
    return { filled: 0, strengthLabel: '' };
  }
  let n = 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) n++;
  if (/\d/.test(password)) n++;
  if (/[^A-Za-z0-9]/.test(password)) n++;
  if (password.length >= 12) n++;
  const filled = Math.min(4, n);
  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong'][filled - 1] || '';
  return { filled, strengthLabel };
}

function PasswordStrengthMeter({ password }) {
  const { filled, strengthLabel } = passwordStrengthBars(password);
  if (!password) return null;
  const tooShort = password.length < 8;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < filled ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${tooShort ? 'text-amber-600' : 'text-gray-500'}`}>
        {tooShort ? 'Use at least 8 characters' : strengthLabel ? `Strength: ${strengthLabel}` : ''}
      </p>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved, canAssignRole, currentUserRole }) {
  const { options: userStatusOptions } = useGenericCode(GENERIC_CODE_TYPES.USER_STATUS, {
    fallback: FALLBACK_USER_STATUS,
  });
  const { roleSelectOptions } = useAssignableRoleSelectOptions({
    currentUserRole: currentUserRole ?? '',
    enabled: true,
  });
  const [form, setForm] = useState({
    name: user.name,
    designation: user.designation ?? '',
    username: user.username,
    role_id: String(user.role_id || ''),
    status: normalizeUserStatusForForm(user.status),
    password: '',
    password_confirmation: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({
      name: user.name,
      designation: user.designation ?? '',
      username: user.username,
      role_id: String(user.role_id || ''),
      status: normalizeUserStatusForForm(user.status),
      password: '',
      password_confirmation: '',
    });
  }, [user.id, user.name, user.designation, user.username, user.role_id, user.status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pwd = form.password?.trim() ?? '';
    const pwd2 = form.password_confirmation?.trim() ?? '';
    if (pwd || pwd2) {
      if (pwd !== pwd2) {
        toast.error('Passwords do not match');
        return;
      }
      if (!pwd || !pwd2) {
        toast.error('Enter both password fields to change password');
        return;
      }
      if (pwd.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        designation: form.designation?.trim() || null,
        username: form.username,
        status: form.status,
        role_id: form.role_id ? Number(form.role_id) : undefined,
      };
      if (pwd) {
        payload.password = pwd;
        payload.password_confirmation = pwd2;
      }
      await api.put(`/users/${user.id}`, payload);
      toast.success('User updated');
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : err.response?.data?.message || 'Update failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const roleBadge = user.role_label || user.role || 'User';

  const sectionCard = 'rounded-xl border border-gray-100 bg-gray-50/70 p-5 shadow-sm';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-900/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <h2 id="edit-user-title" className="text-xl font-semibold tracking-tight text-gray-900">
              Edit User
            </h2>
            <p className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                {roleBadge}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6 space-y-6">
            <section className={sectionCard} aria-labelledby="edit-section-basic">
              <h3 id="edit-section-basic" className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Basic info
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormInput
                  label="Name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="!mb-0"
                />
                <FormInput
                  label="Username"
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.trim().replace(/\s+/g, '') }))}
                  placeholder="username"
                  minLength={4}
                  title="Min 4 characters, no spaces"
                  className="!mb-0"
                />
                <div className="md:col-span-2">
                  <FormInput
                    label="Designation"
                    value={form.designation}
                    onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                    placeholder="e.g. Production Manager"
                    className="!mb-0"
                  />
                </div>
              </div>
            </section>

            <section className={sectionCard} aria-labelledby="edit-section-access">
              <h3 id="edit-section-access" className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Access control
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-end">
                <div className="space-y-1.5">
                  {canAssignRole ? (
                    <FormSelect
                      label="Role"
                      options={roleSelectOptions}
                      value={form.role_id}
                      onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                      className="!mb-0"
                    />
                  ) : (
                    <>
                      <span className="block text-sm font-medium text-gray-700">Role</span>
                      <p className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900">
                        {roleBadge}
                      </p>
                    </>
                  )}
                </div>
                <FormSelect
                  label="Status"
                  options={userStatusOptions}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="!mb-0"
                />
              </div>
            </section>

            <section
              className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50/90 to-white p-5 shadow-sm ring-1 ring-gray-100/80"
              aria-labelledby="edit-section-security"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900/5 text-gray-700">
                  <Lock className="h-4 w-4" aria-hidden />
                </span>
                <h3 id="edit-section-security" className="text-sm font-semibold text-gray-900">
                  Security settings
                </h3>
              </div>
              <p className="mb-4 text-sm text-gray-500">Leave blank to keep current password.</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <PasswordFieldWithToggle
                    id={`edit-user-pw-${user.id}`}
                    label="New password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                    inputClassName="rounded-xl"
                  />
                  <PasswordStrengthMeter password={form.password} />
                </div>
                <PasswordFieldWithToggle
                  id={`edit-user-pw2-${user.id}`}
                  label="Confirm password"
                  value={form.password_confirmation}
                  onChange={(e) => setForm((f) => ({ ...f, password_confirmation: e.target.value }))}
                  autoComplete="new-password"
                  inputClassName="rounded-xl"
                />
              </div>
            </section>
          </div>

          <footer className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-3 text-base font-semibold shadow-md shadow-brand/25 sm:w-auto sm:min-w-[10rem]"
            >
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function PasswordFieldWithToggle({
  id,
  label,
  value,
  onChange,
  autoComplete = 'new-password',
  required = false,
  inputClassName = '',
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className={`w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 ${inputClassName}`}
          placeholder="••••••••"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Reset Password</h3>
        <p className="text-sm text-gray-600 mb-4">Set a new password for {user.username}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordFieldWithToggle
            id={`reset-pw-${user.id}`}
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <PasswordFieldWithToggle
            id={`reset-pw2-${user.id}`}
            label="Confirm Password"
            value={password_confirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            autoComplete="new-password"
            required
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
