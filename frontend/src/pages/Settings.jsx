import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import Button from '../components/Button';
import { User } from 'lucide-react';

export function Profile() {
  const { user } = useAuth();
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile</h2>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="flex-shrink-0 w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="w-10 h-10 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0 space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Account details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-0.5 text-base text-gray-900">{user?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-0.5 text-base text-gray-900">{user?.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-0.5 text-base text-gray-900">{user?.role_label ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-0.5 text-base text-gray-900">{user?.status_label ?? user?.status ?? '—'}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetch = () => {
    setLoading(true);
    api.get('/users', { params: { page, per_page: 15 } })
      .then(({ data: res }) => { setUsers(res.data); setMeta(res.meta || {}); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [page]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">User Management</h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.role_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
