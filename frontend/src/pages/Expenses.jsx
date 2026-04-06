import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
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
import { SearchableOrderSelect } from '../components/SearchableOrderSelect';
import { formatOrderId } from '../utils/formatOrderId';

export const EXPENSE_SCOPE_TEXTILE = 'textile';
export const EXPENSE_SCOPE_CLIENT_ORDER = 'client_order';

function formatOrderCell(row) {
  if (row.expense_scope !== EXPENSE_SCOPE_CLIENT_ORDER) return '—';
  const o = row.yarn_order;
  if (!o) return row.yarn_order_id ? `#${row.yarn_order_id}` : '—';
  const code = o.display_order_id || formatOrderId(o);
  const parts = [code, o.po_number, o.customer].filter(Boolean);
  return parts.join(' — ') || `Order #${o.id}`;
}

function fmtMoney(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `₹${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ExpenseList() {
  const { canEdit } = usePagePermission();
  const { options: categoryOptions } = useGenericCode(GENERIC_CODE_TYPES.EXPENSE_CATEGORY, {
    fallback: FALLBACK_EXPENSE_CATEGORY_OPTIONS,
    dropdownType: 'MASTER',
  });
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [category, setCategory] = useState('');
  const [scopeTab, setScopeTab] = useState(EXPENSE_SCOPE_TEXTILE);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const fetch = () => {
    setLoading(true);
    api
      .get('/expenses', {
        params: {
          page,
          per_page: perPage,
          category: category || undefined,
          expense_scope: scopeTab,
        },
      })
      .then(({ data: res }) => {
        const n = normalizePaginatedResponse(res);
        setData(n.data);
        setMeta({ current_page: n.current_page, last_page: n.last_page, per_page: n.per_page, total: n.total });
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => fetch(), [page, perPage, category, scopeTab]);
  useRefreshOnSameMenuClick(fetch);

  const deleteExpense = (id) => {
    if (!window.confirm('Delete this expense?')) return;
    api.delete(`/expenses/${id}`).then(() => { toast.success('Deleted'); fetch(); }).catch(() => toast.error('Failed'));
  };

  const columns = useMemo(
    () => [
      { key: 'date', label: 'Date' },
      { key: 'category', label: 'Expense type' },
      {
        key: 'yarn_order',
        label: 'Yarn order',
        render: (_, row) => <span className="text-sm text-gray-800">{formatOrderCell(row)}</span>,
      },
      ...(scopeTab === EXPENSE_SCOPE_CLIENT_ORDER
        ? [
            { key: 'design', label: 'Design', render: (v) => <span className="text-sm text-gray-800">{v || '—'}</span> },
            { key: 'size', label: 'Size', render: (v) => <span className="text-sm text-gray-800">{v || '—'}</span> },
            {
              key: 'meter',
              label: 'Meter',
              render: (v) => <span className="text-sm text-gray-800">{v != null ? Number(v).toLocaleString() : '—'}</span>,
            },
            {
              key: 'rate_per_meter',
              label: 'Rate / m',
              render: (v) => <span className="text-sm text-gray-800">{fmtMoney(v)}</span>,
            },
          ]
        : []),
      { key: 'amount', label: 'Amount', render: (v) => (v != null ? fmtMoney(v) : '—') },
      { key: 'notes', label: 'Notes', render: (v) => <span className="line-clamp-2" title={v || ''}>{v || '—'}</span> },
      ...(canEdit
        ? [{
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
              <button type="button" onClick={() => deleteExpense(row.id)} className="text-red-600 hover:underline">
                Delete
              </button>
            ),
          }]
        : []),
    ],
    [canEdit, scopeTab],
  );

  const tabBtn = (active) =>
    `flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      active ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
    }`;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Production expenses</h2>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Record mill overheads (power, wages, loom upkeep) under Textile mill, and costs that belong to a single
            customer P.O. under Client order.
          </p>
        </div>
        {canEdit && (
          <Button className="gap-2 w-full sm:w-auto shrink-0" onClick={() => setAddModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add expense
          </Button>
        )}
      </div>
      <Card>
        <div className="flex flex-col gap-4 mb-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-1 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex rounded-lg gap-1 w-full sm:w-auto">
              <button
                type="button"
                className={tabBtn(scopeTab === EXPENSE_SCOPE_TEXTILE)}
                onClick={() => { setScopeTab(EXPENSE_SCOPE_TEXTILE); setPage(1); }}
              >
                Textile mill
              </button>
              <button
                type="button"
                className={tabBtn(scopeTab === EXPENSE_SCOPE_CLIENT_ORDER)}
                onClick={() => { setScopeTab(EXPENSE_SCOPE_CLIENT_ORDER); setPage(1); }}
              >
                Client order
              </button>
            </div>
            <p className="text-xs text-gray-500 sm:ml-2 sm:flex-1 px-1">
              {scopeTab === EXPENSE_SCOPE_TEXTILE
                ? 'Costs absorbed by your weaving unit, not allocated to one order.'
                : 'Pick the yarn order (P.O.) this cost should roll up with.'}
            </p>
          </div>
          <FormSelect
            options={[{ value: '', label: 'All expense types' }, ...categoryOptions]}
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          />
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
          key={scopeTab}
          defaultScope={scopeTab}
          categorySelectOptions={categoryOptions}
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => { setAddModalOpen(false); fetch(); }}
        />
      )}
    </div>
  );
}

function ExpenseAddModal({ defaultScope, categorySelectOptions, onClose, onSuccess }) {
  const firstCategory = categorySelectOptions[0]?.value ?? 'Loom shed & power';
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    expense_scope: defaultScope,
    category: firstCategory,
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    yarn_order_id: '',
    design: '',
    size: '',
    meter: '',
    rate_per_meter: '',
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      expense_scope: defaultScope,
      yarn_order_id: defaultScope === EXPENSE_SCOPE_TEXTILE ? '' : f.yarn_order_id,
      design: defaultScope === EXPENSE_SCOPE_TEXTILE ? '' : f.design,
      size: defaultScope === EXPENSE_SCOPE_TEXTILE ? '' : f.size,
      meter: defaultScope === EXPENSE_SCOPE_TEXTILE ? '' : f.meter,
      rate_per_meter: defaultScope === EXPENSE_SCOPE_TEXTILE ? '' : f.rate_per_meter,
      category: categorySelectOptions.some((o) => o.value === f.category) ? f.category : firstCategory,
    }));
  }, [defaultScope, categorySelectOptions, firstCategory]);

  const clientTotalAmount = useMemo(() => {
    const m = Number(form.meter);
    const r = Number(form.rate_per_meter);
    if (Number.isNaN(m) || Number.isNaN(r)) return null;
    return Math.round(m * r * 100) / 100;
  }, [form.meter, form.rate_per_meter]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.expense_scope === EXPENSE_SCOPE_CLIENT_ORDER && !form.yarn_order_id) {
      toast.error('Select the client yarn order for this expense.');
      return;
    }
    if (form.expense_scope === EXPENSE_SCOPE_CLIENT_ORDER) {
      if (!String(form.design || '').trim() || !String(form.size || '').trim()) {
        toast.error('Enter design and size.');
        return;
      }
      const m = Number(form.meter);
      const r = Number(form.rate_per_meter);
      if (Number.isNaN(m) || m < 0 || Number.isNaN(r) || r < 0) {
        toast.error('Enter valid meter and rate per meter.');
        return;
      }
    }
    setLoading(true);
    const base = {
      expense_scope: form.expense_scope,
      category: form.category,
      date: form.date,
      notes: form.notes || null,
      yarn_order_id:
        form.expense_scope === EXPENSE_SCOPE_CLIENT_ORDER && form.yarn_order_id
          ? Number(form.yarn_order_id)
          : null,
    };
    const payload =
      form.expense_scope === EXPENSE_SCOPE_TEXTILE
        ? { ...base, amount: Number(form.amount) }
        : {
            ...base,
            design: String(form.design).trim(),
            size: String(form.size).trim(),
            meter: Number(form.meter),
            rate_per_meter: Number(form.rate_per_meter),
          };
    api
      .post('/expenses', payload)
      .then(() => { toast.success('Expense recorded'); onSuccess?.(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-[90vw] sm:w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add production expense</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-1 flex gap-1">
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                form.expense_scope === EXPENSE_SCOPE_TEXTILE ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-600'
              }`}
              onClick={() => setForm({
                ...form,
                expense_scope: EXPENSE_SCOPE_TEXTILE,
                yarn_order_id: '',
                design: '',
                size: '',
                meter: '',
                rate_per_meter: '',
              })}
            >
              Textile mill
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                form.expense_scope === EXPENSE_SCOPE_CLIENT_ORDER ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-600'
              }`}
              onClick={() => setForm({ ...form, expense_scope: EXPENSE_SCOPE_CLIENT_ORDER })}
            >
              Client order
            </button>
          </div>

          {form.expense_scope === EXPENSE_SCOPE_CLIENT_ORDER && (
            <SearchableOrderSelect
              label="Yarn order (P.O.)"
              value={form.yarn_order_id}
              onChange={(orderId) => setForm({ ...form, yarn_order_id: orderId || '' })}
              placeholder="Search by order id, P.O., or customer…"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={fieldClass}>
              <FormSelect
                label="Expense type"
                options={categorySelectOptions}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
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

            {form.expense_scope === EXPENSE_SCOPE_TEXTILE ? (
              <div className={`${fieldClass} md:col-span-2`}>
                <FormInput
                  label="Amount (₹)"
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="!mb-0"
                />
              </div>
            ) : (
              <>
                <div className={fieldClass}>
                  <FormInput
                    label="Design"
                    required
                    value={form.design}
                    onChange={(e) => setForm({ ...form, design: e.target.value })}
                    className="!mb-0"
                  />
                </div>
                <div className={fieldClass}>
                  <FormInput
                    label="Size"
                    required
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="!mb-0"
                  />
                </div>
                <div className={fieldClass}>
                  <FormInput
                    label="Meter"
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={form.meter}
                    onChange={(e) => setForm({ ...form, meter: e.target.value })}
                    className="!mb-0"
                  />
                </div>
                <div className={fieldClass}>
                  <FormInput
                    label="Rate per meter (₹)"
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={form.rate_per_meter}
                    onChange={(e) => setForm({ ...form, rate_per_meter: e.target.value })}
                    className="!mb-0"
                  />
                </div>
                <div className={`${fieldClass} md:col-span-2`}>
                  <FormInput
                    label="Total amount (₹)"
                    readOnly
                    value={clientTotalAmount != null ? String(clientTotalAmount) : ''}
                    placeholder="Enter meter × rate"
                    className="!mb-0 bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calculated as meter × rate per meter (saved with the expense).</p>
                </div>
              </>
            )}
          </div>
          <div className={fieldClass}>
            <FormTextarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="!mb-0" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? 'Saving…' : 'Save expense'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ExpenseForm({ onSuccess }) {
  return null;
}
