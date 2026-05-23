import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { StatCard, Panel, formatDateTime } from './shared';

export function ProductOwnerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/product-owner/dashboard')
      .then((r) => setData(r.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading overview…</p>;
  }

  const d = data || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users" value={d.total_users ?? 0} tone="info" />
        <StatCard label="Active" value={d.active_users ?? 0} tone="success" />
        <StatCard label="Inactive / left" value={(d.inactive_users ?? 0) + (d.left_users ?? 0)} tone="warn" />
        <StatCard label="Active sessions" value={d.active_sessions ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Quick actions" className="lg:col-span-1">
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/product-owner/users" className="text-blue-600 hover:text-blue-800 font-medium">
                Manage users →
              </Link>
            </li>
            <li>
              <Link to="/product-owner/security" className="text-blue-600 hover:text-blue-800 font-medium">
                Security & sessions →
              </Link>
            </li>
            <li>
              <Link to="/product-owner/logs" className="text-blue-600 hover:text-blue-800 font-medium">
                View audit logs →
              </Link>
            </li>
          </ul>
          <p className="text-[11px] text-slate-500 mt-4">
            {d.force_password_change ?? 0} user(s) flagged for mandatory password change.
          </p>
        </Panel>
        <Panel title="Recent product owner activity" className="lg:col-span-2">
          {(d.recent_audit || []).length === 0 ? (
            <p className="text-sm text-slate-500">No audit entries yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recent_audit.map((row) => (
                <li key={row.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 uppercase">{row.action}</span>
                    <p className="text-sm text-slate-600 mt-0.5">{row.description || '—'}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{formatDateTime(row.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
