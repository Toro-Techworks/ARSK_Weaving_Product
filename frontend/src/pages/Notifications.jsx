import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { TablePagination } from '../components/TablePagination';
import { normalizePaginatedResponse } from '../utils/pagination';
import { formatRelativeTime } from '../utils/relativeTime';

const REFRESH_MS = 20_000;

function formatModule(module) {
  if (!module) return '—';
  return module
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

const ACTION_LABEL = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

function ActionBadge({ action }) {
  const a = String(action || '').toLowerCase();
  const styles = {
    create: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
    update: 'bg-blue-50 text-blue-800 ring-blue-600/20',
    delete: 'bg-red-50 text-red-800 ring-red-600/20',
  };
  const label = ACTION_LABEL[a] || (action ? String(action).charAt(0).toUpperCase() + String(action).slice(1).toLowerCase() : '—');
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${styles[a] || 'bg-gray-50 text-gray-700 ring-gray-200'}`}
    >
      {label}
    </span>
  );
}

export function NotificationsPage() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(
    (silent) => {
      if (!silent) setLoading(true);
      api
        .get('/notifications', { params: { page, per_page: perPage } })
        .then(({ data: res }) => {
          const n = normalizePaginatedResponse(res);
          setData(n.data);
          setMeta({
            current_page: n.current_page,
            last_page: n.last_page,
            per_page: n.per_page,
            total: n.total,
          });
        })
        .catch(() => {
          if (!silent) toast.error('Failed to load notifications');
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [page, perPage]
  );

  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  useEffect(() => {
    const id = window.setInterval(() => fetchLogs(true), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [fetchLogs]);

  useEffect(() => {
    api
      .post('/notifications/mark-read')
      .then(() => {
        window.dispatchEvent(new CustomEvent('app-notifications-marked-read'));
      })
      .catch(() => {});
  }, []);

  const columns = [
    {
      key: 'actor_name',
      label: 'Actor',
      render: (v, row) => (
        <span className="text-gray-900 font-medium">{v || row?.user_name || '—'}</span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (v) => <ActionBadge action={v} />,
    },
    {
      key: 'module',
      label: 'Module',
      render: (v) => <span className="text-gray-700">{formatModule(v)}</span>,
    },
    {
      key: 'record_id',
      label: 'Record',
      render: (v) => <span className="text-gray-600 tabular-nums">{v != null ? String(v) : '—'}</span>,
    },
    { key: 'description', label: 'Description', render: (v) => <span className="text-gray-700">{v || '—'}</span> },
    {
      key: 'created_at',
      label: 'Time',
      render: (v) => <span className="text-gray-500 text-sm whitespace-nowrap">{formatRelativeTime(v)}</span>,
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600 shrink-0" aria-hidden />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Notifications</h2>
        </div>
        <p className="text-xs text-gray-500 sm:text-right">Activity log · auto-refresh every {REFRESH_MS / 1000}s</p>
      </div>
      <Card>
        <Table columns={columns} data={data} isLoading={loading} emptyMessage="No activity yet." />
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
      </Card>
    </div>
  );
}
