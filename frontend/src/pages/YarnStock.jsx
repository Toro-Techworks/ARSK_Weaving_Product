import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { FormInput, FormSelect } from '../components/FormInput';
import Button from '../components/Button';
import { usePagePermission } from '../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
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

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/yarn-orders', { params: { per_page: 100 } })
      .then(({ data }) => setOrders(data.data || []))
      .catch(() => toast.error('Failed to load yarn orders'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => fetch(), [fetch]);
  useRefreshOnSameMenuClick(fetch);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Yarn Stock</h2>
        <Button onClick={() => navigate('/yarn-stock/entry')} disabled={!canEdit} className="w-full sm:w-auto">
          New Order
        </Button>
      </div>
      <Card>
        <div className="overflow-x-auto min-w-0">
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

const YARN_RECEIPT_ROW_KEYS = [
  'dc_no', 'vehicle_details', 'date', 'yarn', 'count', 'content', 'colour', 'type',
  'no_of_bags', 'bundles', 'knots', 'net_weight', 'gross_weight',
];

function emptyYarnReceiptRow() {
  return {
    dc_no: '', vehicle_details: '', date: '', yarn: '', count: '', content: '', colour: '', type: '',
    no_of_bags: '', bundles: '', knots: '', net_weight: '', gross_weight: '',
  };
}

function receiptToRow(r) {
  return {
    dc_no: r.dc_no ?? '',
    vehicle_details: r.vehicle_details ?? '',
    date: r.date ? (typeof r.date === 'string' ? r.date.slice(0, 10) : '') : '',
    yarn: r.yarn ?? '',
    count: r.count ?? '',
    content: r.content ?? '',
    colour: r.colour ?? '',
    type: r.type ?? '',
    no_of_bags: r.no_of_bags ?? '',
    bundles: r.bundles ?? '',
    knots: r.knots ?? '',
    net_weight: r.net_weight ?? '',
    gross_weight: r.gross_weight ?? '',
  };
}

function rowToPayload(row) {
  return {
    dc_no: row.dc_no?.trim() || null,
    vehicle_details: row.vehicle_details?.trim() || null,
    date: row.date?.trim() || null,
    yarn: row.yarn?.trim() || null,
    count: row.count?.trim() || null,
    content: row.content?.trim() || null,
    colour: row.colour?.trim() || null,
    type: row.type?.trim() || null,
    no_of_bags: row.no_of_bags === '' ? null : Number(row.no_of_bags),
    bundles: row.bundles === '' ? null : Number(row.bundles),
    knots: row.knots === '' ? null : Number(row.knots),
    net_weight: row.net_weight === '' ? null : Number(row.net_weight),
    gross_weight: row.gross_weight === '' ? null : Number(row.gross_weight),
  };
}

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString();
}

function formatNum(val) {
  if (val == null || val === '') return '—';
  return Number(val);
}

// --- Production Planning (Fabrics) ---
const FABRIC_ROW_KEYS = [
  'description', 'design', 'weave_technique', 'warp_count', 'warp_content', 'weft_count', 'weft_content',
  'con_final_reed', 'con_final_pick', 'con_on_loom_reed', 'con_on_loom_pick',
  'gsm_required', 'required_width', 'po_quantity', 'price_per_metre',
];

function emptyFabricRow() {
  return {
    description: '', design: '', weave_technique: '', warp_count: '', warp_content: '', weft_count: '', weft_content: '',
    con_final_reed: '', con_final_pick: '', con_on_loom_reed: '', con_on_loom_pick: '',
    gsm_required: '', required_width: '', po_quantity: '', price_per_metre: '',
  };
}

function fabricToRow(f) {
  return {
    description: f.description ?? '', design: f.design ?? '', weave_technique: f.weave_technique ?? '',
    warp_count: f.warp_count ?? '', warp_content: f.warp_content ?? '', weft_count: f.weft_count ?? '', weft_content: f.weft_content ?? '',
    con_final_reed: f.con_final_reed ?? '', con_final_pick: f.con_final_pick ?? '', con_on_loom_reed: f.con_on_loom_reed ?? '', con_on_loom_pick: f.con_on_loom_pick ?? '',
    gsm_required: f.gsm_required ?? '', required_width: f.required_width ?? '', po_quantity: f.po_quantity ?? '', price_per_metre: f.price_per_metre ?? '',
  };
}

