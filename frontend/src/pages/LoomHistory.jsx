import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { Table } from '../components/Table';
import { TablePagination } from '../components/TablePagination';
import { normalizePaginatedResponse } from '../utils/pagination';
import { fetchAllPaginated } from '../utils/pagination';
import { LOOM_INACTIVE_REASONS } from '../constants/loomInactiveReasons';

export function LoomHistoryPage() {
  const [rows, setRows] = useState([]);
  const [looms, setLooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [filters, setFilters] = useState({
    loom_id: '',
    status: '',
    reason: '',
    search: '',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    fetchAllPaginated(api, '/looms-list', { perPage: 200 })
      .then(setLooms)
      .catch(() => {});
  }, []);

  const loadHistory = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: perPage };
    if (filters.loom_id) params.loom_id = filters.loom_id;
    if (filters.status) params.status = filters.status;
    if (filters.reason) params.reason = filters.reason;
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;

    api
      .get('/loom-inactive-histories', { params })
      .then((r) => {
        const p = normalizePaginatedResponse(r.data);
        setRows(p.data || []);
        setMeta({
          current_page: p.current_page,
          last_page: p.last_page,
          per_page: p.per_page,
          total: p.total,
        });
      })
      .catch(() => toast.error('Failed to load loom history'))
      .finally(() => setLoading(false));
  }, [page, perPage, filters]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loomOptions = useMemo(
    () => [
      { value: '', label: 'All looms' },
      ...looms.map((l) => ({ value: String(l.id), label: l.loom_number || `#${l.id}` })),
    ],
    [looms],
  );

  const reasonFilterOptions = useMemo(
    () => [{ value: '', label: 'All reasons' }, ...LOOM_INACTIVE_REASONS.map((r) => ({ value: r, label: r }))],
    [],
  );

  const columns = useMemo(
    () => [
      { key: 'loom_number', label: 'Loom', render: (v) => v || '—' },
      { key: 'previous_status', label: 'Previous status' },
      { key: 'new_status', label: 'New status' },
      { key: 'inactive_reason', label: 'Reason', render: (v) => v || '—' },
      {
        key: 'remarks',
        label: 'Remarks',
        render: (v) => (
          <span className="line-clamp-2 max-w-xs text-gray-700" title={v || ''}>
            {v || '—'}
          </span>
        ),
      },
      { key: 'inactive_from_display', label: 'Inactive from', render: (v) => v || '—' },
      { key: 'inactive_until_display', label: 'Inactive until', render: (v) => v || '—' },
      { key: 'total_downtime', label: 'Total downtime', render: (v) => v || '—' },
      { key: 'changed_by_name', label: 'Changed by', render: (v) => v || '—' },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Loom History</h2>
        <p className="text-sm text-gray-500 mt-0.5">Inactive period audit log for all looms</p>
      </div>

      <Card className="border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <FormSelect
            label="Loom"
            value={filters.loom_id}
            onChange={(e) => setFilters((f) => ({ ...f, loom_id: e.target.value }))}
            options={loomOptions}
            className="!mb-0"
          />
          <FormSelect
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            options={[
              { value: '', label: 'Any status' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
            className="!mb-0"
          />
          <FormSelect
            label="Reason"
            value={filters.reason}
            onChange={(e) => setFilters((f) => ({ ...f, reason: e.target.value }))}
            options={reasonFilterOptions}
            className="!mb-0"
          />
          <FormInput
            label="From date"
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            className="!mb-0"
          />
          <FormInput
            label="To date"
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            className="!mb-0"
          />
          <FormInput
            label="Search"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Reason, remarks, loom…"
            className="!mb-0"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            onClick={() => {
              setPage(1);
              loadHistory();
            }}
          >
            Apply filters
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFilters({ loom_id: '', status: '', reason: '', search: '', date_from: '', date_to: '' });
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      <Card className="border-gray-100 overflow-hidden p-0">
        <Table
          columns={columns}
          data={rows}
          keyField="id"
          isLoading={loading && rows.length === 0}
          emptyMessage={loading ? 'Loading…' : 'No history records.'}
        />
      </Card>

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
    </div>
  );
}

export default LoomHistoryPage;
