import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Pencil, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Button from '../../components/Button';
import { FormInput, FormSelect } from '../../components/FormInput';
import { TablePagination } from '../../components/TablePagination';
import { normalizePaginatedResponse } from '../../utils/pagination';
import { GENERIC_CODE_TYPES, FALLBACK_USER_STATUS } from '../../constants/genericCodeTypes';
import { useGenericCode } from '../../hooks/useGenericCode';
import { Panel, RoleBadge, StatusBadge, formatDateTime } from './shared';

export function ProductOwnerUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const { options: statusOptions } = useGenericCode(GENERIC_CODE_TYPES.USER_STATUS, {
    fallback: FALLBACK_USER_STATUS,
  });

  const loadUsers = useCallback(() => {
    setLoading(true);
    api
      .get('/product-owner/users', { params: { page, per_page: perPage, search: search || undefined } })
      .then((r) => {
        const n = normalizePaginatedResponse(r.data);
        setUsers(n.data || []);
        setMeta({
          current_page: n.current_page,
          last_page: n.last_page,
          per_page: n.per_page,
          total: n.total,
        });
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [page, perPage, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    api.get('/product-owner/roles').then((r) => setRoles(r.data?.data || [])).catch(() => {});
  }, []);

  const toggleStatus = async (u) => {
    const next = u.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Set ${u.username} to ${next}?`)) return;
    try {
      await api.put(`/product-owner/users/${u.id}`, { status: next });
      toast.success('Status updated');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const generateTempPassword = async (u) => {
    if (!window.confirm(`Generate a temporary password for ${u.username}?`)) return;
    try {
      const { data } = await api.post(`/product-owner/users/${u.id}/generate-temporary-password`);
      const temp = data?.temporary_password;
      if (temp) {
        window.prompt('Temporary password (copy now — shown once):', temp);
      }
      toast.success(data?.message || 'Temporary password generated');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const forceLogout = async (u) => {
    if (!window.confirm(`Revoke all sessions for ${u.username}?`)) return;
    try {
      await api.post(`/product-owner/users/${u.id}/revoke-sessions`);
      toast.success('Sessions revoked');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">User Management</h3>
          <p className="text-sm text-slate-500">Create, edit, and control ERP accounts</p>
        </div>
        <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4" /> Create user
        </Button>
      </div>

      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadUsers();
          }}
          className="flex flex-col sm:flex-row gap-2 mb-4"
        >
          <input
            type="search"
            placeholder="Search name, username…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Username</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Last login</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="py-2.5 pr-3 font-medium text-slate-900">{u.name}</td>
                    <td className="py-2.5 pr-3 text-slate-700">{u.username}</td>
                    <td className="py-2.5 pr-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={u.status} />
                      {u.force_password_change ? (
                        <span className="ml-1 text-[10px] text-amber-700 font-medium">PWD*</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 text-xs">{formatDateTime(u.last_login_at)}</td>
                    <td className="py-2.5 pr-3 text-slate-600 text-xs">{formatDateTime(u.created_at)}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setEditUser(u)}
                          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-200"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Reset password"
                          onClick={() => setResetUser(u)}
                          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-200"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(u)}
                          className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100"
                        >
                          {u.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
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
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            disabled={loading}
          />
        )}
      </Panel>

      {createOpen ? (
        <UserFormModal
          title="Create user"
          roles={roles}
          statusOptions={statusOptions}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (payload) => {
            await api.post('/product-owner/users', payload);
            toast.success('User created');
            setCreateOpen(false);
            loadUsers();
          }}
        />
      ) : null}

      {editUser ? (
        <UserFormModal
          title="Edit user"
          initial={editUser}
          roles={roles}
          statusOptions={statusOptions}
          onClose={() => setEditUser(null)}
          onSubmit={async (payload) => {
            await api.put(`/product-owner/users/${editUser.id}`, payload);
            toast.success('User updated');
            setEditUser(null);
            loadUsers();
          }}
          extraActions={
            <>
              <Button type="button" variant="secondary" onClick={() => generateTempPassword(editUser)}>
                Generate temp password
              </Button>
              <Button type="button" variant="secondary" onClick={() => forceLogout(editUser)}>
                Force logout
              </Button>
            </>
          }
        />
      ) : null}

      {resetUser ? (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSaved={() => {
            setResetUser(null);
            loadUsers();
          }}
        />
      ) : null}
    </div>
  );
}

function UserFormModal({ title, initial, roles, statusOptions, onClose, onSubmit, extraActions }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    username: initial?.username ?? '',
    designation: initial?.designation ?? '',
    role_id: initial?.role_id ? String(initial.role_id) : roles[0]?.id ? String(roles[0].id) : '',
    status: initial?.status ?? 'active',
    password: '',
    password_confirmation: '',
    force_password_change: initial?.force_password_change ?? false,
  });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim(),
        designation: form.designation.trim() || null,
        role_id: Number(form.role_id),
        status: form.status,
        force_password_change: form.force_password_change,
      };
      if (!isEdit) {
        payload.password = form.password;
        payload.password_confirmation = form.password_confirmation;
      }
      await onSubmit(payload);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Save failed');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const roleOpts = roles.map((r) => ({ value: String(r.id), label: r.label || r.role_name }));

  return (
    <ModalShell title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormInput label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <FormInput
          label="Username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          required
          disabled={isEdit}
        />
        <FormInput
          label="Designation"
          value={form.designation}
          onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
        />
        <FormSelect
          label="Role"
          value={form.role_id}
          onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
          options={roleOpts}
        />
        <FormSelect
          label="Status"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          options={statusOptions}
        />
        {!isEdit ? (
          <>
            <PasswordField
              label="Password"
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            />
            <PasswordField
              label="Confirm password"
              value={form.password_confirmation}
              onChange={(v) => setForm((f) => ({ ...f, password_confirmation: v }))}
            />
          </>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.force_password_change}
            onChange={(e) => setForm((f) => ({ ...f, force_password_change: e.target.checked }))}
          />
          Force password change on next login
        </label>
        {extraActions ? <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">{extraActions}</div> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function ResetPasswordModal({ user, onClose, onSaved }) {
  const [password, setPassword] = useState('');
  const [password_confirmation, setPassword_confirmation] = useState('');
  const [force, setForce] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/product-owner/users/${user.id}/reset-password`, {
        password,
        password_confirmation,
        force_password_change: force,
      });
      toast.success('Password reset');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Reset password — ${user.username}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <PasswordField label="New password" value={password} onChange={setPassword} />
        <PasswordField label="Confirm" value={password_confirmation} onChange={setPassword_confirmation} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Force change on next login
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Reset'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function PasswordField({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm pr-10"
          required
          autoComplete="new-password"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((p) => !p)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h4 className="font-semibold text-slate-900">{title}</h4>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
