import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { usePagePermission } from '../hooks/usePagePermission';

export function PaymentList() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [companies, setCompanies] = useState([]);
  const [page, setPage] = useState(1);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/companies-list').then(({ data: d }) => setCompanies(d.data || [])); }, []);

  const fetch = () => {
    setLoading(true);
    api.get('/payments', { params: { page, per_page: 15, company_id: companyId || undefined } })
      .then(({ data: res }) => { setData(res.data); setMeta(res.meta || {}); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [page]);
  useEffect(() => { setPage(1); fetch(); }, [companyId]);

  const deletePayment = (id) => {
    if (!window.confirm('Delete this payment?')) return;
    api.delete(`/payments/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Failed'));
  };

  const columns = [
    { key: 'payment_date', label: 'Date' },
    { key: 'company', label: 'Company', render: (_, row) => row.company?.company_name || '-' },
    { key: 'amount', label: 'Amount', render: (v) => v != null ? `₹${Number(v).toLocaleString()}` : '-' },
    { key: 'mode', label: 'Mode' },
    { key: 'reference_number', label: 'Reference' },
    ...(canEdit ? [{ key: 'actions', label: 'Actions', render: (_, row) => <button type="button" onClick={() => deletePayment(row.id)} className="text-red-600 hover:underline">Delete</button> }] : []),
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Payments</h2>
      <Card>
        <div className="mb-4">
          <FormSelect options={[{ value: '', label: 'All companies' }, ...companies.map((c) => ({ value: c.id, label: c.company_name }))]} value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
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

export function PaymentForm({ onSuccess }) {
  const { canEdit } = usePagePermission();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ company_id: '', order_id: '', payment_date: new Date().toISOString().slice(0, 10), amount: '', mode: 'Bank', reference_number: '', notes: '' });

  useEffect(() => { api.get('/companies-list').then(({ data: d }) => setCompanies(d.data || [])); }, []);
  useEffect(() => {
    if (form.company_id) api.get('/orders', { params: { company_id: form.company_id } }).then(({ data: res }) => setOrders(res.data || [])).catch(() => setOrders([]));
    else setOrders([]);
  }, [form.company_id]);

  if (!canEdit) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.post('/payments', { ...form, company_id: Number(form.company_id), order_id: form.order_id ? Number(form.order_id) : null, amount: Number(form.amount) })
      .then(() => { toast.success('Payment recorded'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-brand" />
          <h3 className="text-base font-semibold text-gray-900">Record Payment</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">Record a payment received from a company.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormSelect label="Company" required options={companies.map((c) => ({ value: c.id, label: c.company_name }))} value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value, order_id: '' })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormSelect label="Order (optional)" options={[{ value: '', label: '— None —' }, ...orders.map((o) => ({ value: o.id, label: `${o.dc_number} - ₹${Number(o.grand_total).toLocaleString()}` }))]} value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Payment Date" type="date" required value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormSelect label="Mode" options={[{ value: 'Cash', label: 'Cash' }, { value: 'Bank', label: 'Bank' }, { value: 'UPI', label: 'UPI' }]} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} className="!mb-0" />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormInput label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="!mb-0" />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Payment'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
