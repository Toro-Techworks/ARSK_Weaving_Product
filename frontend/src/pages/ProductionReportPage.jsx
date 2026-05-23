import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { ProductionPivotTable } from '../components/ProductionPivotTable';
import { formatOrderId } from '../utils/formatOrderId';
import { fetchAllPaginated } from '../utils/pagination';
import { buildProductionPivotBundle } from '../utils/productionPivotReport';
import { BarChart3, Download } from 'lucide-react';
import { GENERIC_CODE_TYPES, FALLBACK_SHIFT_OPTIONS } from '../constants/genericCodeTypes';
import { useGenericCode } from '../hooks/useGenericCode';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDayHeader(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y) return ymd;
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
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
  const { options: shiftFilterOptions } = useGenericCode(GENERIC_CODE_TYPES.SHIFT, {
    fallback: FALLBACK_SHIFT_OPTIONS,
  });
  const [from, setFrom] = useState(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loomId, setLoomId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [shift, setShift] = useState('');

  const [looms, setLooms] = useState([]);
  const [orders, setOrders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [loomConfigByDate, setLoomConfigByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  const fetchOptions = useCallback(async () => {
    const [loomList, orderList] = await Promise.all([
      api.get('/looms-list').then((r) => r?.data?.data || []).catch(() => []),
      fetchAllPaginated(api, '/yarn-orders', { perPage: 200 }).catch(() => []),
    ]);
    setLooms(loomList);
    setOrders(orderList);
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const orderOptions = useMemo(
    () => orders.map((o) => ({ value: String(o.id), label: formatOrderId(o) })),
    [orders],
  );

  const loadLoomConfigurations = useCallback(
    async (loomList, fromDate, toDate) => {
      if (!fromDate || !toDate || !loomList?.length) {
        setLoomConfigByDate({});
        return;
      }
      setConfigLoading(true);
      try {
        const idsParam = loomList.map((l) => l.id).join(',');
        const configurationsByLoomNumber = await api
          .get('/daily-entry/loom-configurations', {
            params: { start: fromDate, end: toDate, loom_ids: idsParam },
          })
          .then((r) => r.data || {})
          .catch(() => ({}));

        const next = {};
        for (const loom of loomList) {
          const lid = String(loom.id);
          const loomKey =
            loom.loom_number != null && String(loom.loom_number).trim() !== ''
              ? String(loom.loom_number)
              : lid;
          next[lid] = configurationsByLoomNumber[loomKey] || configurationsByLoomNumber[lid] || {};
        }
        setLoomConfigByDate(next);
      } finally {
        setConfigLoading(false);
      }
    },
    [],
  );

  const generate = async () => {
    if (!from || !to) {
      toast.error('Choose from and to dates');
      return;
    }
    setLoading(true);
    try {
      const items = await fetchAllPaginated(api, '/reports/production', {
        perPage: 200,
        date_from: from,
        date_to: to,
        ...(loomId ? { loom_id: loomId } : {}),
        ...(orderId ? { order_id: orderId } : {}),
        ...(shift ? { shift } : {}),
      });
      setRawRows(items);
    } catch {
      toast.error('Failed to load production report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (from && to) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allLoomsForPivot = useMemo(() => {
    const list = loomId ? looms.filter((l) => String(l.id) === String(loomId)) : looms;
    return list.map((l) => ({ id: l.id, loom_number: l.loom_number, status: l.status }));
  }, [looms, loomId]);

  useEffect(() => {
    if (allLoomsForPivot.length && from && to) {
      loadLoomConfigurations(allLoomsForPivot, from, to);
    }
  }, [allLoomsForPivot, from, to, loadLoomConfigurations]);

  const pivotBundle = useMemo(
    () => buildProductionPivotBundle(rawRows, from, to, allLoomsForPivot.length ? allLoomsForPivot : null),
    [rawRows, from, to, allLoomsForPivot],
  );

  const exportExcel = async () => {
    try {
      const res = await api.get('/reports/production/excel', {
        params: {
          date_from: from,
          date_to: to,
          loom_id: loomId || undefined,
          order_id: orderId || undefined,
          shift: shift || undefined,
        },
        responseType: 'blob',
      });
      downloadBlob(
        res.data,
        'production-report.xlsx',
        res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch {
      toast.error('Excel export failed');
    }
  };

  const exportPdf = async () => {
    try {
      const res = await api.get('/reports/production/pdf', {
        params: {
          date_from: from,
          date_to: to,
          loom_id: loomId || undefined,
          order_id: orderId || undefined,
          shift: shift || undefined,
        },
        responseType: 'blob',
      });
      downloadBlob(res.data, 'production-report.pdf', res.headers['content-type']);
    } catch {
      toast.error('PDF export failed');
    }
  };

  const gridLoading = loading || configLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Production Report</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {from && to
              ? `${formatDayHeader(from)} – ${formatDayHeader(to)} (${from} to ${to})`
              : 'Select dates and generate'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportExcel} disabled={gridLoading} className="gap-2">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
          <Button onClick={exportPdf} disabled={gridLoading} className="gap-2">
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <FormInput type="date" label="From Date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <FormInput type="date" label="To Date" value={to} onChange={(e) => setTo(e.target.value)} />
          <FormSelect
            label="Loom"
            value={loomId}
            onChange={(e) => setLoomId(e.target.value)}
            options={looms.map((l) => ({ value: String(l.id), label: l.loom_number }))}
            emptyLabel="All"
          />
          <FormSelect
            label="Order"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            options={orderOptions}
            emptyLabel="All"
          />
          <FormSelect
            label="Shift (optional)"
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            options={shiftFilterOptions}
            emptyLabel="All"
          />
          <div className="flex items-end">
            <Button onClick={generate} disabled={gridLoading} className="gap-2 w-full">
              <BarChart3 className="w-4 h-4" /> {gridLoading ? 'Loading…' : 'Generate'}
            </Button>
          </div>
        </div>
      </Card>

      {pivotBundle.summaries?.period ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="!p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total Day Mtr</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900 mt-0.5">
              {pivotBundle.summaries.period.dayMeters > 0
                ? pivotBundle.summaries.period.dayMeters.toLocaleString()
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">All looms · day shift</p>
          </Card>
          <Card className="!p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total Night Mtr</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900 mt-0.5">
              {pivotBundle.summaries.period.nightMeters > 0
                ? pivotBundle.summaries.period.nightMeters.toLocaleString()
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">All looms · night shift</p>
          </Card>
          <Card className="!p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Grand total</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900 mt-0.5">
              {pivotBundle.summaries.period.grandTotal > 0
                ? pivotBundle.summaries.period.grandTotal.toLocaleString()
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{pivotBundle.summaries.period.dayCount} days in range</p>
          </Card>
          <Card className="!p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Looms woven</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900 mt-0.5">
              {pivotBundle.summaries.period.loomsWoven > 0 ? pivotBundle.summaries.period.loomsWoven : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Distinct looms with production</p>
          </Card>
          <Card className="!p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Weekly average</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900 mt-0.5">
              {pivotBundle.summaries.period.weeklyAverage != null
                ? pivotBundle.summaries.period.weeklyAverage.toLocaleString()
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Mtr / week ({pivotBundle.summaries.period.weekSpan || 0} wk span)
            </p>
          </Card>
        </div>
      ) : null}

      <div className="relative">
        {gridLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-lg min-h-[12rem]">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
          </div>
        ) : null}
        <ProductionPivotTable
          bundle={pivotBundle}
          loomConfigByDate={loomConfigByDate}
          looms={allLoomsForPivot}
          shiftFilter={shift}
        />
      </div>
    </div>
  );
}

export default ProductionReportPage;
