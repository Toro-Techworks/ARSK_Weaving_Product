import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Button from '../../components/Button';
import { Panel, StatCard, formatDateTime } from './shared';

export function ProductOwnerSecurity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/product-owner/security')
      .then((r) => setData(r.data?.data || null))
      .catch(() => toast.error('Failed to load security data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const revokeUser = async (userId, username) => {
    if (!window.confirm(`Revoke all sessions for ${username}?`)) return;
    try {
      await api.post(`/product-owner/users/${userId}/revoke-sessions`);
      toast.success('Sessions revoked');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (loading && !data) {
    return <p className="text-sm text-slate-500">Loading security…</p>;
  }

  const sessions = data?.active_sessions || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Password & session control</h3>
        <p className="text-sm text-slate-500">Monitor active tokens and force logout</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Active API sessions" value={data?.active_session_count ?? 0} tone="info" />
        <StatCard label="Users with sessions" value={data?.users_with_sessions ?? 0} />
      </div>

      <Panel title="Active sessions">
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No active sessions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Token</th>
                  <th className="py-2 pr-3">Last used</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.token_id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-slate-500 text-xs block">{s.username}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-slate-600">{s.token_name || '—'}</td>
                    <td className="py-2.5 pr-3 text-xs">{formatDateTime(s.last_used_at)}</td>
                    <td className="py-2.5 pr-3 text-xs">{formatDateTime(s.created_at)}</td>
                    <td className="py-2.5">
                      <Button type="button" variant="secondary" onClick={() => revokeUser(s.user_id, s.username)}>
                        Force logout
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Security notes">
        <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
          <li>Passwords are stored hashed — existing passwords cannot be viewed.</li>
          <li>Use User Management to reset passwords or generate one-time temporary passwords.</li>
          <li>Force logout revokes all Sanctum tokens for that user.</li>
        </ul>
      </Panel>
    </div>
  );
}
