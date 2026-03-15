import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { FormInput, FormSelect } from '../components/FormInput';
import Button from '../components/Button';
import { usePagePermission } from '../hooks/usePagePermission';
import { useAuth } from '../context/AuthContext';

function formatOrderDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString();
}

/** List of yarn orders; "New Order" button goes to Yarn Stock Entry */
export function YarnStockList() {
  const navigate = useNavigate();
  const { canEdit } = usePagePermission();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/yarn-orders', { params: { per_page: 100 } })
      .then(({ data }) => setOrders(data.data || []))
      .catch(() => toast.error('Failed to load yarn orders'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Yarn Stock</h2>
        <Button onClick={() => navigate('/yarn-stock/entry')} disabled={!canEdit}>
          New Order
        </Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order From</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weaving Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">P.O Number</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PO Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delivery Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No yarn orders yet. Click &quot;New Order&quot; to create one.</td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/yarn-stock/entry/${o.id}`)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{o.order_from ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.weaving_unit ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.po_number ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.customer ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatOrderDate(o.po_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatOrderDate(o.delivery_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const TYPE_OPTIONS = [
  { value: 'Cone', label: 'Cone' },
  { value: 'Hank', label: 'Hank' },
];

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString();
}

function formatNum(val) {
  if (val == null || val === '') return '—';
  return Number(val);
}

const orderEntryInitial = {
  order_from: '',
  weaving_unit: '',
  po_number: '',
  customer: '',
  po_date: '',
  delivery_date: '',
};

/** Yarn Stock Entry: New Order form + Yarn Receipt Details */
export function YarnStockEntry() {
  const { orderId: orderIdParam } = useParams();
  const { canEdit } = usePagePermission();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');
  const [receipts, setReceipts] = useState([]);
  const [yarnOrders, setYarnOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [orderEntry, setOrderEntry] = useState(orderEntryInitial);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderEntryErrors, setOrderEntryErrors] = useState({});
  const [orderEntrySaving, setOrderEntrySaving] = useState(false);
  const [fabrics, setFabrics] = useState([]);
  const [fabricsLoading, setFabricsLoading] = useState(false);
  const [fabricModalOpen, setFabricModalOpen] = useState(false);
  const [editingFabric, setEditingFabric] = useState(null);
  const [yarnRequirements, setYarnRequirements] = useState([]);
  const [yarnRequirementsLoading, setYarnRequirementsLoading] = useState(false);
  const [yarnReqModalOpen, setYarnReqModalOpen] = useState(false);
  const [editingYarnReq, setEditingYarnReq] = useState(null);

  const fetchReceipts = (orderId) => {
    setLoading(true);
    if (!orderId) {
      setReceipts([]);
      setLoading(false);
      return;
    }
    api.get('/yarn-receipts', { params: { per_page: 100, yarn_order_id: orderId } })
      .then(({ data }) => setReceipts(data.data || []))
      .catch(() => toast.error('Failed to load yarn receipts'))
      .finally(() => setLoading(false));
  };

  const fetchYarnOrders = () => {
    api.get('/yarn-orders', { params: { per_page: 100 } })
      .then(({ data }) => setYarnOrders(data.data || []))
      .catch(() => toast.error('Failed to load yarn orders'));
  };

  const fetchFabrics = (yarnOrderId) => {
    if (!yarnOrderId) {
      setFabrics([]);
      return;
    }
    setFabricsLoading(true);
    api.get(`/fabrics/yarn-order/${yarnOrderId}`)
      .then(({ data }) => setFabrics(data.data || []))
      .catch(() => toast.error('Failed to load fabric details'))
      .finally(() => setFabricsLoading(false));
  };

  const fetchYarnRequirements = (yarnOrderId) => {
    if (!yarnOrderId) {
      setYarnRequirements([]);
      return;
    }
    setYarnRequirementsLoading(true);
    api.get(`/yarn-requirements/yarn-order/${yarnOrderId}`)
      .then(({ data }) => setYarnRequirements(data.data || []))
      .catch(() => toast.error('Failed to load yarn requirements'))
      .finally(() => setYarnRequirementsLoading(false));
  };

  // Fetch yarn orders list once on mount (for dropdowns)
  useEffect(() => {
    fetchYarnOrders();
  }, []);

  const [orderLoading, setOrderLoading] = useState(false);
  const justLoadedOrderIdRef = useRef(null);

  // When URL has order id: single API call returns order + receipts + fabrics + yarn_requirements (fastest)
  useEffect(() => {
    if (!orderIdParam) {
      setOrderEntry(orderEntryInitial);
      setEditingOrderId(null);
      setOrderEntryErrors({});
      setOrderLoading(false);
      justLoadedOrderIdRef.current = null;
      setReceipts([]);
      setFabrics([]);
      setYarnRequirements([]);
      setLoading(false);
      setFabricsLoading(false);
      setYarnRequirementsLoading(false);
      return;
    }
    const id = parseInt(orderIdParam, 10);
    if (Number.isNaN(id)) return;

    setOrderLoading(true);
    setLoading(true);
    setFabricsLoading(true);
    setYarnRequirementsLoading(true);

    api.get(`/yarn-orders/${id}/entry`)
      .then(({ data }) => {
        const d = data?.data ?? {};
        const o = d.order;
        if (o) {
          justLoadedOrderIdRef.current = o.id;
          setEditingOrderId(o.id);
          setOrderEntry({
            order_from: o.order_from ?? '',
            weaving_unit: o.weaving_unit ?? '',
            po_number: o.po_number ?? '',
            customer: o.customer ?? '',
            po_date: o.po_date ? (typeof o.po_date === 'string' ? o.po_date.slice(0, 10) : '') : '',
            delivery_date: o.delivery_date ? (typeof o.delivery_date === 'string' ? o.delivery_date.slice(0, 10) : '') : '',
          });
        }
        setReceipts(d.receipts ?? []);
        setFabrics(d.fabrics ?? []);
        setYarnRequirements(d.yarn_requirements ?? []);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to load order');
        setReceipts([]);
        setFabrics([]);
        setYarnRequirements([]);
      })
      .finally(() => {
        setOrderLoading(false);
        setLoading(false);
        setFabricsLoading(false);
        setYarnRequirementsLoading(false);
      });
  }, [orderIdParam]);

  // When editingOrderId changes (e.g. after saving a new order), fetch receipts + fabrics + requirements in parallel.
  // Skip if we just loaded this order from URL (data already set in orderIdParam effect).
  useEffect(() => {
    if (!editingOrderId) {
      setReceipts([]);
      setFabrics([]);
      setYarnRequirements([]);
      setLoading(false);
      return;
    }
    if (justLoadedOrderIdRef.current === editingOrderId) {
      justLoadedOrderIdRef.current = null;
      return;
    }
    fetchReceipts(editingOrderId);
    fetchFabrics(editingOrderId);
    fetchYarnRequirements(editingOrderId);
  }, [editingOrderId]);

  const openAddModal = () => {
    setEditingReceipt(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingReceipt(row);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditingReceipt(null);
    fetchReceipts(editingOrderId);
  };

  const openAddFabric = () => {
    setEditingFabric(null);
    setFabricModalOpen(true);
  };
  const openEditFabric = (row) => {
    setEditingFabric(row);
    setFabricModalOpen(true);
  };
  const handleFabricSaved = () => {
    setFabricModalOpen(false);
    setEditingFabric(null);
    fetchFabrics(editingOrderId);
  };
  const deleteFabric = (fabric) => {
    if (!window.confirm('Delete this fabric entry?')) return;
    api.delete(`/fabrics/${fabric.id}`)
      .then(() => { toast.success('Deleted'); fetchFabrics(editingOrderId); })
      .catch(() => toast.error('Delete failed'));
  };

  const openAddYarnReq = () => {
    setEditingYarnReq(null);
    setYarnReqModalOpen(true);
  };
  const openEditYarnReq = (row) => {
    setEditingYarnReq(row);
    setYarnReqModalOpen(true);
  };
  const handleYarnReqSaved = () => {
    setYarnReqModalOpen(false);
    setEditingYarnReq(null);
    fetchYarnRequirements(editingOrderId);
  };
  const deleteYarnReq = (row) => {
    if (!window.confirm('Delete this yarn requirement?')) return;
    api.delete(`/yarn-requirements/${row.id}`)
      .then(() => { toast.success('Deleted'); fetchYarnRequirements(editingOrderId); })
      .catch(() => toast.error('Delete failed'));
  };

  const validateOrderEntry = () => {
    const err = {};
    if (!orderEntry.order_from?.trim()) err.order_from = 'Order From is required';
    if (!orderEntry.weaving_unit?.trim()) err.weaving_unit = 'Weaving Unit is required';
    if (!orderEntry.po_number?.trim()) err.po_number = 'P.O Number is required';
    if (!orderEntry.po_date?.trim()) err.po_date = 'PO Date is required';
    if (!orderEntry.delivery_date?.trim()) err.delivery_date = 'Delivery Date is required';
    setOrderEntryErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleOrderEntrySubmit = async (e) => {
    e.preventDefault();
    if (!validateOrderEntry()) {
      toast.error('Please fill all required fields.');
      return;
    }
    setOrderEntrySaving(true);
    const payload = {
      order_from: orderEntry.order_from?.trim() || null,
      weaving_unit: orderEntry.weaving_unit?.trim() || null,
      po_number: orderEntry.po_number || null,
      customer: orderEntry.customer || null,
      po_date: orderEntry.po_date || null,
      delivery_date: orderEntry.delivery_date || null,
    };
    try {
      if (editingOrderId) {
        await api.put(`/yarn-orders/${editingOrderId}`, payload);
        toast.success('Order updated.');
      } else {
        const { data } = await api.post('/yarn-orders', payload);
        const newId = data.data?.id ?? null;
        setEditingOrderId(newId);
        toast.success('Order saved.');
      }
      setOrderEntryErrors({});
      fetchYarnOrders();
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save order');
      toast.error(msg);
    } finally {
      setOrderEntrySaving(false);
    }
  };

  const pageLoading = orderIdParam && orderLoading;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Yarn Stock Entry</h2>
        {!canEdit && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            Read Only Mode
          </span>
        )}
      </div>

      {pageLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-8 py-6 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
            <span className="text-sm font-medium text-gray-700">Loading order...</span>
          </div>
        </div>
      )}

      {/* New Order Entry - Card */}
      <div className={`w-full bg-white rounded-[10px] shadow-sm border border-gray-200 p-6 mb-[30px] ${pageLoading ? 'opacity-60 pointer-events-none' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-5">New Order Entry</h3>
        <form onSubmit={handleOrderEntrySubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5" style={!canEdit ? { pointerEvents: 'none', opacity: 0.85 } : undefined}>
          {/* Row 1: Order From | Customer */}
          <div className="space-y-1.5">
            <FormInput
              label={<>Order From <span className="text-red-500">*</span></>}
              value={orderEntry.order_from}
              onChange={(e) => { setOrderEntry((o) => ({ ...o, order_from: e.target.value })); setOrderEntryErrors((prev) => ({ ...prev, order_from: undefined })); }}
              placeholder="Order from"
              className="!mb-0"
            />
            {orderEntryErrors.order_from && <p className="text-sm text-red-600">{orderEntryErrors.order_from}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <FormInput
              value={orderEntry.customer}
              onChange={(e) => setOrderEntry((o) => ({ ...o, customer: e.target.value }))}
              placeholder="Customer name"
              className="!mb-0"
            />
          </div>
          {/* Row 2: Weaving Unit | PO Date */}
          <div className="space-y-1.5">
            <FormInput
              label={<>Weaving Unit <span className="text-red-500">*</span></>}
              value={orderEntry.weaving_unit}
              onChange={(e) => { setOrderEntry((o) => ({ ...o, weaving_unit: e.target.value })); setOrderEntryErrors((prev) => ({ ...prev, weaving_unit: undefined })); }}
              placeholder="Weaving unit"
              className="!mb-0"
            />
            {orderEntryErrors.weaving_unit && <p className="text-sm text-red-600">{orderEntryErrors.weaving_unit}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              PO Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FormInput
                type="date"
                value={orderEntry.po_date}
                onChange={(e) => { setOrderEntry((o) => ({ ...o, po_date: e.target.value })); setOrderEntryErrors((prev) => ({ ...prev, po_date: undefined })); }}
                className="!mb-0"
                inputClassName="pr-9"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
            </div>
            {orderEntryErrors.po_date && <p className="text-sm text-red-600">{orderEntryErrors.po_date}</p>}
          </div>
          {/* Row 3: P.O Number | Delivery Date */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              P.O Number <span className="text-red-500">*</span>
            </label>
            <FormInput
              value={orderEntry.po_number}
              onChange={(e) => { setOrderEntry((o) => ({ ...o, po_number: e.target.value })); setOrderEntryErrors((prev) => ({ ...prev, po_number: undefined })); }}
              placeholder="P.O Number"
              className="!mb-0"
            />
            {orderEntryErrors.po_number && <p className="text-sm text-red-600">{orderEntryErrors.po_number}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Delivery Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FormInput
                type="date"
                value={orderEntry.delivery_date}
                onChange={(e) => { setOrderEntry((o) => ({ ...o, delivery_date: e.target.value })); setOrderEntryErrors((prev) => ({ ...prev, delivery_date: undefined })); }}
                className="!mb-0"
                inputClassName="pr-9"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
            </div>
            {orderEntryErrors.delivery_date && <p className="text-sm text-red-600">{orderEntryErrors.delivery_date}</p>}
          </div>
          <div className="md:col-span-2 flex justify-end pt-2">
            <Button type="submit" disabled={orderEntrySaving || !canEdit}>
              {orderEntrySaving ? (editingOrderId ? 'Updating...' : 'Saving...') : (editingOrderId ? 'Edit Order' : 'Save Order')}
            </Button>
          </div>
        </form>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Yarn Receipt Details</h3>
          <Button onClick={openAddModal} disabled={!editingOrderId || !canEdit}>
            + Add Yarn Receipt
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">DC No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Details</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Yarn</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Colour</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">No of Bags</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bundles</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Knots</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Weight</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gross Weight</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    {editingOrderId
                      ? 'No yarn receipts for this order yet. Click "+ Add Yarn Receipt" to add one.'
                      : 'Save the order above first to add receipts for this order.'}
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{r.dc_no ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.vehicle_details ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-sm">{r.yarn ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.count ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.content ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.colour ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.type ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(r.no_of_bags)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(r.bundles)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(r.knots)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(r.net_weight)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(r.gross_weight)}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="text-sm text-[#312E81] hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Production Planning</h3>
          <Button onClick={openAddFabric} disabled={!editingOrderId || !canEdit}>
            + Add Fabric
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sl No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Design</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weave Technique</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Warp Count</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Warp Content</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weft Count</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weft Content</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Con Final Reed</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Con Final Pick</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Con On Loom Reed</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Con On Loom Pick</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">GSM Required</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Required Width</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">P.O Quantity</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price Per Metre</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fabricsLoading ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : fabrics.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-gray-500">
                    {editingOrderId
                      ? 'No fabric details for this order yet. Click "+ Add Fabric" to add one.'
                      : 'Save the order above first to add fabric details for this order.'}
                  </td>
                </tr>
              ) : (
                fabrics.map((f, idx) => (
                  <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{f.description ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.design ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.weave_technique ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.warp_count ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.warp_content ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.weft_count ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.weft_content ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(f.con_final_reed)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(f.con_final_pick)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(f.con_on_loom_reed)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(f.con_on_loom_pick)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(f.gsm_required)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(f.required_width)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(f.po_quantity)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNum(f.price_per_metre)}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <span className="flex items-center gap-2">
                          <button type="button" onClick={() => openEditFabric(f)} className="p-1 text-gray-500 hover:text-brand" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button type="button" onClick={() => deleteFabric(f)} className="p-1 text-gray-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isSuperAdmin && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Yarn Requirement</h3>
            <Button onClick={openAddYarnReq} disabled={!editingOrderId || !canEdit}>
              + Add
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sno</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Yarn Requirement</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Colour</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Required Weight</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {yarnRequirementsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : yarnRequirements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {editingOrderId
                        ? 'No yarn requirements yet. Click "+ Add" to add one.'
                        : 'Save the order above first to add yarn requirements.'}
                    </td>
                  </tr>
                ) : (
                  yarnRequirements.map((r, idx) => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.yarn_requirement ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.colour ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.count ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.content ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNum(r.required_weight)}</td>
                      <td className="px-4 py-3">
                        {canEdit && (
                          <span className="flex items-center gap-2">
                            <button type="button" onClick={() => openEditYarnReq(r)} className="p-1 text-gray-500 hover:text-brand" title="Edit"><Pencil className="w-4 h-4" /></button>
                            <button type="button" onClick={() => deleteYarnReq(r)} className="p-1 text-gray-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modalOpen && (
        <YarnReceiptModal
          receipt={editingReceipt}
          yarnOrders={yarnOrders}
          defaultYarnOrderId={editingOrderId}
          onClose={() => { setModalOpen(false); setEditingReceipt(null); }}
          onSaved={handleSaved}
        />
      )}
      {fabricModalOpen && editingOrderId && (
        <FabricModal
          yarnOrderId={editingOrderId}
          fabric={editingFabric}
          onClose={() => { setFabricModalOpen(false); setEditingFabric(null); }}
          onSaved={handleFabricSaved}
        />
      )}
      {isSuperAdmin && yarnReqModalOpen && editingOrderId && (
        <YarnRequirementModal
          yarnOrderId={editingOrderId}
          row={editingYarnReq}
          onClose={() => { setYarnReqModalOpen(false); setEditingYarnReq(null); }}
          onSaved={handleYarnReqSaved}
        />
      )}
    </div>
  );
}

const emptyForm = {
  dc_no: '',
  vehicle_details: '',
  date: '',
  yarn: '',
  count: '',
  content: '',
  colour: '',
  type: '',
  no_of_bags: '',
  bundles: '',
  knots: '',
  net_weight: '',
  gross_weight: '',
};

function YarnReceiptModal({ receipt, yarnOrders = [], defaultYarnOrderId = null, onClose, onSaved }) {
  const isEdit = Boolean(receipt?.id);
  const [form, setForm] = useState(isEdit ? {
    yarn_order_id: receipt.yarn_order_id ?? '',
    dc_no: receipt.dc_no ?? '',
    vehicle_details: receipt.vehicle_details ?? '',
    date: receipt.date ? (typeof receipt.date === 'string' ? receipt.date.slice(0, 10) : '') : '',
    yarn: receipt.yarn ?? '',
    count: receipt.count ?? '',
    content: receipt.content ?? '',
    colour: receipt.colour ?? '',
    type: receipt.type ?? '',
    no_of_bags: receipt.no_of_bags ?? '',
    bundles: receipt.bundles ?? '',
    knots: receipt.knots ?? '',
    net_weight: receipt.net_weight ?? '',
    gross_weight: receipt.gross_weight ?? '',
  } : { yarn_order_id: defaultYarnOrderId ? String(defaultYarnOrderId) : '', ...emptyForm });
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      yarn_order_id: form.yarn_order_id === '' ? null : Number(form.yarn_order_id),
      dc_no: form.dc_no || null,
      vehicle_details: form.vehicle_details || null,
      date: form.date || null,
      yarn: form.yarn || null,
      count: form.count || null,
      content: form.content || null,
      colour: form.colour || null,
      type: form.type || null,
      no_of_bags: form.no_of_bags === '' ? null : Number(form.no_of_bags),
      bundles: form.bundles === '' ? null : Number(form.bundles),
      knots: form.knots === '' ? null : Number(form.knots),
      net_weight: form.net_weight === '' ? null : Number(form.net_weight),
      gross_weight: form.gross_weight === '' ? null : Number(form.gross_weight),
    };
    try {
      if (isEdit) {
        await api.put(`/yarn-receipts/${receipt.id}`, payload);
        toast.success('Yarn receipt updated');
      } else {
        await api.post('/yarn-receipts', payload);
        toast.success('Yarn receipt added');
      }
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'space-y-1.5';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[10px] shadow-xl w-full max-w-[780px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {isEdit ? 'Edit Yarn Receipt' : 'Add Yarn Receipt'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {isEdit ? 'Update yarn receipt details.' : 'Enter yarn receipt details below.'}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Order (optional)</label>
                <FormSelect
                  value={form.yarn_order_id === '' ? '' : String(form.yarn_order_id)}
                  onChange={(e) => update('yarn_order_id', e.target.value === '' ? '' : e.target.value)}
                  options={[
                    { value: '', label: '— None —' },
                    ...yarnOrders.map((o) => ({
                      value: String(o.id),
                      label: [o.po_number, o.order_from, o.customer].filter(Boolean).join(' · ') || `Order #${o.id}`,
                    })),
                  ]}
                  className="!mb-0"
                />
              </div>
              <FormInput
                label="DC No"
                value={form.dc_no}
                onChange={(e) => update('dc_no', e.target.value)}
                placeholder="DC number"
                className={inputClass}
              />
              <FormInput
                label="Vehicle Details"
                value={form.vehicle_details}
                onChange={(e) => update('vehicle_details', e.target.value)}
                placeholder="Vehicle details"
                className={inputClass}
              />
              <FormInput
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className={inputClass}
              />
              <FormInput
                label="Yarn"
                value={form.yarn}
                onChange={(e) => update('yarn', e.target.value)}
                placeholder="Yarn"
                className={inputClass}
              />
              <FormInput
                label="Count"
                value={form.count}
                onChange={(e) => update('count', e.target.value)}
                placeholder="Count"
                className={inputClass}
              />
              <FormInput
                label="Content"
                value={form.content}
                onChange={(e) => update('content', e.target.value)}
                placeholder="Content"
                className={inputClass}
              />
              <FormInput
                label="Colour"
                value={form.colour}
                onChange={(e) => update('colour', e.target.value)}
                placeholder="Colour"
                className={inputClass}
              />
              <FormSelect
                label="Type"
                options={TYPE_OPTIONS}
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className={inputClass}
              />
              <FormInput
                label="No of Bags"
                type="number"
                min="0"
                value={form.no_of_bags}
                onChange={(e) => update('no_of_bags', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
              <FormInput
                label="Bundles"
                type="number"
                min="0"
                value={form.bundles}
                onChange={(e) => update('bundles', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
              <FormInput
                label="Knots"
                type="number"
                min="0"
                value={form.knots}
                onChange={(e) => update('knots', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
              <FormInput
                label="Net Weight"
                type="number"
                min="0"
                step="0.001"
                value={form.net_weight}
                onChange={(e) => update('net_weight', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
              <FormInput
                label="Gross Weight"
                type="number"
                min="0"
                step="0.001"
                value={form.gross_weight}
                onChange={(e) => update('gross_weight', e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const fabricEmptyForm = {
  description: '', design: '', weave_technique: '',
  warp_count: '', warp_content: '', weft_count: '', weft_content: '',
  con_final_reed: '', con_final_pick: '', con_on_loom_reed: '', con_on_loom_pick: '',
  gsm_required: '', required_width: '', po_quantity: '', price_per_metre: '',
};

function FabricModal({ yarnOrderId, fabric, onClose, onSaved }) {
  const isEdit = Boolean(fabric?.id);
  const [form, setForm] = useState(isEdit ? {
    description: fabric.description ?? '',
    design: fabric.design ?? '',
    weave_technique: fabric.weave_technique ?? '',
    warp_count: fabric.warp_count ?? '',
    warp_content: fabric.warp_content ?? '',
    weft_count: fabric.weft_count ?? '',
    weft_content: fabric.weft_content ?? '',
    con_final_reed: fabric.con_final_reed ?? '',
    con_final_pick: fabric.con_final_pick ?? '',
    con_on_loom_reed: fabric.con_on_loom_reed ?? '',
    con_on_loom_pick: fabric.con_on_loom_pick ?? '',
    gsm_required: fabric.gsm_required ?? '',
    required_width: fabric.required_width ?? '',
    po_quantity: fabric.po_quantity ?? '',
    price_per_metre: fabric.price_per_metre ?? '',
  } : { ...fabricEmptyForm });
  const [loading, setLoading] = useState(false);
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const base = {
      description: form.description || null,
      design: form.design || null,
      weave_technique: form.weave_technique || null,
      warp_count: form.warp_count || null,
      warp_content: form.warp_content || null,
      weft_count: form.weft_count || null,
      weft_content: form.weft_content || null,
      con_final_reed: form.con_final_reed === '' ? null : Number(form.con_final_reed),
      con_final_pick: form.con_final_pick === '' ? null : Number(form.con_final_pick),
      con_on_loom_reed: form.con_on_loom_reed === '' ? null : Number(form.con_on_loom_reed),
      con_on_loom_pick: form.con_on_loom_pick === '' ? null : Number(form.con_on_loom_pick),
      gsm_required: form.gsm_required === '' ? null : Number(form.gsm_required),
      required_width: form.required_width === '' ? null : Number(form.required_width),
      po_quantity: form.po_quantity === '' ? null : Number(form.po_quantity),
      price_per_metre: form.price_per_metre === '' ? null : Number(form.price_per_metre),
    };
    const payload = isEdit ? base : { ...base, yarn_order_id: yarnOrderId };
    const promise = isEdit ? api.put(`/fabrics/${fabric.id}`, payload) : api.post('/fabrics', payload);
    promise
      .then(() => { toast.success(isEdit ? 'Fabric updated' : 'Fabric details saved'); onSaved(); })
      .catch((err) => toast.error(err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save')))
      .finally(() => setLoading(false));
  };

  const cell = 'space-y-1.5';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-[10px] shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{isEdit ? 'Edit Fabric Details' : 'Add Fabric Details'}</h3>
          <p className="text-sm text-gray-500 mb-6">{(isEdit ? 'Update' : 'Enter')} fabric information below.</p>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} className={cell} />
              <FormInput label="Design" value={form.design} onChange={(e) => update('design', e.target.value)} className={cell} />
              <FormInput label="Weave Technique" value={form.weave_technique} onChange={(e) => update('weave_technique', e.target.value)} className={cell} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <FormInput label="Warp Count" value={form.warp_count} onChange={(e) => update('warp_count', e.target.value)} className={cell} />
              <FormInput label="Warp Content" value={form.warp_content} onChange={(e) => update('warp_content', e.target.value)} className={cell} />
              <FormInput label="Weft Count" value={form.weft_count} onChange={(e) => update('weft_count', e.target.value)} className={cell} />
              <FormInput label="Weft Content" value={form.weft_content} onChange={(e) => update('weft_content', e.target.value)} className={cell} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormInput label="Con Final Reed" type="number" step="any" value={form.con_final_reed} onChange={(e) => update('con_final_reed', e.target.value)} className={cell} />
              <FormInput label="Con Final Pick" type="number" step="any" value={form.con_final_pick} onChange={(e) => update('con_final_pick', e.target.value)} className={cell} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormInput label="Con On Loom Reed" type="number" step="any" value={form.con_on_loom_reed} onChange={(e) => update('con_on_loom_reed', e.target.value)} className={cell} />
              <FormInput label="Con On Loom Pick" type="number" step="any" value={form.con_on_loom_pick} onChange={(e) => update('con_on_loom_pick', e.target.value)} className={cell} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormInput label="GSM Required" type="number" step="any" value={form.gsm_required} onChange={(e) => update('gsm_required', e.target.value)} className={cell} />
              <FormInput label="Required Width" type="number" step="any" value={form.required_width} onChange={(e) => update('required_width', e.target.value)} className={cell} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormInput label="P.O Quantity" type="number" step="any" value={form.po_quantity} onChange={(e) => update('po_quantity', e.target.value)} className={cell} />
              <FormInput label="Price Per Metre" type="number" step="0.01" value={form.price_per_metre} onChange={(e) => update('price_per_metre', e.target.value)} className={cell} />
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function YarnRequirementModal({ yarnOrderId, row, onClose, onSaved }) {
  const isEdit = Boolean(row?.id);
  const [form, setForm] = useState(isEdit ? {
    yarn_requirement: row.yarn_requirement ?? '',
    colour: row.colour ?? '',
    count: row.count ?? '',
    content: row.content ?? '',
    required_weight: row.required_weight ?? '',
  } : {
    yarn_requirement: '',
    colour: '',
    count: '',
    content: '',
    required_weight: '',
  });
  const [loading, setLoading] = useState(false);
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      yarn_requirement: form.yarn_requirement || null,
      colour: form.colour || null,
      count: form.count || null,
      content: form.content || null,
      required_weight: form.required_weight === '' ? null : Number(form.required_weight),
    };
    const req = isEdit
      ? api.put(`/yarn-requirements/${row.id}`, payload)
      : api.post('/yarn-requirements', { ...payload, yarn_order_id: yarnOrderId });
    req
      .then(() => {
        toast.success(isEdit ? 'Yarn requirement updated' : 'Yarn requirement saved');
        onSaved();
      })
      .catch((err) => toast.error(err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save')))
      .finally(() => setLoading(false));
  };

  const cell = 'space-y-1.5';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-[10px] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{isEdit ? 'Edit Yarn Requirement' : 'Add Yarn Requirement'}</h3>
          <p className="text-sm text-gray-500 mb-6">{(isEdit ? 'Update' : 'Enter')} yarn requirement details below.</p>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Yarn Requirement" value={form.yarn_requirement} onChange={(e) => update('yarn_requirement', e.target.value)} placeholder="Yarn requirement" className={cell} />
              <FormInput label="Colour" value={form.colour} onChange={(e) => update('colour', e.target.value)} placeholder="Colour" className={cell} />
              <FormInput label="Count" value={form.count} onChange={(e) => update('count', e.target.value)} placeholder="Count" className={cell} />
              <FormInput label="Content" value={form.content} onChange={(e) => update('content', e.target.value)} placeholder="Content" className={cell} />
              <FormInput label="Required Weight" type="number" min="0" step="0.001" value={form.required_weight} onChange={(e) => update('required_weight', e.target.value)} placeholder="0" className={cell} />
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
