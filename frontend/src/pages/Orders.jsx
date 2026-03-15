import React, { useState, useEffect } from 'react';
import { Link, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { AnimatedModal } from '../components/AnimatedModal';
import { usePagePermission } from '../hooks/usePagePermission';

export function OrderList() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOrder, setEditModalOrder] = useState(null);

  const fetch = () => {
    setLoading(true);
    api.get('/yarn-orders', { params: { page, per_page: 15 } })
      .then(({ data: res }) => { setData(res.data); setMeta(res.meta || {}); })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), [page]);

  const deleteOrder = (id, label) => {
    if (!window.confirm(`Delete order ${label || id}?`)) return;
    api.delete(`/yarn-orders/${id}`).then(() => { toast.success('Deleted'); fetch(); setEditModalOrder(null); }).catch(() => toast.error('Delete failed'));
  };

  const formatDate = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

  const columns = [
    { key: 'id', label: 'Order #', render: (v) => `#${v}` },
    { key: 'order_from', label: 'Order From', render: (v) => v || '-' },
    { key: 'customer', label: 'Customer', render: (v) => v || '-' },
    { key: 'po_number', label: 'P.O Number', render: (v) => v || '-' },
    { key: 'po_date', label: 'PO Date', render: formatDate },
    { key: 'delivery_date', label: 'Delivery Date', render: formatDate },
    ...(canEdit ? [{
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <span className="flex gap-2">
          <button type="button" onClick={() => setEditModalOrder(row)} className="text-brand hover:underline">Edit</button>
          <button type="button" onClick={() => deleteOrder(row.id, row.po_number || row.id)} className="text-red-600 hover:underline">Delete</button>
          <Link to={`/yarn-stock/entry/${row.id}`} className="text-brand hover:underline">Details</Link>
        </span>
      ),
    }] : []),
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Orders (Yarn Orders)</h2>
        {canEdit && <Button onClick={() => setCreateModalOpen(true)}>Create Order</Button>}
      </div>
      <Card>
        <Table columns={columns} data={data} isLoading={loading} emptyMessage="No orders yet." />
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
      {createModalOpen && (
        <OrderModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => { setCreateModalOpen(false); fetch(); }}
        />
      )}
      {editModalOrder && (
        <OrderModal
          order={editModalOrder}
          onClose={() => setEditModalOrder(null)}
          onSuccess={() => { setEditModalOrder(null); fetch(); }}
        />
      )}
    </div>
  );
}

function OrderModal({ order, onClose, onSuccess }) {
  const isEdit = !!order;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    order_from: '',
    customer: '',
    weaving_unit: '',
    po_number: '',
    po_date: '',
    delivery_date: '',
  });

  useEffect(() => {
    if (order) {
      setForm({
        order_from: order.order_from ?? '',
        customer: order.customer ?? '',
        weaving_unit: order.weaving_unit ?? '',
        po_number: order.po_number ?? '',
        po_date: order.po_date ? (typeof order.po_date === 'string' ? order.po_date.slice(0, 10) : '') : '',
        delivery_date: order.delivery_date ? (typeof order.delivery_date === 'string' ? order.delivery_date.slice(0, 10) : '') : '',
      });
    }
  }, [order]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      order_from: form.order_from || null,
      customer: form.customer || null,
      weaving_unit: form.weaving_unit || null,
      po_number: form.po_number || null,
      po_date: form.po_date || null,
      delivery_date: form.delivery_date || null,
    };
    const promise = isEdit ? api.put(`/yarn-orders/${order.id}`, payload) : api.post('/yarn-orders', payload);
    promise
      .then(() => { toast.success(isEdit ? 'Updated' : 'Order created'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <AnimatedModal open onClose={onClose} maxWidth="max-w-lg">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-xl">
        <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Order' : 'Create Order'}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormSelect
                label="Order From"
                options={orderFromOptions}
                value={form.order_from}
                onChange={(e) => {
                  const nextOrderFrom = e.target.value;
                  const willBeArsk = nextOrderFrom?.trim().toUpperCase() === ARSK_COMPANY_NAME.toUpperCase();
                  setForm({ ...form, order_from: nextOrderFrom, customer: willBeArsk ? form.customer : '' });
                }}
                className="!mb-0"
              />
            </div>
            {isArskSelected && (
              <div className={fieldClass}>
                <FormInput label="Customer" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" className="!mb-0" />
              </div>
            )}
            <div className={fieldClass}>
              <FormInput label="Weaving Unit" value={form.weaving_unit} onChange={(e) => setForm({ ...form, weaving_unit: e.target.value })} placeholder="Weaving unit" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="P.O Number" value={form.po_number} onChange={(e) => setForm({ ...form, po_number: e.target.value })} placeholder="P.O Number" className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="PO Date" type="date" value={form.po_date} onChange={(e) => setForm({ ...form, po_date: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Delivery Date" type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className="!mb-0" />
            </div>
          </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}</Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export function OrderForm({ id, onSuccess }) {
  return null;
}
