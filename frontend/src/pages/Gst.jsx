import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Receipt, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { usePagePermission } from '../hooks/usePagePermission';

function GstList({ type, refresh = 0, canEdit = true }) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/gst-records', { params: { page, per_page: 15, type } })
      .then(({ data: res }) => { setData(res.data); setMeta(res.meta || {}); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [page, type, refresh]);

  const deleteRecord = (id) => {
    if (!window.confirm('Delete this record?')) return;
    api.delete(`/gst-records/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Failed'));
  };

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'invoice_number', label: 'Invoice' },
    { key: 'company', label: 'Company', render: (_, row) => row.company?.company_name || '-' },
    { key: 'taxable_value', label: 'Taxable', render: (v) => v != null ? `₹${Number(v).toLocaleString()}` : '-' },
    { key: 'gst_percentage', label: 'GST %' },
    { key: 'gst_amount', label: 'GST Amt', render: (v) => v != null ? `₹${Number(v).toLocaleString()}` : '-' },
    { key: 'total_amount', label: 'Total', render: (v) => v != null ? `₹${Number(v).toLocaleString()}` : '-' },
    ...(canEdit ? [{ key: 'actions', label: 'Actions', render: (_, row) => <button type="button" onClick={() => deleteRecord(row.id)} className="text-red-600 hover:underline">Delete</button> }] : []),
  ];

  return (
    <Card>
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
  );
}

export function GstIn() {
  const { canEdit } = usePagePermission();
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">GST In</h2>
        <div className="flex gap-2">
          {canEdit && <Link to="/gst/in/add"><Button>Add GST In</Button></Link>}
          <Link to="/gst/out"><Button variant="secondary">GST Out</Button></Link>
        </div>
      </div>
      <GstList type="in" refresh={refresh} canEdit={canEdit} />
    </div>
  );
}

export function GstInAdd({ onSuccess }) {
  const { canEdit } = usePagePermission();
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ company_id: '', invoice_number: '', date: new Date().toISOString().slice(0, 10), taxable_value: '', gst_percentage: 12, description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/companies-list').then(({ data: d }) => setCompanies(d.data || [])); }, []);

  if (!canEdit) return <Navigate to="/gst/in" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.post('/gst-records', { type: 'in', ...form, company_id: form.company_id ? Number(form.company_id) : null, taxable_value: Number(form.taxable_value), gst_percentage: Number(form.gst_percentage) })
      .then(() => {
        toast.success('GST In recorded');
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
          <h1 className="text-2xl font-bold text-gray-900">Add GST In</h1>
          <p className="mt-1 text-sm text-gray-500">Record a vendor or purchase entry for GST In.</p>
        </div>
        <Link to="/gst/in">
          <Button variant="secondary">Back to GST In</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900">Invoice & Vendor</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormSelect label="Company (optional)" options={[{ value: '', label: '— None —' }, ...companies.map((c) => ({ value: c.id, label: c.company_name }))]} value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Invoice Number" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="Invoice number" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="!mb-0" />
            </div>
          </div>
        </Card>

        <Card className="border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900">Amount & Tax</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormInput label="Taxable Value (₹)" type="number" step="0.01" required value={form.taxable_value} onChange={(e) => setForm({ ...form, taxable_value: e.target.value })} placeholder="0.00" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="GST %" type="number" step="0.01" value={form.gst_percentage} onChange={(e) => setForm({ ...form, gst_percentage: e.target.value })} placeholder="12" className="!mb-0" />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormInput label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" className="!mb-0" />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add GST In'}</Button>
            <Link to="/gst/in" className="text-sm text-gray-600 hover:text-brand">Cancel</Link>
          </div>
        </Card>
      </form>
    </div>
  );
}

export function GstOut() {
  const { canEdit } = usePagePermission();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { api.get('/orders', { params: { status: 'Completed', per_page: 100 } }).then(({ data: res }) => setOrders(res.data || [])).catch(() => setOrders([])); }, []);

  const generateFromOrder = (orderId) => {
    setLoading(true);
    api.post(`/orders/${orderId}/gst-out`)
      .then(() => { toast.success('GST Out generated'); setRefresh((r) => r + 1); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">GST Out</h2>
        <Link to="/gst/in"><Button variant="secondary">GST In</Button></Link>
      </div>
      <p className="text-gray-600 mb-4">GST Out is auto-generated from completed orders. Generate for a completed order below:</p>
      <Card title="Generate from Completed Order" className="mb-6">
        <div className="space-y-2">
          {orders.length === 0 ? <p className="text-gray-500">No completed orders.</p> : (
            orders.map((o) => (
              <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span>{o.dc_number} — {o.company?.company_name} — ₹{Number(o.grand_total).toLocaleString()}</span>
                <Button onClick={() => generateFromOrder(o.id)} disabled={loading || !canEdit}>Generate GST Out</Button>
              </div>
            ))
          )}
        </div>
      </Card>
      <GstList type="out" refresh={refresh} canEdit={canEdit} />
    </div>
  );
}
