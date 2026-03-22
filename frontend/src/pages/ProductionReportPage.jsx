import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { Table } from '../components/Table';
import { formatOrderId } from '../utils/formatOrderId';
import { fetchAllPaginated } from '../utils/pagination';
import { LineChart as LineChartIcon, Download } from 'lucide-react';

function LineChart({ points }) {
  const safe = points?.length ? points : [];
  const maxY = Math.max(...safe.map((p) => p.y ?? 0), 1);
  const minY = Math.min(...safe.map((p) => p.y ?? 0), 0);
  const span = Math.max(maxY - minY, 1e-9);

  const w = 700;
  const h = 180;
  const pad = 18;

  const toX = (i) => {
    if (safe.length <= 1) return pad;
    return pad + ((w - pad * 2) * i) / (safe.length - 1);
  };
  const toY = (y) => {
    const norm = (y - minY) / span;
    return h - pad - norm * (h - pad * 2);
  };

  const d = safe
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(2)} ${toY(p.y).toFixed(2)}`)
    .join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-[700px] h-[180px]">
        <polyline points={safe.map((p, i) => `${toX(i)},${toY(p.y)}`).join(' ')} fill="none" stroke="#7c3aed" strokeWidth="2" />
        <path d={d} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
        {safe.map((p, i) => (
          <g key={p.x}>
            <circle cx={toX(i)} cy={toY(p.y)} r="3.5" fill="#7c3aed" />
          </g>
        ))}
      </svg>
    </div>
  );
}

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

export function ProductionReportPage() {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loomId, setLoomId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [shift, setShift] = useState('');

  const [looms, setLooms] = useState([]);
  const [orders, setOrders] = useState([]);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;
  const didInit = useRef(false);

  const fetchOptions = useCallback(async () => {
    const [loomList, orderList] = await Promise.all([
      api.get('/looms-list').then((r) => r?.data?.data || []).catch(() => []),
      fetchAllPaginated(api, '/yarn-orders', { perPage: 200 }).catch(() => []),
    ]);
    setLooms(loomList);
    setOrders(orderList);
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const orderOptions = useMemo(
    () => orders.map((o) => ({ value: String(o.id), label: formatOrderId(o) })),
    [orders]
  );

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/production', {
        params: {
          date_from: from || undefined,
          date_to: to || undefined,
          loom_id: loomId || undefined,
          order_id: orderId || undefined,
          shift: shift || undefined,
          per_page: perPage,
          page,
        },
      });
      const items = res.data?.data || [];
      const withKey = items.map((r) => ({
        ...r,
        row_key: `${r.date || ''}-${r.loom_id || ''}-${r.order_id || ''}-${r.shift || ''}`,
      }));
      setData(withKey);
      setMeta(res.data?.meta || null);
    } catch (e) {
      toast.error('Failed to load production report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (from && to) {
      setPage(1);
      generate();
      didInit.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Regenerate when page changes (but only after initial mount).
    if (!didInit.current) return;
    if (from && to) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const chartPoints = useMemo(() => {
    const map = new Map();
    (data || []).forEach((row) => {
      const key = row.date;
      map.set(key, (map.get(key) || 0) + Number(row.production_meters || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([x, y]) => ({ x, y }));
  }, [data]);

  const columns = [
    { key: 'date', label: 'Date', render: (v) => v || '-' },
    { key: 'loom_number', label: 'Loom', render: (v) => v || '-' },
    {
      key: 'order_id',
      label: 'Order',
      render: (v) => (v ? formatOrderId(v) : '-'),
    },
    { key: 'production_meters', label: 'Production', render: (v) => Number(v ?? 0).toLocaleString() },
    { key: 'efficiency_percentage', label: 'Efficiency', render: (v) => (v != null ? `${Number(v).toFixed(2)}%` : '-') },
  ];

  const exportExcel = async () => {
    try {
      const res = await api.get('/reports/production/excel', {
        params: { date_from: from, date_to: to, loom_id: loomId || undefined, order_id: orderId || undefined, shift: shift || undefined },
        responseType: 'blob',
      });
      downloadBlob(res.data, 'production-report.csv', res.headers['content-type']);
    } catch (e) {
      toast.error('Excel export failed');
    }
  };

  const exportPdf = async () => {
    try {
      const res = await api.get('/reports/production/pdf', {
        params: { date_from: from, date_to: to, loom_id: loomId || undefined, order_id: orderId || undefined, shift: shift || undefined },
        responseType: 'blob',
      });
      downloadBlob(res.data, 'production-report.pdf', res.headers['content-type']);
    } catch (e) {
      toast.error('PDF export failed');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Production Report</h2>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <FormInput type="date" label="From Date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <FormInput type="date" label="To Date" value={to} onChange={(e) => setTo(e.target.value)} />
          <FormSelect label="Loom" value={loomId} onChange={(e) => setLoomId(e.target.value)} options={looms.map((l) => ({ value: String(l.id), label: l.loom_number }))} emptyLabel="All" />
          <FormSelect label="Order" value={orderId} onChange={(e) => setOrderId(e.target.value)} options={orderOptions} emptyLabel="All" />
          <FormSelect label="Shift (optional)" value={shift} onChange={(e) => setShift(e.target.value)} options={[{ value: 'Day', label: 'Day' }, { value: 'Night', label: 'Night' }]} emptyLabel="All" />
          <div className="flex items-end">
            <Button
              onClick={() => {
                if (page !== 1) setPage(1);
                else generate();
              }}
              disabled={loading}
              className="gap-2 w-full"
            >
              <LineChartIcon className="w-4 h-4" /> {loading ? 'Generating...' : 'Generate'}
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
              <Table columns={columns} data={data} keyField="row_key" emptyMessage="No production data found." />
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
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Card title="Production vs Date" className="mt-4">
        {chartPoints.length ? <LineChart points={chartPoints} /> : <p className="text-gray-500">No chart data.</p>}
      </Card>
    </div>
  );
}

export default ProductionReportPage;

