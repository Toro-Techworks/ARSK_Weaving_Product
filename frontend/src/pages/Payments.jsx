import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { usePagePermission } from '../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import { TablePagination } from '../components/TablePagination';
import { normalizePaginatedResponse } from '../utils/pagination';

export function PaymentList() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [companies, setCompanies] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => { api.get('/companies-list').then(({ data: d }) => setCompanies(d.data || [])); }, []);

  const fetch = () => {
    setLoading(true);
    api.get('/payments', { params: { page, per_page: perPage, company_id: companyId || undefined } })
      .then(({ data: res }) => {
        const n = normalizePaginatedResponse(res);
        setData(n.data);
        setMeta({ current_page: n.current_page, last_page: n.last_page, per_page: n.per_page, total: n.total });
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [page, perPage, companyId]);
  useRefreshOnSameMenuClick(fetch);

  const deletePayment = (id) => {
    if (!window.confirm('Delete this payment?')) return;
    api.delete(`/payments/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Failed'));
  };

  const columns = [
    { key: 'payment_date', label: 'Date' },
    { key: 'company', label: 'Company', render: (_, row) => row.company?.company_name || '-' },
    { key: 'amount', label: 'Amount', render: (v) => v != null ? `₹${Number(v).toLocaleString()}` : '-' },
    { key: 'mode', label: 'Mode' },
    { key: 'status', label: 'Status', render: (v) => v ? String(v).toUpperCase() : '-' },
    { key: 'reference_number', label: 'Reference' },
    ...(canEdit ? [{ key: 'actions', label: 'Actions', render: (_, row) => <button type="button" onClick={() => deletePayment(row.id)} className="text-red-600 hover:underline">Delete</button> }] : []),
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Income (Payments)</h2>
        {canEdit && (
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setAddModalOpen(true)}><Plus className="w-4 h-4" /> Record Payment</Button>
        )}
      </div>
      <Card>
        <div className="mb-4">
          <FormSelect options={[{ value: '', label: 'All companies' }, ...companies.map((c) => ({ value: c.id, label: c.company_name }))]} value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPage(1); }} />
        </div>
        <Table columns={columns} data={data} isLoading={loading} />
        {(meta.total > 0 || page > 1) && (
          <TablePagination
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            perPage={meta.per_page}
            onPageChange={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
            disabled={loading}
          />
        )}
      </Card>
      {addModalOpen && (
        <PaymentAddModal
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => { setAddModalOpen(false); fetch(); }}
        />
      )}
    </div>
  );
}

function PaymentAddModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ company_id: '', payment_date: new Date().toISOString().slice(0, 10), amount: '', mode: 'Bank', status: 'open', reference_number: '', notes: '' });

  useEffect(() => { api.get('/companies-list').then(({ data: d }) => setCompanies(d.data || [])); }, []);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-[90vw] sm:w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Record Payment</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <p className="text-sm text-gray-600 -mt-2">Record a payment received from a company.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormSelect label="Company" required options={companies.map((c) => ({ value: c.id, label: c.company_name }))} value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="!mb-0" />
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
              <FormSelect
                label="Status"
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'running', label: 'Running' },
                  { value: 'closed', label: 'Closed' },
                ]}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="!mb-0"
              />
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
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? 'Saving...' : 'Save Payment'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PaymentForm({ onSuccess }) {
  return null;
}