function fabricRowToPayload(row) {
  return {
    description: row.description?.trim() || null, design: row.design?.trim() || null, weave_technique: row.weave_technique?.trim() || null,
    warp_count: row.warp_count?.trim() || null, warp_content: row.warp_content?.trim() || null, weft_count: row.weft_count?.trim() || null, weft_content: row.weft_content?.trim() || null,
    con_final_reed: row.con_final_reed === '' ? null : Number(row.con_final_reed), con_final_pick: row.con_final_pick === '' ? null : Number(row.con_final_pick),
    con_on_loom_reed: row.con_on_loom_reed === '' ? null : Number(row.con_on_loom_reed), con_on_loom_pick: row.con_on_loom_pick === '' ? null : Number(row.con_on_loom_pick),
    gsm_required: row.gsm_required === '' ? null : Number(row.gsm_required), required_width: row.required_width === '' ? null : Number(row.required_width),
    po_quantity: row.po_quantity === '' ? null : Number(row.po_quantity), price_per_metre: row.price_per_metre === '' ? null : Number(row.price_per_metre),
  };
}

// --- Yarn Requirement ---
const YARN_REQ_ROW_KEYS = ['yarn_requirement', 'colour', 'count', 'content', 'required_weight'];

function emptyYarnReqRow() {
  return { yarn_requirement: '', colour: '', count: '', content: '', required_weight: '' };
}

function yarnReqToRow(r) {
  return {
    yarn_requirement: r.yarn_requirement ?? '', colour: r.colour ?? '', count: r.count ?? '', content: r.content ?? '', required_weight: r.required_weight ?? '',
  };
}

