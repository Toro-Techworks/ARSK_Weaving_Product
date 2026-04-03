import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import Button from '../../components/Button';
import { FormInput, FormSelect } from '../../components/FormInput';
import { usePagePermission } from '../../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../../hooks/useRefreshOnSameMenuClick';
import { TablePagination } from '../../components/TablePagination';
import { normalizePaginatedResponse } from '../../utils/pagination';

/** Must match App\Models\GenericCode::DROPDOWN_TYPE_MASTER */
const MASTER_DROPDOWN_TYPE = 'MASTER';

const BOOL_OPTIONS = [
  { value: '1', label: 'Yes' },
  { value: '0', label: 'No' },
];

export function AdminMasterSettings() {
  const { canEdit } = usePagePermission();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [loading, setLoading] = useState(true);
  const [codeTypes, setCodeTypes] = useState([]);

  const [filterCodeType, setFilterCodeType] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [appliedCodeType, setAppliedCodeType] = useState('');
  const [appliedDescription, setAppliedDescription] = useState('');

  const [selectedCodeType, setSelectedCodeType] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const loadCodeTypes = useCallback(() => {
    api
      .get('/admin/generic-codes/code-types', { params: { dropdown_type: MASTER_DROPDOWN_TYPE } })
      .then(({ data }) => setCodeTypes(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setCodeTypes([]));
  }, []);

  const fetchList = useCallback(() => {
    setLoading(true);
    api
      .get('/admin/generic-codes', {
        params: {
          dropdown_type: MASTER_DROPDOWN_TYPE,
          page,
          per_page: perPage,
          ...(appliedCodeType ? { code_type: appliedCodeType } : {}),
          ...(appliedDescription.trim() ? { code_description: appliedDescription.trim() } : {}),
        },
      })
      .then(({ data }) => {
        const n = normalizePaginatedResponse(data);
        setRows(n.data);
        setMeta({
          current_page: n.current_page,
          last_page: n.last_page,
          per_page: n.per_page,
          total: n.total,
        });
      })
      .catch(() => toast.error('Failed to load master settings'))
      .finally(() => setLoading(false));
  }, [page, perPage, appliedCodeType, appliedDescription]);

  useEffect(() => {
    loadCodeTypes();
  }, [loadCodeTypes]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);
  useRefreshOnSameMenuClick(fetchList);

  const applyFilters = (e) => {
    e?.preventDefault();
    setAppliedCodeType(filterCodeType);
    setAppliedDescription(filterDescription);
    if (filterCodeType) {
      setSelectedCodeType(filterCodeType);
    }
    setPage(1);
  };

  const clearFilters = () => {
    setFilterCodeType('');
    setFilterDescription('');
    setAppliedCodeType('');
    setAppliedDescription('');
    setSelectedCodeType('');
    setPage(1);
  };

  const typeFilterOptions = [
    { value: '', label: 'All types' },
    ...codeTypes.map((t) => ({ value: t, label: t })),
  ];

  const deleteRow = (row) => {
    if (!window.confirm(`Delete "${row.code_description}" from ${row.code_type}?`)) return;
    api
      .delete(`/admin/generic-codes/${row.id}`)
      .then(() => {
        toast.success('Deleted');
        loadCodeTypes();
        fetchList();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Delete failed'));
  };

  const columns = [
    { key: 'code_type', label: 'Code type' },
    { key: 'code_description', label: 'Code description' },
    { key: 'sort_order', label: 'Sort order' },
    {
      key: 'is_active',
      label: 'Active',
      render: (v) => (
        <span className={v ? 'text-green-700 font-medium' : 'text-gray-500'}>{v ? 'Yes' : 'No'}</span>
      ),
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
              <span className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setEditRow(row)}
                  className="text-brand hover:underline inline-flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteRow(row)}
                  className="text-red-600 hover:underline inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Master Settings</h2>
          <p className="text-xs text-gray-500 mt-1">
            Only <strong>MASTER</strong> generic codes are listed here. Application dropdowns use <strong>CORE</strong> codes.
          </p>
        </div>
        {canEdit && (
          <Button
            className="gap-2 w-full sm:w-auto"
            disabled={!selectedCodeType}
            onClick={() => setAddOpen(true)}
            title={!selectedCodeType ? 'Select a code type (row or filter)' : undefined}
          >
            <Plus className="w-4 h-4" /> Add under selected type
          </Button>
        )}
      </div>

      <Card className="mb-4">
        <form onSubmit={applyFilters} className="flex flex-col lg:flex-row lg:items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <FormSelect
              label="Code type"
              options={typeFilterOptions}
              value={filterCodeType}
              onChange={(e) => setFilterCodeType(e.target.value)}
              emptyLabel="All types"
              isClearable={false}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <FormInput
              label="Description contains"
              value={filterDescription}
              onChange={(e) => setFilterDescription(e.target.value)}
              placeholder="Filter by description…"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">Apply filters</Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>Clear</Button>
          </div>
        </form>
        {canEdit && (
          <div className="mt-4 max-w-md">
            <FormInput
              label="Selected code type (for Add)"
              value={selectedCodeType}
              onChange={(e) => setSelectedCodeType(e.target.value)}
              placeholder="Click a row, apply a type filter, or type e.g. shift"
            />
            <p className="text-xs text-gray-500 mt-1">
              New rows are created under this type. Row click or applying a single-type filter fills this field.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <Table
          columns={columns}
          data={rows}
          isLoading={loading}
          emptyMessage="No MASTER generic codes match the filters."
          onRowClick={(row) => setSelectedCodeType(row.code_type)}
          getRowClassName={(row) =>
            selectedCodeType && row.code_type === selectedCodeType ? 'bg-brand/10 ring-1 ring-brand/30' : ''}
        />
        {(meta.total > 0 || page > 1) && (
          <TablePagination
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            perPage={meta.per_page}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            disabled={loading}
          />
        )}
      </Card>

      {addOpen && selectedCodeType && (
        <GenericCodeFormModal
          title="Add generic code"
          dropdownType={MASTER_DROPDOWN_TYPE}
          initial={{ code_type: selectedCodeType, code_description: '', sort_order: 0, is_active: true }}
          codeTypeLocked
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            loadCodeTypes();
            fetchList();
            toast.success('Saved');
          }}
        />
      )}

      {editRow && (
        <GenericCodeFormModal
          title="Edit generic code"
          dropdownType={editRow.dropdown_type || MASTER_DROPDOWN_TYPE}
          initial={{
            id: editRow.id,
            code_type: editRow.code_type,
            code_description: editRow.code_description,
            sort_order: editRow.sort_order ?? 0,
            is_active: Boolean(editRow.is_active),
          }}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            setEditRow(null);
            loadCodeTypes();
            fetchList();
            toast.success('Updated');
          }}
        />
      )}
    </div>
  );
}

function GenericCodeFormModal({ title, initial, dropdownType, codeTypeLocked = false, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    code_type: initial.code_type,
    code_description: initial.code_description,
    sort_order: String(initial.sort_order ?? 0),
    is_active: initial.is_active ? '1' : '0',
  }));

  const isEdit = Boolean(initial.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    const sort = Number.parseInt(form.sort_order, 10);
    if (Number.isNaN(sort) || sort < 0) {
      toast.error('Sort order must be a non-negative integer');
      return;
    }
    setSaving(true);
    const payload = {
      code_type: form.code_type.trim(),
      code_description: form.code_description.trim(),
      sort_order: sort,
      is_active: form.is_active === '1',
      dropdown_type: dropdownType,
    };
    const req = isEdit
      ? api.put(`/admin/generic-codes/${initial.id}`, payload)
      : api.post('/admin/generic-codes', payload);
    req
      .then(() => onSaved?.())
      .catch((err) => {
        const msg = err.response?.data?.message
          || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Save failed');
        toast.error(msg);
      })
      .finally(() => setSaving(false));
  };

  const fieldClass = 'space-y-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className={fieldClass}>
            <FormInput
              label="Code type"
              required
              value={form.code_type}
              onChange={(e) => setForm((f) => ({ ...f, code_type: e.target.value }))}
              disabled={codeTypeLocked}
              className="!mb-0"
            />
            {codeTypeLocked && (
              <p className="text-xs text-gray-500">Locked to the selected type.</p>
            )}
          </div>
          <div className={fieldClass}>
            <FormInput
              label="Code description"
              required
              value={form.code_description}
              onChange={(e) => setForm((f) => ({ ...f, code_description: e.target.value }))}
              className="!mb-0"
            />
          </div>
          <div className={fieldClass}>
            <FormInput
              label="Sort order"
              type="number"
              min={0}
              required
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              className="!mb-0"
            />
          </div>
          <div className={fieldClass}>
            <FormSelect
              label="Active"
              options={BOOL_OPTIONS}
              value={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value }))}
              isClearable={false}
              className="!mb-0"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
