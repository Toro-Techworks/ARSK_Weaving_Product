import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { Table } from '../components/Table';
import { Download, BarChart3 } from 'lucide-react';

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

function BarChart({ data }) {
  const safe = data || [];
  const maxY = Math.max(...safe.map((d) => d.value ?? 0), 1);
  return (
    <div className="flex items-end gap-3 overflow-x-auto pb-2">
      {safe.map((d) => (
        <div key={d.key} className="min-w-[64px] flex flex-col items-center gap-2">
          <div
            className="w-[52px] bg-brand rounded-t"
            style={{ height: `${Math.round(((d.value ?? 0) / maxY) * 160)}px` }}
          />
          <div className="text-[11px] text-gray-500 text-center truncate w-[64px]">
            {d.key}
          </div>
        </div>
      ))}
    </div>
  );
}

export function YarnConsumptionReportPage() {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [yarnType, setYarnType] = useState('');
  const [count, setCount] = useState('');

  const [yarnOptions, setYarnOptions] = useState({ yarn_types: [], counts: [] });
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;
  const didInit = useRef(false);

  const fetchOptions = useCallback(async () => {
    const res = await api.get('/reports/yarn-consumption/options').catch(() => ({ data: { yarn_types: [], counts: [] } }));
    setYarnOptions(res.data || { yarn_types: [], counts: [] });
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/yarn-consumption', {
        params: {
          date_from: from || undefined,
          date_to: to || undefined,
          yarn_type: yarnType || undefined,
          count: count || undefined,
          per_page: perPage,
          page,
        },
      });
      const items = res.data?.data || [];
      const withKey = items.map((r) => ({ ...r, row_key: `${r.date || ''}-${r.yarn_type || ''}-${r.count || ''}` }));
      setData(withKey);
      setMeta(res.data?.meta || null);
    } catch (e) {
      toast.error('Failed to load yarn consumption report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (from && to && !didInit.current) {
      generate().finally(() => { didInit.current = true; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didInit.current) return;
    if (from && to) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const chartData = useMemo(() => {
    const map = new Map();
    (data || []).forEach((row) => {
      const key = row.yarn_type || '-';
      map.set(key, (map.get(key) || 0) + Number(row.consumed_qty || 0));
    });
    return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
  }, [data]);

  const columns = [
    { key: 'yarn_type', label: 'Yarn', render: (v) => v || '-' },
    { key: 'count', label: 'Count', render: (v) => v || '-' },
    { key: 'issued_qty', label: 'Issued', render: (v) => Number(v ?? 0).toLocaleString() },
    { key: 'consumed_qty', label: 'Consumed', render: (v) => Number(v ?? 0).toLocaleString() },
    { key: 'balance', label: 'Balance', render: (v) => Number(v ?? 0).toLocaleString() },
    { key: 'waste', label: 'Waste', render: (v) => Number(v ?? 0).toLocaleString() },
  ];

  const exportExcel = async () => {
    try {
      const res = await api.get('/reports/yarn-consumption/excel', {
        params: { date_from: from, date_to: to, yarn_type: yarnType || undefined, count: count || undefined },
        responseType: 'blob',
      });
      downloadBlob(res.data, 'yarn-consumption-report.csv', res.headers['content-type']);
    } catch (e) {
      toast.error('Excel export failed');
    }
  };

  const exportPdf = async () => {
    try {
      const res = await api.get('/reports/yarn-consumption/pdf', {
        params: { date_from: from, date_to: to, yarn_type: yarnType || undefined, count: count || undefined },
        responseType: 'blob',
      });
      downloadBlob(res.data, 'yarn-consumption-report.pdf', res.headers['content-type']);
    } catch (e) {
      toast.error('PDF export failed');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Yarn Consumption Report</h2>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <FormInput type="date" label="From Date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <FormInput type="date" label="To Date" value={to} onChange={(e) => setTo(e.target.value)} />
          <FormSelect
            label="Yarn Type"
            value={yarnType}
            onChange={(e) => setYarnType(e.target.value)}
            options={yarnOptions.yarn_types.map((t) => ({ value: String(t), label: String(t) }))}
            emptyLabel="All"
          />
          <FormSelect
            label="Count"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            options={yarnOptions.counts.map((c) => ({ value: String(c), label: String(c) }))}
            emptyLabel="All"
          />
          <div className="flex items-end">
            <Button
              onClick={() => {
                if (page !== 1) setPage(1);
                else generate();
              }}
              disabled={loading}
              className="gap-2 w-full"
            >
              <BarChart3 className="w-4 h-4" /> {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4">
        <Card title="Report">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" /></div>
            ) : (
              <Table columns={columns} data={data} keyField="row_key" emptyMessage="No yarn consumption data found." />
            )}
          </div>
        </Card>
      </div>

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

      <Card title="Consumption by Yarn Type" className="mt-4">
        {chartData.length ? <BarChart data={chartData} /> : <p className="text-gray-500">No chart data.</p>}
      </Card>
    </div>
  );
}

export default YarnConsumptionReportPage;

