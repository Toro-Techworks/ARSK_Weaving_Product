import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect, FormTextarea } from '../components/FormInput';
import { usePagePermission } from '../hooks/usePagePermission';

const CATEGORIES = ['Electricity', 'Labour', 'Maintenance', 'Yarn'];

export function ExpenseList() {
  const { canEdit } = usePagePermission();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/expenses', { params: { page, per_page: 15, category: category || undefined } })
      .then(({ data: res }) => { setData(res.data); setMeta(res.meta || {}); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [page]);
  useEffect(() => { setPage(1); fetch(); }, [category]);

  const deleteExpense = (id) => {
    if (!window.confirm('Delete this expense?')) return;
    api.delete(`/expenses/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Failed'));
  };

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', render: (v) => v != null ? `₹${Number(v).toLocaleString()}` : '-' },
    { key: 'notes', label: 'Notes' },
    ...(canEdit ? [{ key: 'actions', label: 'Actions', render: (_, row) => <button type="button" onClick={() => deleteExpense(row.id)} className="text-red-600 hover:underline">Delete</button> }] : []),
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Expenses</h2>
      <Card>
        <div className="mb-4">
          <FormSelect options={[{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} value={category} onChange={(e) => setCategory(e.target.value)} />
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

export function ExpenseForm({ onSuccess }) {
  const { canEdit } = usePagePermission();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: 'Electricity', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });

  if (!canEdit) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.post('/expenses', { ...form, amount: Number(form.amount) })
      .then(() => { toast.success('Expense recorded'); setForm({ ...form, amount: '', notes: '' }); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-brand" />
          <h3 className="text-base font-semibold text-gray-900">Add Expense</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">Record an expense by category and amount.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldClass}>
              <FormSelect label="Category" options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="!mb-0" />
            </div>
            <div className={fieldClass}>
              <FormInput label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="!mb-0" />
            </div>
            <div className="md:col-span-2">
              <div className={fieldClass}>
                <FormTextarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="!mb-0" />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
