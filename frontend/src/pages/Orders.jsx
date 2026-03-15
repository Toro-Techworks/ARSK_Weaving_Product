import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FileText, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { usePagePermission } from '../hooks/usePagePermission';

export function OrderList() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/orders', { params: { page, per_page: 15, search: search || undefined, status: status || undefined } })
      .then(({ data: res }) => { setData(res.data); setMeta(res.meta || {}); })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), [page]);
  useEffect(() => { setPage(1); fetch(); }, [search, status]);

  const deleteOrder = (id, dc) => {
    if (!window.confirm(`Delete order ${dc}?`)) return;
    api.delete(`/orders/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Delete failed'));
  };

  const columns = [
    { key: 'dc_number', label: 'DC Number' },
    { key: 'company', label: 'Company', render: (_, row) => row.company?.company_name || '-' },
    { key: 'fabric_type', label: 'Fabric' },
    { key: 'quantity_meters', label: 'Qty (m)' },
    { key: 'grand_total', label: 'Grand Total', render: (v) => v != null ? `₹${Number(v).toLocaleString()}` : '-' },
    { key: 'status', label: 'Status' },
    ...(canEdit ? [{
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <span className="flex gap-2">
          <Link to={`/orders/${row.id}/edit`} className="text-brand hover:underline">Edit</Link>
          <button type="button" onClick={() => deleteOrder(row.id, row.dc_number)} className="text-red-600 hover:underline">Delete</button>
        </span>
      ),
    }] : []),
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Orders List</h2>
        {canEdit && <Link to="/orders/create"><Button>Create Order (DC)</Button></Link>}
      </div>
      <Card>
        <div className="flex gap-4 mb-4 flex-wrap">
          <FormInput placeholder="Search DC or fabric..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <FormSelect options={[{ value: '', label: 'All status' }, { value: 'Pending', label: 'Pending' }, { value: 'Running', label: 'Running' }, { value: 'Completed', label: 'Completed' }]} value={status} onChange={(e) => setStatus(e.target.value)} />
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

export function OrderForm({ id, onSuccess }) {
  const { canEdit } = usePagePermission();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [looms, setLooms] = useState([]);
  const [form, setForm] = useState({
    order_from: '', customer: '', weaving_unit: '', po_date: '', po_number: '', delivery_date: '',
    company_id: '', fabric_type: '', quantity_meters: '', rate_per_meter: '', loom_id: '', status: 'Pending', gst_percentage: 12,
  });

  useEffect(() => {
    api.get('/companies-list').then(({ data }) => setCompanies(data.data || []));
    api.get('/looms-list').then(({ data }) => setLooms(data.data || []));
  }, []);
  useEffect(() => {
    if (id) api.get(`/orders/${id}`).then(({ data }) => {
      const d = data.data;
      setForm({
        ...d,
        order_from: d.order_from ?? '', customer: d.customer ?? '', weaving_unit: d.weaving_unit ?? '',
        po_date: d.po_date ? (typeof d.po_date === 'string' ? d.po_date.slice(0, 10) : '') : '',
        po_number: d.po_number ?? '', delivery_date: d.delivery_date ? (typeof d.delivery_date === 'string' ? d.delivery_date.slice(0, 10) : '') : '',
        company_id: d.company_id, loom_id: d.loom_id,
      });
    }).catch(() => toast.error('Failed to load'));
  }, [id]);

  if (!canEdit) return <Navigate to="/orders" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      order_from: form.order_from || null, customer: form.customer || null, weaving_unit: form.weaving_unit || null,
      po_date: form.po_date || null, po_number: form.po_number || null, delivery_date: form.delivery_date || null,
      company_id: Number(form.company_id), loom_id: Number(form.loom_id), gst_percentage: Number(form.gst_percentage) || 12,
    };
    const promise = isEdit ? api.put(`/orders/${id}`, payload) : api.post('/orders', payload);
    promise
      .then(() => { toast.success(isEdit ? 'Updated' : 'Order created'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Order' : 'Create Order (DC)'}</h1>
          <p className="mt-1 text-sm text-gray-500">{isEdit ? 'Update order and billing details.' : 'Create a new delivery challan (DC) and link to a loom.'}</p>
        </div>
        <Link to="/orders">
          <Button variant="secondary">Back to Orders</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900">Order & Party Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormSelect label="Company" required options={companies.map((c) => ({ value: c.id, label: c.company_name }))} value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Fabric Type" required value={form.fabric_type} onChange={(e) => setForm({ ...form, fabric_type: e.target.value })} placeholder="Fabric type" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Quantity (m)" type="number" step="0.01" required value={form.quantity_meters} onChange={(e) => setForm({ ...form, quantity_meters: e.target.value })} placeholder="0" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Rate per Meter" type="number" step="0.01" required value={form.rate_per_meter} onChange={(e) => setForm({ ...form, rate_per_meter: e.target.value })} placeholder="0" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Order From" value={form.order_from} onChange={(e) => setForm({ ...form, order_from: e.target.value })} placeholder="Order from" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Customer" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Weaving Unit" value={form.weaving_unit} onChange={(e) => setForm({ ...form, weaving_unit: e.target.value })} placeholder="Weaving unit" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="PO Date" type="date" value={form.po_date} onChange={(e) => setForm({ ...form, po_date: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="P.O Number" value={form.po_number} onChange={(e) => setForm({ ...form, po_number: e.target.value })} placeholder="P.O Number" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Delivery Date" type="date" required value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormSelect label="Loom" required options={looms.map((l) => ({ value: l.id, label: l.loom_number }))} value={form.loom_id} onChange={(e) => setForm({ ...form, loom_id: e.target.value })} className="!mb-0" />
            </div>
          </div>
        </Card>

        <Card className="border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-brand" />
            <h3 className="text-base font-semibold text-gray-900">Billing & Status</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormInput label="GST %" type="number" step="0.01" value={form.gst_percentage} onChange={(e) => setForm({ ...form, gst_percentage: e.target.value })} placeholder="12" className="!mb-0" />
            </div>
            {isEdit && (
              <div className={fieldClass}>
                <FormSelect label="Status" options={[{ value: 'Pending', label: 'Pending' }, { value: 'Running', label: 'Running' }, { value: 'Completed', label: 'Completed' }]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="!mb-0" />
              </div>
            )}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}</Button>
            <Link to="/orders" className="text-sm text-gray-600 hover:text-brand">Cancel</Link>
          </div>
        </Card>
      </form>
    </div>
  );
}
