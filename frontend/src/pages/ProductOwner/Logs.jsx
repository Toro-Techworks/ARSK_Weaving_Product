import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import { TablePagination } from '../../components/TablePagination';
import { normalizePaginatedResponse } from '../../utils/pagination';
import { Panel, formatDateTime } from './shared';

const ACTION_LABELS = {
  user_created: 'User created',
  user_updated: 'User updated',
  password_reset: 'Password reset',
  temporary_password_generated: 'Temp password',
  role_changed: 'Role changed',
  account_disabled: 'Account disabled',
  account_enabled: 'Account enabled',
  force_password_change: 'Force password change',
  sessions_revoked: 'Sessions revoked',
};

export function ProductOwnerLogs() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/product-owner/logs', { params: { page, per_page: perPage, search: search || undefined } })
      .then((r) => {
        const n = normalizePaginatedResponse(r.data);
        setRows(n.data || []);
        setMeta({
          current_page: n.current_page,
          last_page: n.last_page,
          per_page: n.per_page,
          total: n.total,
        });
      })
      .finally(() => setLoading(false));
  }, [page, perPage, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Security logs</h3>
        <p className="text-sm text-slate-500">Product owner actions audit trail</p>
      </div>

      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
          className="flex gap-2 mb-4"
        >
          <input
            type="search"
            placeholder="Search action, user, description…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium">
            Search
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Target</th>
                <th className="py-2 pr-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No log entries.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-3 text-xs text-slate-600 whitespace-nowrap">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="text-xs font-semibold text-slate-800">
                        {ACTION_LABELS[row.action] || row.action}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-700">{row.description || '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-600 text-xs">{row.target_name || '—'}</td>
                    <td className="py-2.5 text-xs text-slate-500 font-mono">{row.ip_address || '—'}</td>
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
    </div>
  );
}
