import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { FormInput, FormSelect } from '../components/FormInput';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { Download } from 'lucide-react';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';

function downloadBlob(blob, filename, type = blob.type || 'application/octet-stream') {
  const url = window.URL.createObjectURL(new Blob([blob], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function OrderSummaryReport() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ total_orders: 0 });
  const [meta, setMeta] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [orderFrom, setOrderFrom] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const perPage = 50;

  useEffect(() => {
    api.get('/companies-list').then(({ data: res }) => setCompanies(res?.data || [])).catch(() => {});
  }, []);

  const generate = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const res = await api.get('/reports/order-summary', {
        params: {
          date_from: from || undefined,
          date_to: to || undefined,
          order_from: orderFrom || undefined,
          page: pageNum,
          per_page: perPage,
        },
      });
      const rows = (res.data?.data || []).map((r) => ({
        ...r,
        row_key: `${r.date || ''}|${r.order_from ?? '-'}`,
      }));
      setData(rows);
      setSummary(res.data?.summary || { total_orders: 0 });
      setMeta(res.data?.meta || null);
    } catch {
      toast.error('Failed to load order summary');
    } finally {
      setLoading(false);
    }
  }, [from, to, orderFrom]);

  useEffect(() => {
    if (from && to) generate(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useRefreshOnSameMenuClick(() => generate(page));

  const columns = [
    { key: 'date', label: 'Date', render: (v) => v || '-' },
    { key: 'order_from', label: 'Order From', render: (v) => v || '-' },
    { key: 'total_orders', label: 'Total Orders', render: (v) => Number(v ?? 0).toLocaleString() },
  ];

  const chartData = useMemo(() => {
    const m = new Map();
    data.forEach((r) => m.set(r.date, (m.get(r.date) || 0) + Number(r.total_orders || 0)));
    return Array.from(m.entries())
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([date, total]) => ({ date, total }));
  }, [data]);

  const exportExcel = async () => {
    try {
      const res = await api.get('/reports/order-summary/excel', {
        params: { date_from: from, date_to: to, order_from: orderFrom || undefined },
        responseType: 'blob',
      });
      downloadBlob(res.data, 'order-summary-report.csv', res.headers['content-type']);
    } catch {
      toast.error('Excel export failed');
    }
  };

  const exportPdf = async () => {
    try {
      const res = await api.get('/reports/order-summary/pdf', {
        params: { date_from: from, date_to: to, order_from: orderFrom || undefined },
        responseType: 'blob',
      });
      downloadBlob(res.data, 'order-summary-report.pdf', res.headers['content-type']);
    } catch {
      toast.error('PDF export failed');
    }
  };

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.company_name, label: c.company_name })),
    [companies]
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Order Summary</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportExcel} disabled={loading} className="gap-2">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
          <Button onClick={exportPdf} disabled={loading} className="gap-2">
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormInput type="date" label="From Date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <FormInput type="date" label="To Date" value={to} onChange={(e) => setTo(e.target.value)} />
          <FormSelect
            label="Order From"
            value={orderFrom}
            onChange={(e) => setOrderFrom(e.target.value)}
            options={companyOptions}
            emptyLabel="All"
          />
          <div className="flex items-end">
            <Button
              onClick={() => {
                if (page !== 1) setPage(1);
                else generate(1);
              }}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <p className="text-gray-600">
          Total Orders: <strong>{Number(summary.total_orders ?? 0).toLocaleString()}</strong>
        </p>
      </Card>

      <Card title="Report">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
            </div>
          ) : (
            <Table columns={columns} data={data} keyField="row_key" emptyMessage="No data found." />
          )}
        </div>
      </Card>

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <Card title="Orders vs Date" className="mt-4">
          <div className="flex items-end gap-2 h-40 mt-1 overflow-x-auto pb-1">
            {chartData.map((d) => {
              const max = Math.max(...chartData.map((x) => x.total), 1);
              return (
                <div key={d.date} className="flex-1 min-w-[50px] flex flex-col items-center">
                  <div className="w-full bg-brand rounded-t" style={{ height: `${(d.total / max) * 100}%`, minHeight: 4 }} />
                  <span className="text-xs text-gray-500 mt-1 truncate max-w-full">{d.date}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export function LoomEfficiencyReport() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loomId, setLoomId] = useState('');
  const [looms, setLooms] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const perPage = 50;

  const generate = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const res = await api.get('/reports/loom-efficiency', {
        params: {
          date_from: from,
          date_to: to,
          loom_id: loomId || undefined,
          page: pageNum,
          per_page: perPage,
        },
      });
      const rows = (res.data?.looms || []).map((r) => ({ ...r, row_key: String(r.loom_id) }));
      setData(rows);
      setMeta(res.data?.meta || null);
    } catch {
      toast.error('Failed to load loom efficiency');
    } finally {
      setLoading(false);
    }
  }, [from, to, loomId]);

  useEffect(() => {
    api.get('/looms-list').then(({ data: res }) => setLooms(res?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (from && to) generate(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useRefreshOnSameMenuClick(() => generate(page));

  const columns = [
    { key: 'loom_number', label: 'Loom', render: (v) => v || '-' },
    { key: 'net_production', label: 'Net Production (m)', render: (v) => Number(v ?? 0).toLocaleString() },
    { key: 'efficiency_percentage', label: 'Efficiency %', render: (v) => (v != null ? `${v}%` : '-') },
    { key: 'days_worked', label: 'Days Worked', render: (v) => Number(v ?? 0) },
  ];

  const exportExcel = async () => {
    try {
      const res = await api.get('/reports/loom-efficiency/excel', {
        params: { date_from: from, date_to: to, loom_id: loomId || undefined },
        responseType: 'blob',
      });
      downloadBlob(res.data, 'loom-efficiency-report.csv', res.headers['content-type']);
    } catch {
      toast.error('Excel export failed');
    }
  };

  const exportPdf = async () => {
    try {
      const res = await api.get('/reports/loom-efficiency/pdf', {
        params: { date_from: from, date_to: to, loom_id: loomId || undefined },
        responseType: 'blob',
      });
      downloadBlob(res.data, 'loom-efficiency-report.pdf', res.headers['content-type']);
    } catch {
      toast.error('PDF export failed');
    }
  };

  const loomOptions = useMemo(
    () => looms.map((l) => ({ value: String(l.id), label: l.loom_number })),
    [looms]
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Loom Efficiency</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportExcel} disabled={loading} className="gap-2">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
          <Button onClick={exportPdf} disabled={loading} className="gap-2">
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormInput type="date" label="From Date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <FormInput type="date" label="To Date" value={to} onChange={(e) => setTo(e.target.value)} />
          <FormSelect label="Loom" value={loomId} onChange={(e) => setLoomId(e.target.value)} options={loomOptions} emptyLabel="All" />
          <div className="flex items-end">
            <Button
              onClick={() => {
                if (page !== 1) setPage(1);
                else generate(1);
              }}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Report">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
            </div>
          ) : (
            <Table columns={columns} data={data} keyField="row_key" emptyMessage="No data found." />
          )}
        </div>
      </Card>

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
