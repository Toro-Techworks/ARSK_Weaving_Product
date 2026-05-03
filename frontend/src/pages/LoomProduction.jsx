import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Calendar, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { FormInput, FormSelect } from '../components/FormInput';
import { SearchableOrderSelect } from '../components/SearchableOrderSelect';
import { usePagePermission } from '../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import { DailyEntryTable } from '../components/DailyEntryTable';
import { GENERIC_CODE_TYPES, FALLBACK_SHIFT_OPTIONS } from '../constants/genericCodeTypes';
import { useGenericCode } from '../hooks/useGenericCode';

export function LoomDailyEntry() {
  const { canEdit } = usePagePermission();
  return (
    <div>
      <DailyEntryTable canEdit={canEdit} />
    </div>
  );
}

export function LoomEntryForm({ onSuccess }) {
  const { canEdit } = usePagePermission();
  const { options: shiftOptions } = useGenericCode(GENERIC_CODE_TYPES.SHIFT, {
    fallback: FALLBACK_SHIFT_OPTIONS,
  });
  const [loading, setLoading] = useState(false);
  const [looms, setLooms] = useState([]);
  const [form, setForm] = useState({
    loom_id: '',
    yarn_order_id: '',
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
      yarn_order_id: form.yarn_order_id ? Number(form.yarn_order_id) : null,
      date: form.date,
      shift: form.shift,
      meters_produced: Number(form.meters_produced),
      rejected_meters: Number(form.rejected_meters) || 0,
      operator_name: form.operator_name || null,
    };
    api.post('/loom-entries', payload)
      .then(() => {
        toast.success('Entry saved');
        setForm({ ...form, meters_produced: '', rejected_meters: '0', operator_name: '', yarn_order_id: '' });
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
          <p className="text-sm text-gray-600 mb-4">Search by P.O number or customer to link this entry to an order.</p>
          <SearchableOrderSelect
            label="Order"
            value={form.yarn_order_id}
            onChange={(orderId) => setForm((f) => ({ ...f, yarn_order_id: orderId || '' }))}
            placeholder="Search by P.O number or customer..."
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
                options={shiftOptions}
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
