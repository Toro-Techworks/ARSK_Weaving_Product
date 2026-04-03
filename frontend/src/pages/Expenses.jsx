import React, { useState, useEffect } from 'react';
import { Wallet, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { FormInput, FormSelect, FormTextarea } from '../components/FormInput';
import { usePagePermission } from '../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import { TablePagination } from '../components/TablePagination';
import { normalizePaginatedResponse } from '../utils/pagination';
import { GENERIC_CODE_TYPES, FALLBACK_EXPENSE_CATEGORY_OPTIONS } from '../constants/genericCodeTypes';
import { useGenericCode } from '../hooks/useGenericCode';

export function ExpenseList() {
  const { canEdit } = usePagePermission();
  const { options: categoryOptions } = useGenericCode(GENERIC_CODE_TYPES.EXPENSE_CATEGORY, {
    fallback: FALLBACK_EXPENSE_CATEGORY_OPTIONS,
  });
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/expenses', { params: { page, per_page: perPage, category: category || undefined } })
      .then(({ data: res }) => {
        const n = normalizePaginatedResponse(res);
        setData(n.data);
        setMeta({ current_page: n.current_page, last_page: n.last_page, per_page: n.per_page, total: n.total });
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [page, perPage, category]);
  useRefreshOnSameMenuClick(fetch);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Expenses</h2>
        {canEdit && (
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setAddModalOpen(true)}><Plus className="w-4 h-4" /> Add Expense</Button>
        )}
      </div>
      <Card>
        <div className="mb-4">
          <FormSelect options={[{ value: '', label: 'All categories' }, ...categoryOptions]} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} />
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
        <ExpenseAddModal
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => { setAddModalOpen(false); fetch(); }}
        />
      )}
    </div>
  );
}

function ExpenseAddModal({ onClose, onSuccess }) {
  const { options: categorySelectOptions } = useGenericCode(GENERIC_CODE_TYPES.EXPENSE_CATEGORY, {
    fallback: FALLBACK_EXPENSE_CATEGORY_OPTIONS,
  });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: 'Electricity', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    api.post('/expenses', { ...form, amount: Number(form.amount) })
      .then(() => { toast.success('Expense recorded'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-[90vw] sm:w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add Expense</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <p className="text-sm text-gray-600 -mt-2">Record an expense by category and amount.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormSelect label="Category" options={categorySelectOptions} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="!mb-0" />
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
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? 'Saving...' : 'Save Expense'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ExpenseForm({ onSuccess }) {
  return null;
}
