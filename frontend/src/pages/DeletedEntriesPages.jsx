import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput } from '../components/FormInput';
import { TablePagination } from '../components/TablePagination';
import { TableSkeleton } from '../components/Skeleton';
import { normalizePaginatedResponse } from '../utils/pagination';
import { formatOrderId } from '../utils/formatOrderId';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Archive } from 'lucide-react';

const linkSecondaryClass =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400 text-sm';

function formatDeletedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
}

const restoreBtnClass =
  'text-brand hover:underline text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed';

function DeletedListPage({
  title,
  backHref,
  backLabel,
  apiPath,
  searchPlaceholder,
  columns,
  emptyMessage,
  restoreApiPrefix = null,
}) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  const fetch = () => {
    setLoading(true);
    api
      .get(apiPath, { params: { page, per_page: perPage, search: search || undefined } })
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
      .catch(() => toast.error('Failed to load deleted entries'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, [page, perPage]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page === 1) fetch();
      else setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useRefreshOnSameMenuClick(fetch);

  const handleRestore = (id) => {
    if (!restoreApiPrefix || restoringId != null) return;
    setRestoringId(id);
    api
      .post(`${restoreApiPrefix}/${id}/restore`)
      .then(() => {
        toast.success('Restored');
        fetch();
      })
      .catch((e) => toast.error(e.response?.data?.message || 'Restore failed'))
      .finally(() => setRestoringId(null));
  };

  const displayColumns = restoreApiPrefix
    ? [
        ...columns,
        {
          key: '_actions',
          label: 'Actions',
          render: (_, row) => (
            <button
              type="button"
              className={restoreBtnClass}
              disabled={loading || restoringId != null}
              onClick={() => handleRestore(row.id)}
            >
              {restoringId === row.id ? 'Restoring…' : 'Restore'}
            </button>
          ),
        },
      ]
    : columns;

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <Link to={backHref} className={`${linkSecondaryClass} w-full sm:w-fit`}>
          <ArrowLeft className="w-4 h-4 shrink-0" />
          {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          <Archive className="w-6 h-6 text-gray-500 shrink-0" aria-hidden />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
        </div>
      </div>
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <FormInput
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-xs"
          />
        </div>
        <Table columns={displayColumns} data={data} isLoading={loading} emptyMessage={emptyMessage} />
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
            disabled={loading || restoringId != null}
          />
        )}
      </Card>
    </div>
  );
}