function yarnReqRowToPayload(row) {
  return {
    yarn_requirement: row.yarn_requirement?.trim() || null, colour: row.colour?.trim() || null, count: row.count?.trim() || null, content: row.content?.trim() || null,
    required_weight: row.required_weight === '' ? null : Number(row.required_weight),
  };
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
  const [yarnReceiptRows, setYarnReceiptRows] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [saveReceiptsLoading, setSaveReceiptsLoading] = useState(false);
  const [rowErrors, setRowErrors] = useState({});
  const [yarnOrders, setYarnOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const cellRefs = useRef({});
  const [orderEntry, setOrderEntry] = useState(orderEntryInitial);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderEntryErrors, setOrderEntryErrors] = useState({});
  const [orderEntrySaving, setOrderEntrySaving] = useState(false);
  const [fabrics, setFabrics] = useState([]);
  const [fabricsLoading, setFabricsLoading] = useState(false);
  const [fabricRows, setFabricRows] = useState([]);
  const [activeCellFabric, setActiveCellFabric] = useState(null);
  const [saveFabricsLoading, setSaveFabricsLoading] = useState(false);
  const [fabricRowErrors, setFabricRowErrors] = useState({});
  const fabricCellRefs = useRef({});
  const [yarnRequirements, setYarnRequirements] = useState([]);
  const [yarnRequirementsLoading, setYarnRequirementsLoading] = useState(false);
  const [yarnReqRows, setYarnReqRows] = useState([]);
  const [activeCellYarnReq, setActiveCellYarnReq] = useState(null);
  const [saveYarnReqLoading, setSaveYarnReqLoading] = useState(false);
  const [yarnReqRowErrors, setYarnReqRowErrors] = useState({});
  const yarnReqCellRefs = useRef({});

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
      setYarnReceiptRows([]);
      setFabrics([]);
      setFabricRows([]);
      setYarnRequirements([]);
      setYarnReqRows([]);
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

  // Sync receipts from API to editable rows
  useEffect(() => {
    if (receipts.length > 0) {
      setYarnReceiptRows(receipts.map(receiptToRow));
    } else if (editingOrderId) {
      setYarnReceiptRows([emptyYarnReceiptRow()]);
    } else {
      setYarnReceiptRows([]);
    }
  }, [receipts, editingOrderId]);

  // Sync fabrics from API to editable rows
  useEffect(() => {
    if (fabrics.length > 0) {
      setFabricRows(fabrics.map(fabricToRow));
    } else if (editingOrderId) {
      setFabricRows([emptyFabricRow()]);
    } else {
      setFabricRows([]);
    }
  }, [fabrics, editingOrderId]);

  // Sync yarn requirements from API to editable rows
  useEffect(() => {
    if (yarnRequirements.length > 0) {
      setYarnReqRows(yarnRequirements.map(yarnReqToRow));
    } else if (editingOrderId && isSuperAdmin) {
      setYarnReqRows([emptyYarnReqRow()]);
    } else {
      setYarnReqRows([]);
    }
  }, [yarnRequirements, editingOrderId, isSuperAdmin]);

  const handleCellChange = (rowIndex, field, value) => {
    setYarnReceiptRows((prev) => {
      const next = prev.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row));
      return next;
    });
  };

  const addRow = () => {
    setYarnReceiptRows((prev) => {
      const newLen = prev.length;
      setTimeout(() => {
        setActiveCell({ rowIndex: newLen, colKey: 'dc_no' });
        cellRefs.current[`${newLen}-dc_no`]?.focus();
      }, 0);
      return [...prev, emptyYarnReceiptRow()];
    });
  };

  const deleteRow = (rowIndex) => {
    setYarnReceiptRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setActiveCell(null);
  };

  const moveFocus = (rowIndex, colKey, direction) => {
    const cols = YARN_RECEIPT_ROW_KEYS;
    const colIdx = cols.indexOf(colKey);
    if (direction === 'next') {
      if (colIdx < cols.length - 1) {
        setActiveCell({ rowIndex, colKey: cols[colIdx + 1] });
        setTimeout(() => cellRefs.current[`${rowIndex}-${cols[colIdx + 1]}`]?.focus(), 0);
      } else if (rowIndex < yarnReceiptRows.length - 1) {
        setActiveCell({ rowIndex: rowIndex + 1, colKey: cols[0] });
        setTimeout(() => cellRefs.current[`${rowIndex + 1}-${cols[0]}`]?.focus(), 0);
      }
    } else if (direction === 'down') {
      if (rowIndex < yarnReceiptRows.length - 1) {
        setActiveCell({ rowIndex: rowIndex + 1, colKey });
        setTimeout(() => cellRefs.current[`${rowIndex + 1}-${colKey}`]?.focus(), 0);
      }
    }
  };

  const isRowEmpty = (row) => !row.dc_no?.trim() && !row.vehicle_details?.trim() && !row.date?.trim()
    && !row.yarn?.trim() && !row.count?.trim() && !row.content?.trim() && !row.colour?.trim()
    && !row.type?.trim() && row.no_of_bags === '' && row.bundles === '' && row.knots === ''
    && row.net_weight === '' && row.gross_weight === '';

  const saveAllRows = async () => {
    if (!editingOrderId) return;
    const errors = {};
    yarnReceiptRows.forEach((row, i) => {
      if (isRowEmpty(row)) return;
      if (!row.dc_no?.trim()) errors[i] = 'DC No is required when row has data';
    });
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please enter DC No for rows that have data.');
      return;
    }
    const rowsToSave = yarnReceiptRows.filter((row) => !isRowEmpty(row));
    setSaveReceiptsLoading(true);
    try {
      const payload = {
        yarn_order_id: editingOrderId,
        yarn_receipts: rowsToSave.map(rowToPayload),
      };
      await api.post('/yarn-receipts/bulk', payload);
      toast.success('Yarn receipts saved.');
      setRowErrors({});
      fetchReceipts(editingOrderId);
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save');
      toast.error(msg);
    } finally {
      setSaveReceiptsLoading(false);
    }
  };

  const isFabricRowEmpty = (row) => FABRIC_ROW_KEYS.every((k) => {
    const v = row[k];
    return v === '' || v == null;
  });
  const handleFabricCellChange = (rowIndex, field, value) => {
    setFabricRows((prev) => prev.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row)));
  };
  const addFabricRow = () => {
    setFabricRows((prev) => {
      const newLen = prev.length;
      setTimeout(() => {
        setActiveCellFabric({ rowIndex: newLen, colKey: FABRIC_ROW_KEYS[0] });
        fabricCellRefs.current[`${newLen}-${FABRIC_ROW_KEYS[0]}`]?.focus();
      }, 0);
      return [...prev, emptyFabricRow()];
    });
  };
  const deleteFabricRow = (rowIndex) => {
    setFabricRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setActiveCellFabric(null);
  };
  const moveFabricFocus = (rowIndex, colKey, direction) => {
    const cols = FABRIC_ROW_KEYS;
    const colIdx = cols.indexOf(colKey);
    if (direction === 'next') {
      if (colIdx < cols.length - 1) {
        setActiveCellFabric({ rowIndex, colKey: cols[colIdx + 1] });
        setTimeout(() => fabricCellRefs.current[`${rowIndex}-${cols[colIdx + 1]}`]?.focus(), 0);
      } else if (rowIndex < fabricRows.length - 1) {
        setActiveCellFabric({ rowIndex: rowIndex + 1, colKey: cols[0] });
        setTimeout(() => fabricCellRefs.current[`${rowIndex + 1}-${cols[0]}`]?.focus(), 0);
      }
    } else if (direction === 'down') {
      if (rowIndex < fabricRows.length - 1) {
        setActiveCellFabric({ rowIndex: rowIndex + 1, colKey });
        setTimeout(() => fabricCellRefs.current[`${rowIndex + 1}-${colKey}`]?.focus(), 0);
      }
    }
  };
  const saveAllFabrics = async () => {
    if (!editingOrderId) return;
    const rowsToSave = fabricRows.filter((row) => !isFabricRowEmpty(row));
    setSaveFabricsLoading(true);
    try {
      await api.post('/fabrics/bulk', { yarn_order_id: editingOrderId, fabrics: rowsToSave.map(fabricRowToPayload) });
      toast.success('Production planning saved.');
      fetchFabrics(editingOrderId);
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save');
      toast.error(msg);
    } finally {
      setSaveFabricsLoading(false);
    }
  };

  const isYarnReqRowEmpty = (row) => YARN_REQ_ROW_KEYS.every((k) => {
    const v = row[k];
    return v === '' || v == null;
  });
  const handleYarnReqCellChange = (rowIndex, field, value) => {
    setYarnReqRows((prev) => prev.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row)));
  };
  const addYarnReqRow = () => {
    setYarnReqRows((prev) => {
      const newLen = prev.length;
      setTimeout(() => {
        setActiveCellYarnReq({ rowIndex: newLen, colKey: YARN_REQ_ROW_KEYS[0] });
        yarnReqCellRefs.current[`${newLen}-${YARN_REQ_ROW_KEYS[0]}`]?.focus();
      }, 0);
      return [...prev, emptyYarnReqRow()];
    });
  };
  const deleteYarnReqRow = (rowIndex) => {
    setYarnReqRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setActiveCellYarnReq(null);
  };
  const moveYarnReqFocus = (rowIndex, colKey, direction) => {
    const cols = YARN_REQ_ROW_KEYS;
    const colIdx = cols.indexOf(colKey);
    if (direction === 'next') {
      if (colIdx < cols.length - 1) {
        setActiveCellYarnReq({ rowIndex, colKey: cols[colIdx + 1] });
        setTimeout(() => yarnReqCellRefs.current[`${rowIndex}-${cols[colIdx + 1]}`]?.focus(), 0);
      } else if (rowIndex < yarnReqRows.length - 1) {
        setActiveCellYarnReq({ rowIndex: rowIndex + 1, colKey: cols[0] });
        setTimeout(() => yarnReqCellRefs.current[`${rowIndex + 1}-${cols[0]}`]?.focus(), 0);
      }
    } else if (direction === 'down') {
      if (rowIndex < yarnReqRows.length - 1) {
        setActiveCellYarnReq({ rowIndex: rowIndex + 1, colKey });
        setTimeout(() => yarnReqCellRefs.current[`${rowIndex + 1}-${colKey}`]?.focus(), 0);
      }
    }
  };
  const saveAllYarnReqRows = async () => {
    if (!editingOrderId) return;
    const rowsToSave = yarnReqRows.filter((row) => !isYarnReqRowEmpty(row));
    setSaveYarnReqLoading(true);
    try {
      await api.post('/yarn-requirements/bulk', { yarn_order_id: editingOrderId, yarn_requirements: rowsToSave.map(yarnReqRowToPayload) });
      toast.success('Yarn requirements saved.');
      fetchYarnRequirements(editingOrderId);
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save');
      toast.error(msg);
    } finally {
      setSaveYarnReqLoading(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Yarn Stock Entry</h2>
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

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Yarn Receipt Details</h3>
          <div className="flex flex-wrap gap-2">
            {editingOrderId && canEdit && (
              <>
                <Button variant="secondary" onClick={addRow} className="w-full sm:w-auto">+ Add Row</Button>
                <Button onClick={saveAllRows} disabled={saveReceiptsLoading} className="w-full sm:w-auto">
                  {saveReceiptsLoading ? 'Saving...' : 'Save All'}
                </Button>
              </>
            )}
          </div>
        </div>

        {!editingOrderId ? (
          <p className="text-sm text-gray-500 py-6">Select an order from the Yarn Stock list to add receipt details.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">DC No</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Vehicle Details</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Date</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Yarn</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Count</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Content</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Colour</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Type</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">No of Bags</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Bundles</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Knots</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Net Weight</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Gross Weight</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-14">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : (
                  yarnReceiptRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`border-t border-gray-100 ${activeCell?.rowIndex === rowIndex ? 'bg-brand/5' : 'hover:bg-gray-50/80'}`}
                    >
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-dc_no`] = el; }}
                          type="text"
                          value={row.dc_no}
                          onChange={(e) => { handleCellChange(rowIndex, 'dc_no', e.target.value); setRowErrors((prev) => ({ ...prev, [rowIndex]: undefined })); }}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'dc_no', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'dc_no', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'dc_no' })}
                          className={`w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b focus:ring-1 focus:outline-none rounded ${rowErrors[rowIndex] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-transparent focus:border-brand focus:ring-brand'}`}
                          placeholder="DC No"
                          readOnly={!canEdit}
                          title={rowErrors[rowIndex]}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-vehicle_details`] = el; }}
                          type="text"
                          value={row.vehicle_details}
                          onChange={(e) => handleCellChange(rowIndex, 'vehicle_details', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'vehicle_details', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'vehicle_details', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'vehicle_details' })}
                          className="w-full min-w-[100px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded"
                          placeholder="Vehicle"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-date`] = el; }}
                          type="date"
                          value={row.date}
                          onChange={(e) => handleCellChange(rowIndex, 'date', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'date', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'date', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'date' })}
                          className="w-full min-w-[110px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-yarn`] = el; }}
                          type="text"
                          value={row.yarn}
                          onChange={(e) => handleCellChange(rowIndex, 'yarn', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'yarn', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'yarn', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'yarn' })}
                          className="w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded"
                          placeholder="Yarn"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-count`] = el; }}
                          type="text"
                          inputMode="numeric"
                          value={row.count}
                          onChange={(e) => handleCellChange(rowIndex, 'count', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'count', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'count', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'count' })}
                          className="w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded text-right"
                          placeholder="Count"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-content`] = el; }}
                          type="text"
                          value={row.content}
                          onChange={(e) => handleCellChange(rowIndex, 'content', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'content', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'content', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'content' })}
                          className="w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded"
                          placeholder="Content"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-colour`] = el; }}
                          type="text"
                          value={row.colour}
                          onChange={(e) => handleCellChange(rowIndex, 'colour', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'colour', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'colour', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'colour' })}
                          className="w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded"
                          placeholder="Colour"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <select
                          ref={(el) => { cellRefs.current[`${rowIndex}-type`] = el; }}
                          value={row.type}
                          onChange={(e) => handleCellChange(rowIndex, 'type', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'type', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'type', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'type' })}
                          className="w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded bg-transparent"
                          readOnly={!canEdit}
                          disabled={!canEdit}
                        >
                          <option value="">—</option>
                          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-no_of_bags`] = el; }}
                          type="number"
                          min="0"
                          value={row.no_of_bags}
                          onChange={(e) => handleCellChange(rowIndex, 'no_of_bags', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'no_of_bags', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'no_of_bags', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'no_of_bags' })}
                          className="w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded text-right"
                          placeholder="0"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-bundles`] = el; }}
                          type="number"
                          min="0"
                          value={row.bundles}
                          onChange={(e) => handleCellChange(rowIndex, 'bundles', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'bundles', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'bundles', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'bundles' })}
                          className="w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded text-right"
                          placeholder="0"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-knots`] = el; }}
                          type="number"
                          min="0"
                          value={row.knots}
                          onChange={(e) => handleCellChange(rowIndex, 'knots', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'knots', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'knots', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'knots' })}
                          className="w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded text-right"
                          placeholder="0"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-net_weight`] = el; }}
                          type="number"
                          min="0"
                          step="0.001"
                          value={row.net_weight}
                          onChange={(e) => handleCellChange(rowIndex, 'net_weight', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'net_weight', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'net_weight', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'net_weight' })}
                          className="w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded text-right"
                          placeholder="0"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={(el) => { cellRefs.current[`${rowIndex}-gross_weight`] = el; }}
                          type="number"
                          min="0"
                          step="0.001"
                          value={row.gross_weight}
                          onChange={(e) => handleCellChange(rowIndex, 'gross_weight', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFocus(rowIndex, 'gross_weight', 'next'); } if (e.key === 'Enter') moveFocus(rowIndex, 'gross_weight', 'down'); }}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'gross_weight' })}
                          className="w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded text-right"
                          placeholder="0"
                          readOnly={!canEdit}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => deleteRow(rowIndex)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            title="Delete row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Production Planning</h3>
          <div className="flex items-center gap-2">
            {editingOrderId && canEdit && (
              <>
                <Button variant="secondary" onClick={addFabricRow}>+ Add Row</Button>
                <Button onClick={saveAllFabrics} disabled={saveFabricsLoading}>
                  {saveFabricsLoading ? 'Saving...' : 'Save All'}
                </Button>
              </>
            )}
          </div>
        </div>
        {!editingOrderId ? (
          <p className="text-sm text-gray-500 py-6">Select an order from the Yarn Stock list to add production planning.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-12">Sl No</th>
                  {FABRIC_ROW_KEYS.map((k) => (
                    <th key={k} className={`px-2 py-2 text-xs font-medium text-gray-500 uppercase whitespace-nowrap ${['con_final_reed', 'con_final_pick', 'con_on_loom_reed', 'con_on_loom_pick', 'gsm_required', 'required_width', 'po_quantity', 'price_per_metre'].includes(k) ? 'text-right' : 'text-left'}`}>
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-14">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fabricsLoading ? (
                  <tr>
                    <td colSpan={FABRIC_ROW_KEYS.length + 2} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : (
                  fabricRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`border-t border-gray-100 ${activeCellFabric?.rowIndex === rowIndex ? 'bg-brand/5' : 'hover:bg-gray-50/80'}`}
                    >
                      <td className="px-2 py-1.5 text-sm text-gray-500 align-top">{rowIndex + 1}</td>
                      {FABRIC_ROW_KEYS.map((colKey) => {
                        const isNum = ['con_final_reed', 'con_final_pick', 'con_on_loom_reed', 'con_on_loom_pick', 'gsm_required', 'required_width', 'po_quantity', 'price_per_metre'].includes(colKey);
                        return (
                          <td key={colKey} className="p-0 align-top">
                            <input
                              ref={(el) => { fabricCellRefs.current[`${rowIndex}-${colKey}`] = el; }}
                              type={isNum ? 'text' : 'text'}
                              inputMode={isNum ? 'decimal' : 'text'}
                              value={row[colKey]}
                              onChange={(e) => handleFabricCellChange(rowIndex, colKey, e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveFabricFocus(rowIndex, colKey, 'next'); } if (e.key === 'Enter') moveFabricFocus(rowIndex, colKey, 'down'); }}
                              onFocus={() => setActiveCellFabric({ rowIndex, colKey })}
                              className={`w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded ${isNum ? 'text-right' : ''}`}
                              placeholder={colKey.replace(/_/g, ' ')}
                              readOnly={!canEdit}
                            />
                          </td>
                        );
                      })}
                      <td className="p-1 align-top">
                        {canEdit && (
                          <button type="button" onClick={() => deleteFabricRow(rowIndex)} className="p-1 text-gray-500 hover:text-red-600" title="Delete row"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isSuperAdmin && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Yarn Requirement</h3>
            <div className="flex items-center gap-2">
              {editingOrderId && canEdit && (
                <>
                  <Button variant="secondary" onClick={addYarnReqRow}>+ Add Row</Button>
                  <Button onClick={saveAllYarnReqRows} disabled={saveYarnReqLoading}>
                    {saveYarnReqLoading ? 'Saving...' : 'Save All'}
                  </Button>
                </>
              )}
            </div>
          </div>
          {!editingOrderId ? (
            <p className="text-sm text-gray-500 py-6">Select an order from the Yarn Stock list to add yarn requirements.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-12">Sno</th>
                    {YARN_REQ_ROW_KEYS.map((k) => (
                      <th key={k} className={`px-2 py-2 text-xs font-medium text-gray-500 uppercase whitespace-nowrap ${k === 'required_weight' ? 'text-right' : 'text-left'}`}>
                        {k.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-14">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {yarnRequirementsLoading ? (
                    <tr>
                      <td colSpan={YARN_REQ_ROW_KEYS.length + 2} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : (
                    yarnReqRows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={`border-t border-gray-100 ${activeCellYarnReq?.rowIndex === rowIndex ? 'bg-brand/5' : 'hover:bg-gray-50/80'}`}
                      >
                        <td className="px-2 py-1.5 text-sm text-gray-500 align-top">{rowIndex + 1}</td>
                        {YARN_REQ_ROW_KEYS.map((colKey) => (
                          <td key={colKey} className="p-0 align-top">
                            <input
                              ref={(el) => { yarnReqCellRefs.current[`${rowIndex}-${colKey}`] = el; }}
                              type="text"
                              inputMode={colKey === 'required_weight' ? 'decimal' : 'text'}
                              value={row[colKey]}
                              onChange={(e) => handleYarnReqCellChange(rowIndex, colKey, e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); moveYarnReqFocus(rowIndex, colKey, 'next'); } if (e.key === 'Enter') moveYarnReqFocus(rowIndex, colKey, 'down'); }}
                              onFocus={() => setActiveCellYarnReq({ rowIndex, colKey })}
                              className={`w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none rounded ${colKey === 'required_weight' ? 'text-right' : ''}`}
                              placeholder={colKey.replace(/_/g, ' ')}
                              readOnly={!canEdit}
                            />
                          </td>
                        ))}
                        <td className="p-1 align-top">
                          {canEdit && (
                            <button type="button" onClick={() => deleteYarnReqRow(rowIndex)} className="p-1 text-gray-500 hover:text-red-600" title="Delete row"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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
