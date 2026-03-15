import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Plus, Calendar, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { SearchableOrderSelect } from '../components/SearchableOrderSelect';
import { usePagePermission } from '../hooks/usePagePermission';

export function LoomDailyEntry() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [looms, setLooms] = useState([]);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loomId, setLoomId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/looms-list').then(({ data: d }) => setLooms(d.data || [])); }, []);

  const fetch = () => {
    setLoading(true);
    api.get('/loom-entries', { params: { page, per_page: 15, loom_id: loomId || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined } })
      .then(({ data: res }) => { setData(res.data); setMeta(res.meta || {}); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [page]);
  useEffect(() => { setPage(1); fetch(); }, [loomId, dateFrom, dateTo]);

  const deleteEntry = (id) => {
    if (!window.confirm('Delete this entry?')) return;
    api.delete(`/loom-entries/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Failed'));
  };

  const columns = [
    { key: 'date', label: 'Date', render: (v) => v || '-' },
    { key: 'loom', label: 'Loom', render: (_, row) => row.loom?.loom_number || '-' },
    { key: 'shift', label: 'Shift' },
    { key: 'meters_produced', label: 'Produced (m)' },
    { key: 'rejected_meters', label: 'Rejected (m)' },
    { key: 'net_production', label: 'Net (m)' },
    { key: 'efficiency_percentage', label: 'Efficiency %' },
    { key: 'operator_name', label: 'Operator' },
    ...(canEdit ? [{ key: 'actions', label: 'Actions', render: (_, row) => <button type="button" onClick={() => deleteEntry(row.id)} className="text-red-600 hover:underline">Delete</button> }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Daily Entry</h2>
        {canEdit && (
          <Link to="/loom-production/daily/add">
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Daily Entry</Button>
          </Link>
        )}
      </div>
      <Card>
        <div className="flex gap-4 mb-4 flex-wrap">
          <FormSelect options={[{ value: '', label: 'All looms' }, ...looms.map((l) => ({ value: l.id, label: l.loom_number }))]} value={loomId} onChange={(e) => setLoomId(e.target.value)} />
          <FormInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
          <FormInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
        </div>
        <Table columns={columns} data={data} isLoading={loading} />
        {meta.last_page > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="text-sm text-gray-500">Page {meta.current_page} of {meta.last_page}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export function LoomEntryForm({ onSuccess }) {
  const { canEdit } = usePagePermission();
  const [loading, setLoading] = useState(false);
  const [looms, setLooms] = useState([]);
  const [form, setForm] = useState({
    loom_id: '',
    order_id: '',
    date: new Date().toISOString().slice(0, 10),
    shift: 'Day',
    meters_produced: '',
    rejected_meters: '0',
    operator_name: '',
  });

  useEffect(() => { api.get('/looms-list').then(({ data: d }) => setLooms(d.data || [])); }, []);

  if (!canEdit) return <Navigate to="/loom-production/daily" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      loom_id: Number(form.loom_id),
      order_id: form.order_id ? Number(form.order_id) : null,
      date: form.date,
      shift: form.shift,
      meters_produced: Number(form.meters_produced),
      rejected_meters: Number(form.rejected_meters) || 0,
      operator_name: form.operator_name || null,
    };
    api.post('/loom-entries', payload)
      .then(() => {
        toast.success('Entry saved');
        setForm({ ...form, meters_produced: '', rejected_meters: '0', operator_name: '', order_id: '' });
        onSuccess?.();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Daily Entry</h1>
          <p className="mt-1 text-sm text-gray-500">Record production for a loom and optionally link to an order.</p>
        </div>
        <Link to="/loom-production/daily">
          <Button variant="secondary">Back to Daily Entry</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-brand/10 bg-gradient-to-b from-white to-gray-50/50">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900">Link to Order (optional)</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Search by DC number to associate this entry with an order.</p>
          <SearchableOrderSelect
            label="Order"
            value={form.order_id}
            onChange={(orderId) => setForm((f) => ({ ...f, order_id: orderId || '' }))}
            placeholder="Search by DC number or fabric..."
          />
        </Card>

        <Card className="border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900">Production Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormSelect
                label="Loom"
                required
                options={looms.map((l) => ({ value: l.id, label: l.loom_number }))}
                value={form.loom_id}
                onChange={(e) => setForm({ ...form, loom_id: e.target.value })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormSelect
                label="Shift"
                required
                options={[{ value: 'Day', label: 'Day' }, { value: 'Night', label: 'Night' }]}
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value })}
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Operator Name"
                value={form.operator_name}
                onChange={(e) => setForm({ ...form, operator_name: e.target.value })}
                placeholder="Operator name"
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Meters Produced"
                type="number"
                step="0.01"
                required
                value={form.meters_produced}
                onChange={(e) => setForm({ ...form, meters_produced: e.target.value })}
                placeholder="0"
                className="!mb-0"
              />
            </div>
            <div className={fieldClass}>
              <FormInput
                label="Rejected Meters"
                type="number"
                step="0.01"
                value={form.rejected_meters}
                onChange={(e) => setForm({ ...form, rejected_meters: e.target.value })}
                placeholder="0"
                className="!mb-0"
              />
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="submit" disabled={loading} className="min-w-[140px]">
              {loading ? 'Saving...' : 'Save Entry'}
            </Button>
            <Link to="/loom-production/daily" className="text-sm text-gray-600 hover:text-brand">Cancel</Link>
          </div>
        </Card>
      </form>
    </div>
  );
}

export function ProductionReport() {
  const [data, setData] = useState([]);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/reports/loom-efficiency', { params: { date_from: dateFrom, date_to: dateTo } })
      .then(({ data: res }) => setData(res.looms || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [dateFrom, dateTo]);

  const columns = [
    { key: 'loom_number', label: 'Loom' },
    { key: 'net_production', label: 'Net Production (m)' },
    { key: 'efficiency_percentage', label: 'Efficiency %' },
    { key: 'days_worked', label: 'Days Worked' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Production Report</h2>
      <Card>
        <div className="flex gap-4 mb-4">
          <FormInput type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <FormInput type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Table columns={columns} data={data} isLoading={loading} />
      </Card>
    </div>
  );
}