export function DeletedCompaniesPage() {
  const { user } = useAuth();
  const canPurge = user?.role === 'super_admin';
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [purging, setPurging] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const selectAllRef = useRef(null);

  const apiPath = '/companies/trashed';
  const restoreApiPrefix = '/companies/trashed';

  const fetch = () => {
    setLoading(true);
    api
      .get(apiPath, { params: { page, per_page: perPage, search: search || undefined } })
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
      .catch(() => toast.error('Failed to load deleted entries'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, [page, perPage]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page === 1) fetch();
      else setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useRefreshOnSameMenuClick(fetch);

  const idsOnPage = useMemo(() => data.map((r) => r.id).filter((id) => id != null), [data]);

  const allOnPageSelected =
    canPurge && idsOnPage.length > 0 && idsOnPage.every((id) => selectedIds.has(id));
  const someOnPageSelected = canPurge && idsOnPage.some((id) => selectedIds.has(id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) {
      el.indeterminate = someOnPageSelected && !allOnPageSelected;
    }
  }, [someOnPageSelected, allOnPageSelected, loading, data]);

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        idsOnPage.forEach((id) => next.delete(id));
      } else {
        idsOnPage.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const permanentDelete = () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const n = ids.length;
    if (
      !window.confirm(
        `Permanently delete ${n} compan${n === 1 ? 'y' : 'ies'}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setPurging(true);
    api
      .post('/companies/trashed/permanent-delete', { ids })
      .then(() => {
        toast.success('Selected companies permanently deleted');
        setSelectedIds(new Set());
        fetch();
      })
      .catch((e) => toast.error(e.response?.data?.message || 'Permanent delete failed'))
      .finally(() => setPurging(false));
  };

  const hasSelection = selectedIds.size > 0;

  const restoreOne = (id) => {
    if (restoringId != null || purging) return;
    setRestoringId(id);
    api
      .post(`${restoreApiPrefix}/${id}/restore`)
      .then(() => {
        toast.success('Company restored');
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        fetch();
      })
      .catch((e) => toast.error(e.response?.data?.message || 'Restore failed'))
      .finally(() => setRestoringId(null));
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <Link to="/companies" className={`${linkSecondaryClass} w-full sm:w-fit`}>
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Back to company list
        </Link>
        <div className="flex items-center gap-2">
          <Archive className="w-6 h-6 text-gray-500 shrink-0" aria-hidden />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Deleted companies</h2>
        </div>
      </div>
      <Card>
        <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-start lg:justify-between">
          <FormInput
            placeholder="Search company or GST…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-xs"
          />
          {canPurge && (
            <Button
              type="button"
              variant="danger"
              className="w-full lg:w-auto lg:shrink-0 lg:self-start"
              disabled={!hasSelection || purging || loading || restoringId != null}
              onClick={permanentDelete}
            >
              {purging ? 'Deleting…' : 'Delete permanently'}
            </Button>
          )}
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={canPurge ? 7 : 6} />
        ) : !data.length ? (
          <p className="text-gray-500 py-8 text-center">No deleted companies.</p>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {canPurge && (
                    <th className="px-4 py-3 text-left w-12 bg-gray-50">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        disabled={restoringId != null || purging}
                        className="rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-50"
                        aria-label="Select all companies on this page"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Company Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    GST No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Deleted date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {canPurge && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          disabled={restoringId != null || purging}
                          className="rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-50"
                          aria-label={`Select ${row.company_name || 'company'}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-900">{row.company_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.contact_person || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.gst_number || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDeletedAt(row.deleted_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className={restoreBtnClass}
                        disabled={loading || purging || restoringId != null}
                        onClick={() => restoreOne(row.id)}
                      >
                        {restoringId === row.id ? 'Restoring…' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
            disabled={loading || purging || restoringId != null}
          />
        )}
      </Card>
    </div>
  );
}

export function DeletedWeavingUnitsPage() {
  const columns = [
    { key: 'company_name', label: 'Weaving Unit Name' },
    { key: 'contact_person', label: 'Contact' },
    { key: 'gst_number', label: 'GST No.' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'deleted_at',
      label: 'Deleted date',
      render: (v) => formatDeletedAt(v),
    },
  ];
  return (
    <DeletedListPage
      title="Deleted weaving units"
      backHref="/admin/weaving-units"
      backLabel="Back to weaving unit list"
      apiPath="/weaving-units/trashed"
      restoreApiPrefix="/weaving-units/trashed"
      searchPlaceholder="Search weaving unit or GST…"
      columns={columns}
      emptyMessage="No deleted weaving units."
    />
  );
}

export function DeletedWindingUnitsPage() {
  const columns = [
    { key: 'company_name', label: 'Winding Unit Name' },
    { key: 'contact_person', label: 'Contact' },
    { key: 'gst_number', label: 'GST No.' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'deleted_at',
      label: 'Deleted date',
      render: (v) => formatDeletedAt(v),
    },
  ];
  return (
    <DeletedListPage
      title="Deleted winding units"
      backHref="/admin/winding-units"
      backLabel="Back to winding unit list"
      apiPath="/winding-units/trashed"
      restoreApiPrefix="/winding-units/trashed"
      searchPlaceholder="Search winding unit or GST…"
      columns={columns}
      emptyMessage="No deleted winding units."
    />
  );
}

export function DeletedWeaversPage() {
  const columns = [
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'weaver_name', label: 'Weaver Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
    {
      key: 'deleted_at',
      label: 'Deleted date',
      render: (v) => formatDeletedAt(v),
    },
  ];
  return (
    <DeletedListPage
      title="Deleted weavers"
      backHref="/admin/weavers"
      backLabel="Back to weaver list"
      apiPath="/weavers/trashed"
      restoreApiPrefix="/weavers/trashed"
      searchPlaceholder="Search by name, code, phone…"
      columns={columns}
      emptyMessage="No deleted weavers."
    />
  );
}

export function DeletedOrdersPage() {
  const columns = [
    {
      key: 'id',
      label: 'Order Id',
      render: (_, row) => (row.id ? formatOrderId({ id: row.id, created_at: row.created_at }) : '—'),
    },
    { key: 'order_from', label: 'Order From', render: (v) => v || '—' },
    { key: 'customer', label: 'Customer', render: (v) => v || '—' },
    { key: 'weaving_unit', label: 'Weaving Unit', render: (v) => v || '—' },
    { key: 'po_number', label: 'P.O Number', render: (v) => v || '—' },
    { key: 'po_date', label: 'PO Date', render: (v) => v || '—' },
    { key: 'delivery_date', label: 'Delivery Date', render: (v) => v || '—' },
    {
      key: 'deleted_at',
      label: 'Deleted date',
      render: (v) => formatDeletedAt(v),
    },
  ];
  return (
    <DeletedListPage
      title="Deleted orders"
      backHref="/orders"
      backLabel="Back to orders"
      apiPath="/yarn-orders/trashed"
      restoreApiPrefix="/yarn-orders/trashed"
      searchPlaceholder="Search order id, PO, customer…"
      columns={columns}
      emptyMessage="No deleted orders."
    />
  );
}
