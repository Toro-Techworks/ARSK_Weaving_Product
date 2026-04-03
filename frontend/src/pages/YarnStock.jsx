import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Card } from '../components/Card';
import { FormInput, FormSelect } from '../components/FormInput';
import Button from '../components/Button';
import { usePagePermission } from '../hooks/usePagePermission';
import { useRefreshOnSameMenuClick } from '../hooks/useRefreshOnSameMenuClick';
import { useAuth } from '../context/AuthContext';
import { TablePagination } from '../components/TablePagination';
import { normalizePaginatedResponse, fetchAllPaginated } from '../utils/pagination';
import SearchableSelect from '../components/ui/SearchableSelect';
import {
  GENERIC_CODE_TYPES,
  FALLBACK_YARN_RECEIPT_TYPES,
  FALLBACK_YARN_COLOURS,
  FALLBACK_YARN_RECEIPT_COUNT_CONTENT,
  FALLBACK_PLANNING_COLOURS,
} from '../constants/genericCodeTypes';
import MultiColourInput from '../components/ui/MultiColourInput';
import { useGenericCode } from '../hooks/useGenericCode';
import { handleGridNavKeyDown } from '../utils/gridKeyboardNav';
import { formatOrderId } from '../utils/formatOrderId';
import { isLoomInactiveStatus } from '../utils/loomStatus';

function formatOrderDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString();
}

/** List of yarn orders; row opens Yarn Stock Entry for that order */
export function YarnStockList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/yarn-orders', { params: { page, per_page: perPage } })
      .then(({ data }) => {
        const n = normalizePaginatedResponse(data);
        setOrders(n.data);
        setMeta({ current_page: n.current_page, last_page: n.last_page, per_page: n.per_page, total: n.total });
      })
      .catch(() => toast.error('Failed to load yarn orders'))
      .finally(() => setLoading(false));
  }, [page, perPage]);
  useEffect(() => fetch(), [fetch]);
  useRefreshOnSameMenuClick(fetch);

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Yarn Stock</h2>
      <Card>
        <div className="overflow-x-auto min-w-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
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
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No yarn orders yet.</td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/yarn-stock/entry/${o.id}`)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-600">{o.display_order_id ?? '—'}</td>
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
    </div>
  );
}

function yarnReceiptTypeIsCone(type) {
  return String(type ?? '').trim().toLowerCase() === 'cone';
}
function yarnReceiptTypeIsHank(type) {
  return String(type ?? '').trim().toLowerCase() === 'hank';
}

/** Cone: bags only. Hank: bundles + knots only. */
function receiptQtyPayloadForType(row) {
  const no_of_bags = row.no_of_bags === '' ? null : Number(row.no_of_bags);
  const bundles = row.bundles === '' ? null : Number(row.bundles);
  const knots = row.knots === '' ? null : Number(row.knots);
  return {
    no_of_bags: yarnReceiptTypeIsHank(row.type) ? null : no_of_bags,
    bundles: yarnReceiptTypeIsCone(row.type) ? null : bundles,
    knots: yarnReceiptTypeIsCone(row.type) ? null : knots,
  };
}

const YARN_RECEIPT_ROW_KEYS = [
  'dc_no', 'vehicle_details', 'date', 'colour', 'count', 'content', 'type',
  'no_of_bags', 'bundles', 'knots', 'net_weight', 'gross_weight',
];

function emptyYarnReceiptRow() {
  return {
    id: null,
    dc_no: '', vehicle_details: '', date: '', colour: '', count: '', content: '', type: '',
    no_of_bags: '', bundles: '', knots: '', net_weight: '', gross_weight: '',
  };
}

/** Case-insensitive trimmed DC match for duplicate detection within an order's receipt grid. */
function normalizeDcNo(dc) {
  return (dc ?? '').trim().toLowerCase();
}

function receiptToRow(r) {
  return {
    id: r.id ?? null,
    dc_no: r.dc_no ?? '',
    vehicle_details: r.vehicle_details ?? '',
    date: r.date ? (typeof r.date === 'string' ? r.date.slice(0, 10) : '') : '',
    colour: r.colour ?? '',
    count: r.count ?? '',
    content: r.content ?? '',
    type: r.type ?? '',
    no_of_bags: r.no_of_bags ?? '',
    bundles: r.bundles ?? '',
    knots: r.knots ?? '',
    net_weight: r.net_weight ?? '',
    gross_weight: r.gross_weight ?? '',
  };
}

function rowToPayload(row) {
  const qty = receiptQtyPayloadForType(row);
  return {
    dc_no: row.dc_no?.trim() || null,
    vehicle_details: row.vehicle_details?.trim() || null,
    date: row.date?.trim() || null,
    colour: row.colour?.trim() || null,
    count: row.count?.trim() || null,
    content: row.content?.trim() || null,
    type: row.type?.trim() || null,
    ...qty,
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
  'description', 'colour', 'design', 'weave_technique', 'warp_count', 'warp_content', 'weft_count', 'weft_content',
  'con_on_loom_reed', 'con_on_loom_pick', 'con_final_reed', 'con_final_pick',
  'gsm_required', 'actual_gsm', 'required_width', 'po_quantity', 'price_per_metre',
];
/** Leading columns: one label each, header uses rowSpan 2. */
const FABRIC_HEADER_LEADING_KEYS = FABRIC_ROW_KEYS.slice(0, 4);
/** Numeric columns after Con On Loom / Con Final groups, header uses rowSpan 2. */
const FABRIC_HEADER_TAIL_KEYS = FABRIC_ROW_KEYS.slice(12);

/** Grid header / cell placeholder; API field names unchanged. */
function fabricGridColumnLabel(key) {
  if (key === 'gsm_required') return 'gsm rqd';
  if (key === 'actual_gsm') return 'Actual GSM';
  if (key === 'required_width') return 'Width';
  if (key === 'po_quantity') return 'PO Qty';
  return key.replace(/_/g, ' ');
}

function emptyFabricRow() {
  return {
    id: null,
    sl_number: '',
    loom_id: '',
    description: '', colour: '', design: '', weave_technique: '', warp_count: '', warp_content: '', weft_count: '', weft_content: '',
    con_on_loom_reed: '', con_on_loom_pick: '', con_final_reed: '', con_final_pick: '',
    gsm_required: '', actual_gsm: '', required_width: '', po_quantity: '', price_per_metre: '',
  };
}

function fabricToRow(f) {
  return {
    id: f.id ?? null,
    sl_number: f.sl_number != null && f.sl_number !== '' ? String(f.sl_number) : '',
    loom_id: '',
    description: f.description ?? '', colour: f.colour ?? '', design: f.design ?? '', weave_technique: f.weave_technique ?? '',
    warp_count: f.warp_count ?? '', warp_content: f.warp_content ?? '', weft_count: f.weft_count ?? '', weft_content: f.weft_content ?? '',
    con_on_loom_reed: f.con_on_loom_reed ?? '', con_on_loom_pick: f.con_on_loom_pick ?? '', con_final_reed: f.con_final_reed ?? '', con_final_pick: f.con_final_pick ?? '',
    gsm_required: f.gsm_required ?? '', actual_gsm: f.actual_gsm ?? '', required_width: f.required_width ?? '', po_quantity: f.po_quantity ?? '', price_per_metre: f.price_per_metre ?? '',
  };
}

function fabricRowToPayload(row) {
  return {
    description: row.description?.trim() || null,
    colour: row.colour?.trim() || null,
    design: row.design?.trim() || null,
    weave_technique: row.weave_technique?.trim() || null,
    warp_count: row.warp_count?.trim() || null, warp_content: row.warp_content?.trim() || null, weft_count: row.weft_count?.trim() || null, weft_content: row.weft_content?.trim() || null,
    con_on_loom_reed: row.con_on_loom_reed === '' ? null : Number(row.con_on_loom_reed), con_on_loom_pick: row.con_on_loom_pick === '' ? null : Number(row.con_on_loom_pick),
    con_final_reed: row.con_final_reed === '' ? null : Number(row.con_final_reed), con_final_pick: row.con_final_pick === '' ? null : Number(row.con_final_pick),
    gsm_required: row.gsm_required === '' ? null : Number(row.gsm_required),
    actual_gsm: row.actual_gsm === '' ? null : Number(row.actual_gsm),
    required_width: row.required_width === '' ? null : Number(row.required_width),
    po_quantity: row.po_quantity === '' ? null : Number(row.po_quantity), price_per_metre: row.price_per_metre === '' ? null : Number(row.price_per_metre),
  };
}

// --- Yarn Requirement ---
const YARN_REQ_ROW_KEYS = ['yarn_requirement', 'colour', 'count', 'content', 'required_weight'];

const RECEIPT_GRID_COLS = YARN_RECEIPT_ROW_KEYS.length;
const FABRIC_GRID_COLS = FABRIC_ROW_KEYS.length;
const YARN_REQ_GRID_COLS = YARN_REQ_ROW_KEYS.length;

function emptyYarnReqRow() {
  return { id: null, yarn_requirement: '', colour: '', count: '', content: '', required_weight: '' };
}

function yarnReqToRow(r) {
  return {
    id: r.id ?? null,
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
  const { options: yarnReceiptTypeOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_RECEIPT_TYPE, {
    fallback: FALLBACK_YARN_RECEIPT_TYPES,
  });
  const { options: yarnColourOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_COLOUR, {
    fallback: FALLBACK_YARN_COLOURS,
    dropdownType: 'MASTER',
  });
  const { options: yarnReceiptCountOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_RECEIPT_COUNT, {
    fallback: FALLBACK_YARN_RECEIPT_COUNT_CONTENT,
    dropdownType: 'MASTER',
  });
  const { options: yarnReceiptContentOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_RECEIPT_CONTENT, {
    fallback: FALLBACK_YARN_RECEIPT_COUNT_CONTENT,
    dropdownType: 'MASTER',
  });
  const { options: fabricColourOptions } = useGenericCode(GENERIC_CODE_TYPES.COLOUR, {
    fallback: FALLBACK_PLANNING_COLOURS,
    dropdownType: 'MASTER',
  });
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');
  const [receipts, setReceipts] = useState([]);
  const [yarnReceiptRows, setYarnReceiptRows] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  /** Row index that must be saved before add / edit another / delete another; null when none. */
  const [yarnReceiptSessionIndex, setYarnReceiptSessionIndex] = useState(null);
  const [savingYarnReceiptRowIndex, setSavingYarnReceiptRowIndex] = useState(null);
  const [rowErrors, setRowErrors] = useState({});
  /** Saved receipt row ids currently in edit mode; new rows (no id) are always editable until first save. */
  const [yarnReceiptEditIds, setYarnReceiptEditIds] = useState(() => new Set());
  const [yarnOrders, setYarnOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const receiptMatrixRef = useRef([]);
  const [orderEntry, setOrderEntry] = useState(orderEntryInitial);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderEntryErrors, setOrderEntryErrors] = useState({});
  const [orderEntrySaving, setOrderEntrySaving] = useState(false);
  const [fabrics, setFabrics] = useState([]);
  const [fabricsLoading, setFabricsLoading] = useState(false);
  const [loomsForOrder, setLoomsForOrder] = useState([]);
  const [fabricRows, setFabricRows] = useState([]);
  const [activeCellFabric, setActiveCellFabric] = useState(null);
  /** Row index that must be saved before add / edit another / delete another; null when none. */
  const [fabricSessionIndex, setFabricSessionIndex] = useState(null);
  const [savingFabricRowIndex, setSavingFabricRowIndex] = useState(null);
  /** Saved fabric row ids currently in edit mode; new rows (no id) are always editable until first save. */
  const [fabricEditIds, setFabricEditIds] = useState(() => new Set());
  const fabricMatrixRef = useRef([]);
  const fabricRowsRef = useRef(fabricRows);
  fabricRowsRef.current = fabricRows;
  const fabricEditIdsRef = useRef(fabricEditIds);
  fabricEditIdsRef.current = fabricEditIds;
  const [yarnRequirements, setYarnRequirements] = useState([]);
  const [yarnRequirementsLoading, setYarnRequirementsLoading] = useState(false);
  const [yarnReqRows, setYarnReqRows] = useState([]);
  const [activeCellYarnReq, setActiveCellYarnReq] = useState(null);
  /** Row index that must be saved before add / edit another / delete another; null when none. */
  const [yarnReqSessionIndex, setYarnReqSessionIndex] = useState(null);
  const [savingYarnReqRowIndex, setSavingYarnReqRowIndex] = useState(null);
  /** Saved yarn requirement row ids currently in edit mode; new rows (no id) are always editable until first save. */
  const [yarnReqEditIds, setYarnReqEditIds] = useState(() => new Set());
  const [yarnReqRowErrors, setYarnReqRowErrors] = useState({});
  const yarnReqMatrixRef = useRef([]);
  const yarnReqRowsRef = useRef(yarnReqRows);
  yarnReqRowsRef.current = yarnReqRows;
  const yarnReqEditIdsRef = useRef(yarnReqEditIds);
  yarnReqEditIdsRef.current = yarnReqEditIds;

  const setReceiptCell = (r, c) => (el) => {
    if (!receiptMatrixRef.current[r]) receiptMatrixRef.current[r] = [];
    receiptMatrixRef.current[r][c] = el;
  };
  const setFabricCell = (r, c) => (el) => {
    if (!fabricMatrixRef.current[r]) fabricMatrixRef.current[r] = [];
    fabricMatrixRef.current[r][c] = el;
  };
  const setYarnReqCell = (r, c) => (el) => {
    if (!yarnReqMatrixRef.current[r]) yarnReqMatrixRef.current[r] = [];
    yarnReqMatrixRef.current[r][c] = el;
  };

  const fetchReceipts = (orderId) => {
    setLoading(true);
    if (!orderId) {
      setReceipts([]);
      setLoading(false);
      return;
    }
    fetchAllPaginated(api, '/yarn-receipts', { perPage: 100, yarn_order_id: orderId })
      .then(setReceipts)
      .catch(() => toast.error('Failed to load yarn receipts'))
      .finally(() => setLoading(false));
  };

  const fetchYarnOrders = () => {
    fetchAllPaginated(api, '/yarn-orders', { perPage: 100 })
      .then(setYarnOrders)
      .catch(() => toast.error('Failed to load yarn orders'));
  };

  const fetchFabrics = (yarnOrderId) => {
    if (!yarnOrderId) {
      setFabrics([]);
      return;
    }
    setFabricsLoading(true);
    fetchAllPaginated(api, `/fabrics/yarn-order/${yarnOrderId}`, { perPage: 100 })
      .then(setFabrics)
      .catch(() => toast.error('Failed to load fabric details'))
      .finally(() => setFabricsLoading(false));
  };

  const fetchYarnRequirements = (yarnOrderId) => {
    if (!yarnOrderId) {
      setYarnRequirements([]);
      return;
    }
    setYarnRequirementsLoading(true);
    fetchAllPaginated(api, `/yarn-requirements/yarn-order/${yarnOrderId}`, { perPage: 100 })
      .then(setYarnRequirements)
      .catch(() => toast.error('Failed to load yarn requirements'))
      .finally(() => setYarnRequirementsLoading(false));
  };

  /** Full loom list for Production Planning: dropdown shows all active looms; mapping uses fabric_id on any loom. */
  const fetchLoomsForOrder = (yarnOrderId) => {
    if (!yarnOrderId) {
      setLoomsForOrder([]);
      return Promise.resolve([]);
    }
    return api
      .get('/looms-list')
      .then(({ data }) => {
        const list = data?.data || [];
        setLoomsForOrder(list);
        return list;
      })
      .catch(() => {
        setLoomsForOrder([]);
        return [];
      });
  };

  // `fabrics` API now includes `loom_id`, so we don't need to infer assignments from looms.

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
      setLoomsForOrder([]);
      setYarnRequirements([]);
      setYarnReqRows([]);
      setLoading(false);
      return;
    }
    if (justLoadedOrderIdRef.current === editingOrderId) {
      justLoadedOrderIdRef.current = null;
      fetchLoomsForOrder(editingOrderId);
      return;
    }
    fetchReceipts(editingOrderId);
    fetchFabrics(editingOrderId);
    fetchYarnRequirements(editingOrderId);
    fetchLoomsForOrder(editingOrderId);
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

  useEffect(() => {
    setYarnReceiptEditIds(new Set());
    setYarnReceiptSessionIndex(null);
    setSavingYarnReceiptRowIndex(null);
  }, [editingOrderId]);

  useEffect(() => {
    setFabricEditIds(new Set());
    setFabricSessionIndex(null);
    setSavingFabricRowIndex(null);
  }, [editingOrderId]);

  // Sync fabrics from API to editable rows
  useEffect(() => {
    if (fabrics.length > 0) {
      setFabricRows(
        fabrics.map((f) => ({
          ...fabricToRow(f),
          loom_id: f?.loom_id != null && f.loom_id !== '' ? String(f.loom_id) : '',
        })),
      );
    } else if (editingOrderId) {
      setFabricRows([emptyFabricRow()]);
    } else {
      setFabricRows([]);
    }
  }, [fabrics, editingOrderId]);

  useEffect(() => {
    setFabricSessionIndex((idx) => {
      if (idx == null) return null;
      return idx >= fabricRows.length ? null : idx;
    });
  }, [fabricRows.length]);

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

  useEffect(() => {
    setYarnReqEditIds(new Set());
    setYarnReqSessionIndex(null);
    setSavingYarnReqRowIndex(null);
  }, [editingOrderId]);

  useEffect(() => {
    setYarnReqSessionIndex((idx) => {
      if (idx == null) return null;
      return idx >= yarnReqRows.length ? null : idx;
    });
  }, [yarnReqRows.length]);

  const ensureYarnReceiptSession = useCallback((rowIndex) => {
    const row = yarnReceiptRows[rowIndex];
    if (!row || !canEdit) return;
    if (row.id != null && !yarnReceiptEditIds.has(row.id)) return;
    setYarnReceiptSessionIndex(rowIndex);
  }, [yarnReceiptRows, yarnReceiptEditIds, canEdit]);

  const ensureFabricSession = useCallback((rowIndex) => {
    const row = fabricRows[rowIndex];
    if (!row || !canEdit) return;
    if (row.id != null && !fabricEditIds.has(row.id)) return;
    setFabricSessionIndex(rowIndex);
  }, [fabricRows, fabricEditIds, canEdit]);

  const handleCellChange = (rowIndex, field, value) => {
    const row = yarnReceiptRows[rowIndex];
    if (!row || !canEdit) return;
    if (row.id != null && !yarnReceiptEditIds.has(row.id)) return;
    setYarnReceiptSessionIndex(rowIndex);
    setYarnReceiptRows((prev) => {
      if (field === 'type') {
        return prev.map((row, i) => {
          if (i !== rowIndex) return row;
          const next = { ...row, type: value };
          if (value === 'Cone') {
            next.bundles = '';
            next.knots = '';
          } else if (value === 'Hank') {
            next.no_of_bags = '';
          }
          return next;
        });
      }
      if (field !== 'dc_no') {
        return prev.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row));
      }
      const key = normalizeDcNo(value);
      const patch = { dc_no: value };
      if (key) {
        const source = prev.find((row, i) => i !== rowIndex && normalizeDcNo(row.dc_no) === key);
        if (source) {
          patch.vehicle_details = source.vehicle_details ?? '';
          patch.date = source.date ?? '';
        }
      }
      return prev.map((row, i) => (i === rowIndex ? { ...row, ...patch } : row));
    });
  };

  const addRow = () => {
    if (yarnReceiptSessionIndex !== null) {
      toast.error('Save the current row in the Actions column before adding another.');
      return;
    }
    const lastReceipt = yarnReceiptRows[yarnReceiptRows.length - 1];
    if (yarnReceiptRows.length > 0 && isRowEmpty(lastReceipt)) {
      toast.error('Fill the current row before adding another.');
      return;
    }
    setYarnReceiptRows((prev) => {
      const newIdx = prev.length;
      const next = [...prev, emptyYarnReceiptRow()];
      setTimeout(() => {
        setYarnReceiptSessionIndex(newIdx);
        setActiveCell({ rowIndex: newIdx, colKey: 'dc_no' });
        receiptMatrixRef.current[newIdx]?.[0]?.focus();
      }, 0);
      return next;
    });
  };

  const yarnReceiptCellEditable = (row) => canEdit && (row.id == null || yarnReceiptEditIds.has(row.id));

  const handleYarnReceiptGridKeyDown = useCallback(
    (e, rowIndex, colIndex) => {
      handleGridNavKeyDown(e, {
        matrixRef: receiptMatrixRef,
        numRows: yarnReceiptRows.length,
        numCols: RECEIPT_GRID_COLS,
        rowIndex,
        colIndex,
        shouldSkip: (r, c) => {
          const row = yarnReceiptRows[r];
          if (!row) return true;
          const editable = canEdit && (row.id == null || yarnReceiptEditIds.has(row.id));
          if (!editable) return true;
          const k = YARN_RECEIPT_ROW_KEYS[c];
          if (k === 'no_of_bags' && yarnReceiptTypeIsHank(row.type)) return true;
          if ((k === 'bundles' || k === 'knots') && yarnReceiptTypeIsCone(row.type)) return true;
          return false;
        },
        onLand: (r, c) => setActiveCell({ rowIndex: r, colKey: YARN_RECEIPT_ROW_KEYS[c] }),
      });
    },
    [yarnReceiptRows, yarnReceiptEditIds, canEdit],
  );

  const startEditYarnReceiptRow = (receiptId) => {
    const idx = yarnReceiptRows.findIndex((r) => r.id === receiptId);
    if (idx < 0) return;
    if (yarnReceiptSessionIndex !== null && yarnReceiptSessionIndex !== idx) {
      toast.error('Save the current row in the Actions column before editing another.');
      return;
    }
    setYarnReceiptEditIds((prev) => new Set(prev).add(receiptId));
    setYarnReceiptSessionIndex(idx);
  };

  const cancelYarnReceiptEdit = (rowIndex) => {
    if (yarnReceiptSessionIndex !== rowIndex) return;
    const row = yarnReceiptRows[rowIndex];
    if (row?.id != null) {
      setYarnReceiptEditIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      if (editingOrderId) fetchReceipts(editingOrderId);
    } else {
      setYarnReceiptRows((prev) => {
        const next = prev.filter((_, i) => i !== rowIndex);
        if (next.length === 0 && editingOrderId) return [emptyYarnReceiptRow()];
        return next;
      });
    }
    setYarnReceiptSessionIndex(null);
    setActiveCell(null);
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[rowIndex];
      return next;
    });
  };

  const saveYarnReceiptRowAt = async (rowIndex) => {
    if (!editingOrderId) return;
    if (yarnReceiptSessionIndex !== rowIndex) return;
    const row = yarnReceiptRows[rowIndex];
    if (isRowEmpty(row)) {
      toast.error('Enter receipt data before saving.');
      return;
    }
    if (!row.dc_no?.trim()) {
      setRowErrors({ [rowIndex]: 'DC No is required when row has data' });
      toast.error('DC No is required.');
      return;
    }
    const body = { ...rowToPayload(row), yarn_order_id: editingOrderId };
    setSavingYarnReceiptRowIndex(rowIndex);
    try {
      if (row.id == null) {
        await api.post('/yarn-receipts', body);
        toast.success('Receipt saved.');
      } else {
        await api.put(`/yarn-receipts/${row.id}`, body);
        toast.success('Receipt updated.');
      }
      setRowErrors({});
      setYarnReceiptEditIds(new Set());
      setYarnReceiptSessionIndex(null);
      fetchReceipts(editingOrderId);
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save');
      toast.error(msg);
    } finally {
      setSavingYarnReceiptRowIndex(null);
    }
  };

  const deleteRow = async (rowIndex) => {
    if (yarnReceiptSessionIndex !== null && rowIndex !== yarnReceiptSessionIndex) {
      toast.error('Save or delete only the row you are working on first.');
      return;
    }
    const row = yarnReceiptRows[rowIndex];
    if (row?.id != null) {
      if (!window.confirm('Delete this yarn receipt?')) return;
      try {
        await api.delete(`/yarn-receipts/${row.id}`);
        toast.success('Receipt deleted');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
        return;
      }
      setYarnReceiptEditIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      setYarnReceiptSessionIndex(null);
      fetchReceipts(editingOrderId);
      setActiveCell(null);
      return;
    }
    setYarnReceiptRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setYarnReceiptSessionIndex(null);
    setActiveCell(null);
  };

  const isRowEmpty = (row) => !row.dc_no?.trim() && !row.vehicle_details?.trim() && !row.date?.trim()
    && !row.count?.trim() && !row.content?.trim() && !row.colour?.trim()
    && !row.type?.trim() && row.no_of_bags === '' && row.bundles === '' && row.knots === ''
    && row.net_weight === '' && row.gross_weight === '';

  const isFabricRowEmpty = (row) => FABRIC_ROW_KEYS.every((k) => {
    const v = row[k];
    return v === '' || v == null;
  });

  const fabricCellEditable = (row) => canEdit && (row.id == null || fabricEditIds.has(row.id));

  const handleFabricGridKeyDown = useCallback(
    (e, rowIndex, colIndex) => {
      handleGridNavKeyDown(e, {
        matrixRef: fabricMatrixRef,
        numRows: fabricRows.length,
        numCols: FABRIC_GRID_COLS,
        rowIndex,
        colIndex,
        shouldSkip: (r, c) => {
          const row = fabricRows[r];
          if (!row) return true;
          const editable = canEdit && (row.id == null || fabricEditIds.has(row.id));
          if (!editable) return true;
          return false;
        },
        onLand: (r, c) => setActiveCellFabric({ rowIndex: r, colKey: FABRIC_ROW_KEYS[c] }),
      });
    },
    [fabricRows, fabricEditIds, canEdit],
  );

  const handleFabricCellChange = (rowIndex, field, value) => {
    if (!canEdit) return;
    const row = fabricRowsRef.current[rowIndex];
    if (!row) return;
    if (row.id != null && !fabricEditIdsRef.current.has(row.id)) return;
    setFabricSessionIndex(rowIndex);
    setFabricRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, [field]: value } : r)));
  };

  const startEditFabricRow = (fabricId) => {
    const idx = fabricRows.findIndex((r) => r.id === fabricId);
    if (idx < 0) return;
    if (fabricSessionIndex !== null && fabricSessionIndex !== idx) {
      toast.error('Save the current row in the Actions column before editing another.');
      return;
    }
    setFabricEditIds((prev) => new Set(prev).add(fabricId));
    setFabricSessionIndex(idx);
  };

  const cancelFabricEdit = (rowIndex) => {
    if (fabricSessionIndex !== rowIndex) return;
    const row = fabricRows[rowIndex];
    if (row?.id != null) {
      setFabricEditIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      if (editingOrderId) fetchFabrics(editingOrderId);
    } else {
      setFabricRows((prev) => {
        const next = prev.filter((_, i) => i !== rowIndex);
        if (next.length === 0 && editingOrderId) return [emptyFabricRow()];
        return next;
      });
    }
    setFabricSessionIndex(null);
    setActiveCellFabric(null);
  };

  const saveFabricRowAt = async (rowIndex) => {
    if (!editingOrderId) return;
    if (fabricSessionIndex !== rowIndex) return;
    const row = fabricRows[rowIndex];
    if (isFabricRowEmpty(row)) {
      toast.error('Enter production planning data before saving.');
      return;
    }
    const payload = { ...fabricRowToPayload(row), loom_id: row.loom_id ? Number(row.loom_id) : null };
    setSavingFabricRowIndex(rowIndex);
    try {
      let saved;
      if (row.id == null) {
        const { data: body } = await api.post('/fabrics', { ...payload, yarn_order_id: editingOrderId });
        saved = body.data;
        toast.success('Production planning row saved.');
      } else {
        const { data: body } = await api.put(`/fabrics/${row.id}`, payload);
        saved = body.data;
        toast.success('Production planning row updated.');
      }
      setFabricEditIds(new Set());
      setFabricSessionIndex(null);
      // Merge only this record into local state — no full refetch (avoids reloading the whole grid / loading spinner).
      setFabrics((prev) => {
        if (row.id == null) {
          return [...prev, saved].sort((a, b) => a.id - b.id);
        }
        return prev.map((f) => (f.id === saved.id ? saved : f));
      });

      await fetchLoomsForOrder(editingOrderId);
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save');
      toast.error(msg);
    } finally {
      setSavingFabricRowIndex(null);
    }
  };

  const addFabricRow = () => {
    if (fabricSessionIndex !== null) {
      toast.error('Save the current row in the Actions column before adding another.');
      return;
    }
    const lastFabric = fabricRows[fabricRows.length - 1];
    if (fabricRows.length > 0 && isFabricRowEmpty(lastFabric)) {
      toast.error('Fill the current row before adding another.');
      return;
    }
    setFabricRows((prev) => {
      const newLen = prev.length;
      setTimeout(() => {
        setFabricSessionIndex(newLen);
        setActiveCellFabric({ rowIndex: newLen, colKey: FABRIC_ROW_KEYS[0] });
        fabricMatrixRef.current[newLen]?.[0]?.focus();
      }, 0);
      return [...prev, emptyFabricRow()];
    });
  };

  const deleteFabricRow = async (rowIndex) => {
    if (fabricSessionIndex !== null && rowIndex !== fabricSessionIndex) {
      toast.error('Save or delete only the row you are working on first.');
      return;
    }
    const row = fabricRows[rowIndex];
    if (row?.id != null) {
      if (!window.confirm('Delete this production planning row?')) return;
      try {
        await api.delete(`/fabrics/${row.id}`);
        toast.success('Deleted');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
        return;
      }
      setFabricEditIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      setFabricSessionIndex(null);
      if (editingOrderId) fetchFabrics(editingOrderId);
      setActiveCellFabric(null);
      return;
    }
    setFabricRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setFabricSessionIndex(null);
    setActiveCellFabric(null);
  };
  const isYarnReqRowEmpty = (row) => YARN_REQ_ROW_KEYS.every((k) => {
    const v = row[k];
    return v === '' || v == null;
  });

  const yarnReqCellEditable = (row) => canEdit && (row.id == null || yarnReqEditIds.has(row.id));

  const ensureYarnReqSession = useCallback((rowIndex) => {
    const row = yarnReqRows[rowIndex];
    if (!row || !canEdit) return;
    if (row.id != null && !yarnReqEditIds.has(row.id)) return;
    setYarnReqSessionIndex(rowIndex);
  }, [yarnReqRows, yarnReqEditIds, canEdit]);

  const handleYarnReqCellChange = (rowIndex, field, value) => {
    if (!canEdit) return;
    const row = yarnReqRowsRef.current[rowIndex];
    if (!row) return;
    if (row.id != null && !yarnReqEditIdsRef.current.has(row.id)) return;
    setYarnReqSessionIndex(rowIndex);
    setYarnReqRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, [field]: value } : r)));
  };

  const handleYarnReqGridKeyDown = useCallback(
    (e, rowIndex, colIndex) => {
      handleGridNavKeyDown(e, {
        matrixRef: yarnReqMatrixRef,
        numRows: yarnReqRows.length,
        numCols: YARN_REQ_GRID_COLS,
        rowIndex,
        colIndex,
        shouldSkip: (r) => {
          const row = yarnReqRows[r];
          if (!row) return true;
          const editable = canEdit && (row.id == null || yarnReqEditIds.has(row.id));
          if (!editable) return true;
          return false;
        },
        onLand: (r, c) => setActiveCellYarnReq({ rowIndex: r, colKey: YARN_REQ_ROW_KEYS[c] }),
      });
    },
    [yarnReqRows, yarnReqEditIds, canEdit],
  );

  const startEditYarnReqRow = (reqId) => {
    const idx = yarnReqRows.findIndex((r) => r.id === reqId);
    if (idx < 0) return;
    if (yarnReqSessionIndex !== null && yarnReqSessionIndex !== idx) {
      toast.error('Save the current row in the Actions column before editing another.');
      return;
    }
    setYarnReqEditIds((prev) => new Set(prev).add(reqId));
    setYarnReqSessionIndex(idx);
  };

  const cancelYarnReqEdit = (rowIndex) => {
    if (yarnReqSessionIndex !== rowIndex) return;
    const row = yarnReqRows[rowIndex];
    if (row?.id != null) {
      setYarnReqEditIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      if (editingOrderId) fetchYarnRequirements(editingOrderId);
    } else {
      setYarnReqRows((prev) => {
        const next = prev.filter((_, i) => i !== rowIndex);
        if (next.length === 0 && editingOrderId && isSuperAdmin) return [emptyYarnReqRow()];
        return next;
      });
    }
    setYarnReqSessionIndex(null);
    setActiveCellYarnReq(null);
  };

  const saveYarnReqRowAt = async (rowIndex) => {
    if (!editingOrderId) return;
    if (yarnReqSessionIndex !== rowIndex) return;
    const row = yarnReqRows[rowIndex];
    if (isYarnReqRowEmpty(row)) {
      toast.error('Enter yarn requirement data before saving.');
      return;
    }
    const payload = { ...yarnReqRowToPayload(row), yarn_order_id: editingOrderId };
    setSavingYarnReqRowIndex(rowIndex);
    try {
      if (row.id == null) {
        await api.post('/yarn-requirements', payload);
        toast.success('Yarn requirement row saved.');
      } else {
        await api.put(`/yarn-requirements/${row.id}`, yarnReqRowToPayload(row));
        toast.success('Yarn requirement row updated.');
      }
      setYarnReqEditIds(new Set());
      setYarnReqSessionIndex(null);
      fetchYarnRequirements(editingOrderId);
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : 'Failed to save');
      toast.error(msg);
    } finally {
      setSavingYarnReqRowIndex(null);
    }
  };

  const deleteYarnReqRowAt = async (rowIndex) => {
    if (yarnReqSessionIndex !== null && rowIndex !== yarnReqSessionIndex) {
      toast.error('Save or delete only the row you are working on first.');
      return;
    }
    const row = yarnReqRows[rowIndex];
    if (row?.id != null) {
      if (!window.confirm('Delete this yarn requirement row?')) return;
      try {
        await api.delete(`/yarn-requirements/${row.id}`);
        toast.success('Deleted');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
        return;
      }
      setYarnReqEditIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      setYarnReqSessionIndex(null);
      if (editingOrderId) fetchYarnRequirements(editingOrderId);
      setActiveCellYarnReq(null);
      return;
    }
    setYarnReqRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setYarnReqSessionIndex(null);
    setActiveCellYarnReq(null);
  };
  const addYarnReqRow = () => {
    if (yarnReqSessionIndex !== null) {
      toast.error('Save the current row in the Actions column before adding another.');
      return;
    }
    const lastYarnReq = yarnReqRows[yarnReqRows.length - 1];
    if (yarnReqRows.length > 0 && isYarnReqRowEmpty(lastYarnReq)) {
      toast.error('Fill the current row before adding another.');
      return;
    }
    setYarnReqRows((prev) => {
      const newLen = prev.length;
      setTimeout(() => {
        setYarnReqSessionIndex(newLen);
        setActiveCellYarnReq({ rowIndex: newLen, colKey: YARN_REQ_ROW_KEYS[0] });
        yarnReqMatrixRef.current[newLen]?.[0]?.focus();
      }, 0);
      return [...prev, emptyYarnReqRow()];
    });
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
        fetchFabrics(editingOrderId);
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

      {editingOrderId && (
        <Card className="mb-4 sm:mb-6 border-gray-100 bg-gray-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-base font-semibold text-gray-900">Order details</h3>
            <span className="text-sm font-mono font-medium text-brand tabular-nums">
              {formatOrderId(editingOrderId, orderEntry.po_date)}
            </span>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order from</dt>
              <dd className="mt-0.5 text-gray-900">{orderEntry.order_from?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weaving unit</dt>
              <dd className="mt-0.5 text-gray-900">{orderEntry.weaving_unit?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">P.O number</dt>
              <dd className="mt-0.5 text-gray-900">{orderEntry.po_number?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</dt>
              <dd className="mt-0.5 text-gray-900">{orderEntry.customer?.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">PO date</dt>
              <dd className="mt-0.5 text-gray-900">{formatOrderDate(orderEntry.po_date)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery date</dt>
              <dd className="mt-0.5 text-gray-900">{formatOrderDate(orderEntry.delivery_date)}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Yarn Receipt Details</h3>
        </div>

        {!editingOrderId ? (
          <p className="text-sm text-gray-500 py-6">Select an order from the Yarn Stock list to add receipt details.</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">DC No</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Vehicle Details</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Date</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Colour</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Count</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cnt</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Type</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Bags</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Bundles</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Knots</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">N.Wgt</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">G.Wgt</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[8.5rem]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : (
                  yarnReceiptRows.map((row, rowIndex) => {
                    const cellOn = yarnReceiptCellEditable(row);
                    const bagsOff = !cellOn || yarnReceiptTypeIsHank(row.type);
                    const bundlesKnotsOff = !cellOn || yarnReceiptTypeIsCone(row.type);
                    const sessionLocked = yarnReceiptSessionIndex !== null;
                    const isSessionRow = yarnReceiptSessionIndex === rowIndex;
                    const blockOtherRows = sessionLocked && !isSessionRow;
                    return (
                    <tr
                      key={row.id ?? `new-${rowIndex}`}
                      className={`border-t border-gray-100 ${activeCell?.rowIndex === rowIndex ? 'bg-brand/5' : 'hover:bg-gray-50/80'}`}
                    >
                      <td className="p-0 align-top">
                        <input
                          ref={setReceiptCell(rowIndex, 0)}
                          type="text"
                          value={row.dc_no}
                          onChange={(e) => { handleCellChange(rowIndex, 'dc_no', e.target.value); setRowErrors((prev) => ({ ...prev, [rowIndex]: undefined })); }}
                          onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 0)}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'dc_no' })}
                          className={`w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b focus:ring-1 focus:outline-none rounded ${rowErrors[rowIndex] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : !cellOn ? 'border-transparent bg-gray-50/80 text-gray-800' : 'border-transparent focus:border-brand focus:ring-brand'}`}
                          placeholder="DC No"
                          readOnly={!cellOn}
                          title={rowErrors[rowIndex]}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={setReceiptCell(rowIndex, 1)}
                          type="text"
                          value={row.vehicle_details}
                          onChange={(e) => handleCellChange(rowIndex, 'vehicle_details', e.target.value)}
                          onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 1)}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'vehicle_details' })}
                          className={`w-full min-w-[100px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:outline-none rounded ${!cellOn ? 'bg-gray-50/80 text-gray-800' : 'focus:border-brand focus:ring-1 focus:ring-brand'}`}
                          placeholder="Vehicle"
                          readOnly={!cellOn}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={setReceiptCell(rowIndex, 2)}
                          type="date"
                          value={row.date}
                          onChange={(e) => handleCellChange(rowIndex, 'date', e.target.value)}
                          onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 2)}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'date' })}
                          className={`w-full min-w-[110px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:outline-none rounded ${!cellOn ? 'bg-gray-50/80 text-gray-800' : 'focus:border-brand focus:ring-1 focus:ring-brand'}`}
                          readOnly={!cellOn}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <div className="min-w-[100px] px-1 py-0.5">
                          <SearchableSelect
                            ref={setReceiptCell(rowIndex, 3)}
                            options={yarnColourOptions}
                            value={row.colour}
                            onChange={(v) => handleCellChange(rowIndex, 'colour', v || '')}
                            onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 3)}
                            onMenuOpen={() => {
                              ensureYarnReceiptSession(rowIndex);
                              setActiveCell({ rowIndex, colKey: 'colour' });
                            }}
                            placeholder="Colour"
                            isDisabled={!cellOn}
                            isClearable
                            compact
                            hideIndicators
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                          />
                        </div>
                      </td>
                      <td className="p-0 align-top">
                        <div className="min-w-[100px] px-1 py-0.5">
                          <SearchableSelect
                            ref={setReceiptCell(rowIndex, 4)}
                            options={yarnReceiptCountOptions}
                            value={row.count}
                            onChange={(v) => handleCellChange(rowIndex, 'count', v || '')}
                            onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 4)}
                            onMenuOpen={() => {
                              ensureYarnReceiptSession(rowIndex);
                              setActiveCell({ rowIndex, colKey: 'count' });
                            }}
                            placeholder="Count"
                            isDisabled={!cellOn}
                            isClearable
                            compact
                            hideIndicators
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                          />
                        </div>
                      </td>
                      <td className="p-0 align-top">
                        <div className="min-w-[100px] px-1 py-0.5">
                          <SearchableSelect
                            ref={setReceiptCell(rowIndex, 5)}
                            options={yarnReceiptContentOptions}
                            value={row.content}
                            onChange={(v) => handleCellChange(rowIndex, 'content', v || '')}
                            onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 5)}
                            onMenuOpen={() => {
                              ensureYarnReceiptSession(rowIndex);
                              setActiveCell({ rowIndex, colKey: 'content' });
                            }}
                            placeholder="Content"
                            isDisabled={!cellOn}
                            isClearable
                            compact
                            hideIndicators
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                          />
                        </div>
                      </td>
                      <td className="p-0 align-top">
                        <div className="min-w-[120px] px-1 py-0.5">
                          <SearchableSelect
                            ref={setReceiptCell(rowIndex, 6)}
                            options={yarnReceiptTypeOptions}
                            value={row.type}
                            onChange={(v) => handleCellChange(rowIndex, 'type', v || '')}
                            onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 6)}
                            onMenuOpen={() => {
                              ensureYarnReceiptSession(rowIndex);
                              setActiveCell({ rowIndex, colKey: 'type' });
                            }}
                            placeholder="Type"
                            isDisabled={!cellOn}
                            isClearable={false}
                            compact
                            hideIndicators
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                          />
                        </div>
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={setReceiptCell(rowIndex, 7)}
                          type="number"
                          min="0"
                          value={row.no_of_bags}
                          onChange={(e) => handleCellChange(rowIndex, 'no_of_bags', e.target.value)}
                          onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 7)}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'no_of_bags' })}
                          className={`w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b rounded text-right focus:outline-none ${bagsOff ? 'border-transparent bg-gray-50/90 text-gray-500 cursor-not-allowed' : 'border-transparent focus:border-brand focus:ring-1 focus:ring-brand'}`}
                          placeholder="0"
                          readOnly={bagsOff}
                          title={yarnReceiptTypeIsHank(row.type) ? 'Not used for Hank' : undefined}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={setReceiptCell(rowIndex, 8)}
                          type="number"
                          min="0"
                          value={row.bundles}
                          onChange={(e) => handleCellChange(rowIndex, 'bundles', e.target.value)}
                          onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 8)}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'bundles' })}
                          className={`w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b rounded text-right focus:outline-none ${bundlesKnotsOff ? 'border-transparent bg-gray-50/90 text-gray-500 cursor-not-allowed' : 'border-transparent focus:border-brand focus:ring-1 focus:ring-brand'}`}
                          placeholder="0"
                          readOnly={bundlesKnotsOff}
                          title={yarnReceiptTypeIsCone(row.type) ? 'Not used for Cone' : undefined}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={setReceiptCell(rowIndex, 9)}
                          type="number"
                          min="0"
                          value={row.knots}
                          onChange={(e) => handleCellChange(rowIndex, 'knots', e.target.value)}
                          onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 9)}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'knots' })}
                          className={`w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b rounded text-right focus:outline-none ${bundlesKnotsOff ? 'border-transparent bg-gray-50/90 text-gray-500 cursor-not-allowed' : 'border-transparent focus:border-brand focus:ring-1 focus:ring-brand'}`}
                          placeholder="0"
                          readOnly={bundlesKnotsOff}
                          title={yarnReceiptTypeIsCone(row.type) ? 'Not used for Cone' : undefined}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={setReceiptCell(rowIndex, 10)}
                          type="number"
                          min="0"
                          step="0.001"
                          value={row.net_weight}
                          onChange={(e) => handleCellChange(rowIndex, 'net_weight', e.target.value)}
                          onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 10)}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'net_weight' })}
                          className={`w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:outline-none rounded text-right ${!cellOn ? 'bg-gray-50/80 text-gray-800' : 'focus:border-brand focus:ring-1 focus:ring-brand'}`}
                          placeholder="0"
                          readOnly={!cellOn}
                        />
                      </td>
                      <td className="p-0 align-top">
                        <input
                          ref={setReceiptCell(rowIndex, 11)}
                          type="number"
                          min="0"
                          step="0.001"
                          value={row.gross_weight}
                          onChange={(e) => handleCellChange(rowIndex, 'gross_weight', e.target.value)}
                          onKeyDown={(e) => handleYarnReceiptGridKeyDown(e, rowIndex, 11)}
                          onFocus={() => setActiveCell({ rowIndex, colKey: 'gross_weight' })}
                          className={`w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b border-transparent focus:outline-none rounded text-right ${!cellOn ? 'bg-gray-50/80 text-gray-800' : 'focus:border-brand focus:ring-1 focus:ring-brand'}`}
                          placeholder="0"
                          readOnly={!cellOn}
                        />
                      </td>
                      <td className="px-1 py-1.5 align-top">
                        {canEdit && (
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {isSessionRow && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveYarnReceiptRowAt(rowIndex)}
                                  disabled={savingYarnReceiptRowIndex === rowIndex}
                                  className="px-2 py-1 text-xs font-medium rounded-md bg-brand text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Save this row"
                                >
                                  {savingYarnReceiptRowIndex === rowIndex ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelYarnReceiptEdit(rowIndex)}
                                  disabled={savingYarnReceiptRowIndex === rowIndex}
                                  className="p-1.5 rounded text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Discard changes"
                                >
                                  <X className="w-4 h-4" strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteRow(rowIndex)}
                                  className="p-1.5 rounded text-gray-400 hover:text-red-600"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {!isSessionRow && (
                              <>
                                {row.id != null && !yarnReceiptEditIds.has(row.id) && (
                                  <button
                                    type="button"
                                    onClick={() => !blockOtherRows && startEditYarnReceiptRow(row.id)}
                                    disabled={blockOtherRows}
                                    className={`p-1.5 rounded ${blockOtherRows ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand'}`}
                                    title={blockOtherRows ? 'Save the row you are editing first' : 'Edit row'}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => !blockOtherRows && deleteRow(rowIndex)}
                                  disabled={blockOtherRows}
                                  className={`p-1.5 rounded ${blockOtherRows ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
                                  title={blockOtherRows ? 'Save the row you are editing first' : 'Delete row'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-center justify-start gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={addRow}
                disabled={yarnReceiptSessionIndex !== null}
                title={yarnReceiptSessionIndex !== null ? 'Save the current row in the grid first' : undefined}
              >
                + Add Row
              </Button>
            </div>
          )}
          </>
        )}
      </Card>

      <Card className="mt-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">Production Planning</h3>
        </div>
        {!editingOrderId ? (
          <p className="text-sm text-gray-500 py-6">Select an order from the Yarn Stock list to add production planning.</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th rowSpan={2} className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[8rem] align-middle border-b border-gray-200">SL No</th>
                  <th rowSpan={2} className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[10rem] align-middle border-b border-gray-200">Loom</th>
                  {FABRIC_HEADER_LEADING_KEYS.map((k) => (
                    <th key={k} rowSpan={2} className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap align-middle border-b border-gray-200">
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                  <th colSpan={2} className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">
                    Warp
                  </th>
                  <th colSpan={2} className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">
                    Weft
                  </th>
                  <th colSpan={2} className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">
                    Con On Loom
                  </th>
                  <th colSpan={2} className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">
                    Con Final
                  </th>
                  {FABRIC_HEADER_TAIL_KEYS.map((k) => (
                    <th key={k} rowSpan={2} className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap align-middle border-b border-gray-200">
                      {fabricGridColumnLabel(k)}
                    </th>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[8.5rem] align-middle border-b border-gray-200">Actions</th>
                </tr>
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">Count</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">Content</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">Count</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">Content</th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">Reed</th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">Pick</th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">Reed</th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap border-b border-gray-200">Pick</th>
                </tr>
              </thead>
              <tbody>
                {fabricsLoading ? (
                  <tr>
                    <td colSpan={FABRIC_ROW_KEYS.length + 3} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : (
                  fabricRows.map((row, rowIndex) => {
                    const cellOn = fabricCellEditable(row);
                    const rowLoomId = row?.loom_id ? String(row.loom_id) : '';
                    const activeOrThisRowLoom = loomsForOrder.filter((l) => {
                      const lid = String(l.id);
                      if (lid === rowLoomId) return true;
                      return !isLoomInactiveStatus(l.status);
                    });
                    const loomOptionsForRow = activeOrThisRowLoom.map((l) => ({
                      value: String(l.id),
                      label: `${l.loom_number ?? l.id}${l.sl_number ? ` · ${l.sl_number}` : ''}${
                        isLoomInactiveStatus(l.status) ? ' · Inactive' : ''
                      }`,
                    }));
                    const sessionLocked = fabricSessionIndex !== null;
                    const isSessionRow = fabricSessionIndex === rowIndex;
                    const blockOtherRows = sessionLocked && !isSessionRow;
                    return (
                    <tr
                      key={row.id ?? `new-${rowIndex}`}
                      className={`border-t border-gray-100 ${activeCellFabric?.rowIndex === rowIndex ? 'bg-brand/5' : 'hover:bg-gray-50/80'}`}
                    >
                      <td
                        className="px-2 py-1.5 text-xs text-gray-800 align-top font-mono tabular-nums whitespace-nowrap"
                        title={row.sl_number || (row.id == null ? 'Assigned after save' : '')}
                      >
                        {row.sl_number || (row.id == null ? '—' : String(rowIndex + 1))}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-gray-800 align-top min-w-[10rem]">
                        <SearchableSelect
                          options={loomOptionsForRow}
                          value={rowLoomId}
                          onMenuOpen={() => ensureFabricSession(rowIndex)}
                          onChange={(v) => {
                            if (!canEdit) return;
                            const nextLoomId = v ? String(v) : '';
                            setFabricRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, loom_id: nextLoomId } : r)));
                            setFabricSessionIndex(rowIndex);
                          }}
                          placeholder="Loom"
                          isDisabled={!cellOn}
                          isClearable
                          compact
                          hideIndicators
                          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        />
                      </td>
                      {FABRIC_ROW_KEYS.map((colKey, colIndex) => {
                        const isNum = ['con_final_reed', 'con_final_pick', 'con_on_loom_reed', 'con_on_loom_pick', 'gsm_required', 'actual_gsm', 'required_width', 'po_quantity', 'price_per_metre'].includes(colKey);
                        if (colKey === 'colour') {
                          return (
                            <td key={colKey} className="p-0 align-top px-1 py-0.5">
                              <MultiColourInput
                                ref={setFabricCell(rowIndex, colIndex)}
                                value={row.colour ?? ''}
                                onChange={(v) => handleFabricCellChange(rowIndex, 'colour', v)}
                                onKeyDown={(e) => handleFabricGridKeyDown(e, rowIndex, colIndex)}
                                options={fabricColourOptions}
                                disabled={!cellOn}
                                placeholder="Colour"
                                className="w-full"
                              />
                            </td>
                          );
                        }
                        if (colKey === 'warp_count' || colKey === 'weft_count') {
                          return (
                            <td key={colKey} className="p-0 align-top px-1 py-0.5">
                              <SearchableSelect
                                ref={setFabricCell(rowIndex, colIndex)}
                                options={yarnReceiptCountOptions}
                                value={row[colKey] ?? ''}
                                onChange={(v) => handleFabricCellChange(rowIndex, colKey, v || '')}
                                onKeyDown={(e) => handleFabricGridKeyDown(e, rowIndex, colIndex)}
                                onMenuOpen={() => {
                                  ensureFabricSession(rowIndex);
                                  setActiveCellFabric({ rowIndex, colKey });
                                }}
                                placeholder={fabricGridColumnLabel(colKey)}
                                isDisabled={!cellOn}
                                isClearable
                                compact
                                hideIndicators
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              />
                            </td>
                          );
                        }
                        if (colKey === 'warp_content' || colKey === 'weft_content') {
                          return (
                            <td key={colKey} className="p-0 align-top px-1 py-0.5">
                              <SearchableSelect
                                ref={setFabricCell(rowIndex, colIndex)}
                                options={yarnReceiptContentOptions}
                                value={row[colKey] ?? ''}
                                onChange={(v) => handleFabricCellChange(rowIndex, colKey, v || '')}
                                onKeyDown={(e) => handleFabricGridKeyDown(e, rowIndex, colIndex)}
                                onMenuOpen={() => {
                                  ensureFabricSession(rowIndex);
                                  setActiveCellFabric({ rowIndex, colKey });
                                }}
                                placeholder={fabricGridColumnLabel(colKey)}
                                isDisabled={!cellOn}
                                isClearable
                                compact
                                hideIndicators
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              />
                            </td>
                          );
                        }
                        return (
                          <td key={colKey} className="p-0 align-top">
                            <input
                              ref={setFabricCell(rowIndex, colIndex)}
                              type={isNum ? 'text' : 'text'}
                              inputMode={isNum ? 'decimal' : 'text'}
                              value={row[colKey]}
                              onChange={(e) => handleFabricCellChange(rowIndex, colKey, e.target.value)}
                              onKeyDown={(e) => handleFabricGridKeyDown(e, rowIndex, colIndex)}
                              onFocus={() => setActiveCellFabric({ rowIndex, colKey })}
                              className={`w-full min-w-[70px] px-2 py-1.5 text-sm border-0 border-b focus:outline-none rounded ${isNum ? 'text-right' : ''} ${!cellOn ? 'border-transparent bg-gray-50/80 text-gray-800' : 'border-transparent focus:border-brand focus:ring-1 focus:ring-brand'}`}
                              placeholder={fabricGridColumnLabel(colKey)}
                              readOnly={!cellOn}
                            />
                          </td>
                        );
                      })}
                      <td className="px-1 py-1.5 align-top">
                        {canEdit && (
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {isSessionRow && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveFabricRowAt(rowIndex)}
                                  disabled={savingFabricRowIndex === rowIndex}
                                  className="px-2 py-1 text-xs font-medium rounded-md bg-brand text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Save this row"
                                >
                                  {savingFabricRowIndex === rowIndex ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelFabricEdit(rowIndex)}
                                  disabled={savingFabricRowIndex === rowIndex}
                                  className="p-1.5 rounded text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Discard changes"
                                >
                                  <X className="w-4 h-4" strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteFabricRow(rowIndex)}
                                  className="p-1.5 rounded text-gray-400 hover:text-red-600"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {!isSessionRow && (
                              <>
                                {row.id != null && !fabricEditIds.has(row.id) && (
                                  <button
                                    type="button"
                                    onClick={() => !blockOtherRows && startEditFabricRow(row.id)}
                                    disabled={blockOtherRows}
                                    className={`p-1.5 rounded ${blockOtherRows ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand'}`}
                                    title={blockOtherRows ? 'Save the row you are editing first' : 'Edit row'}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => !blockOtherRows && deleteFabricRow(rowIndex)}
                                  disabled={blockOtherRows}
                                  className={`p-1.5 rounded ${blockOtherRows ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
                                  title={blockOtherRows ? 'Save the row you are editing first' : 'Delete row'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-center justify-start gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={addFabricRow}
                disabled={fabricSessionIndex !== null}
                title={fabricSessionIndex !== null ? 'Save the current row in the grid first' : undefined}
              >
                + Add Row
              </Button>
            </div>
          )}
          </>
        )}
      </Card>

      {isSuperAdmin && (
        <Card className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">Yarn Requirement</h3>
          </div>
          {!editingOrderId ? (
            <p className="text-sm text-gray-500 py-6">Select an order from the Yarn Stock list to add yarn requirements.</p>
          ) : (
            <>
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
                      (() => {
                        const cellOn = yarnReqCellEditable(row);
                        const sessionLocked = yarnReqSessionIndex !== null;
                        const isSessionRow = yarnReqSessionIndex === rowIndex;
                        const blockOtherRows = sessionLocked && !isSessionRow;
                        return (
                        <tr
                          key={row.id ?? `yarn-req-${rowIndex}`}
                          className={`border-t border-gray-100 ${activeCellYarnReq?.rowIndex === rowIndex ? 'bg-brand/5' : 'hover:bg-gray-50/80'}`}
                        >
                        <td className="px-2 py-1.5 text-sm text-gray-500 align-top">{rowIndex + 1}</td>
                        {YARN_REQ_ROW_KEYS.map((colKey, colIndex) => (
                          <td key={colKey} className="p-0 align-top">
                            {colKey === 'colour' ? (
                              <SearchableSelect
                                ref={setYarnReqCell(rowIndex, colIndex)}
                                options={yarnColourOptions}
                                value={row[colKey] ?? ''}
                                onChange={(v) => handleYarnReqCellChange(rowIndex, colKey, v || '')}
                                onKeyDown={(e) => handleYarnReqGridKeyDown(e, rowIndex, colIndex)}
                                onMenuOpen={() => {
                                  ensureYarnReqSession(rowIndex);
                                  setActiveCellYarnReq({ rowIndex, colKey });
                                }}
                                placeholder="Colour"
                                isDisabled={!cellOn}
                                isClearable
                                compact
                                hideIndicators
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              />
                            ) : colKey === 'count' ? (
                              <SearchableSelect
                                ref={setYarnReqCell(rowIndex, colIndex)}
                                options={yarnReceiptCountOptions}
                                value={row[colKey] ?? ''}
                                onChange={(v) => handleYarnReqCellChange(rowIndex, colKey, v || '')}
                                onKeyDown={(e) => handleYarnReqGridKeyDown(e, rowIndex, colIndex)}
                                onMenuOpen={() => {
                                  ensureYarnReqSession(rowIndex);
                                  setActiveCellYarnReq({ rowIndex, colKey });
                                }}
                                placeholder="Count"
                                isDisabled={!cellOn}
                                isClearable
                                compact
                                hideIndicators
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              />
                            ) : colKey === 'content' ? (
                              <SearchableSelect
                                ref={setYarnReqCell(rowIndex, colIndex)}
                                options={yarnReceiptContentOptions}
                                value={row[colKey] ?? ''}
                                onChange={(v) => handleYarnReqCellChange(rowIndex, colKey, v || '')}
                                onKeyDown={(e) => handleYarnReqGridKeyDown(e, rowIndex, colIndex)}
                                onMenuOpen={() => {
                                  ensureYarnReqSession(rowIndex);
                                  setActiveCellYarnReq({ rowIndex, colKey });
                                }}
                                placeholder="Content"
                                isDisabled={!cellOn}
                                isClearable
                                compact
                                hideIndicators
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              />
                            ) : (
                              <input
                                ref={setYarnReqCell(rowIndex, colIndex)}
                                type="text"
                                inputMode={colKey === 'required_weight' ? 'decimal' : 'text'}
                                value={row[colKey]}
                                onChange={(e) => handleYarnReqCellChange(rowIndex, colKey, e.target.value)}
                                onKeyDown={(e) => handleYarnReqGridKeyDown(e, rowIndex, colIndex)}
                                onFocus={() => setActiveCellYarnReq({ rowIndex, colKey })}
                                className={`w-full min-w-[80px] px-2 py-1.5 text-sm border-0 border-b focus:outline-none rounded ${
                                  colKey === 'required_weight' ? 'text-right' : ''
                                } ${!cellOn ? 'border-transparent bg-gray-50/80 text-gray-800' : 'border-transparent focus:border-brand focus:ring-1 focus:ring-brand'}`}
                                placeholder={colKey.replace(/_/g, ' ')}
                                readOnly={!cellOn}
                              />
                            )}
                          </td>
                        ))}
                        <td className="p-1 align-top">
                          {canEdit && (
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              {isSessionRow && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => saveYarnReqRowAt(rowIndex)}
                                    disabled={savingYarnReqRowIndex === rowIndex}
                                    className="px-2 py-1 text-xs font-medium rounded-md bg-brand text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Save this row"
                                  >
                                    {savingYarnReqRowIndex === rowIndex ? 'Saving…' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cancelYarnReqEdit(rowIndex)}
                                    disabled={savingYarnReqRowIndex === rowIndex}
                                    className="p-1.5 rounded text-gray-500 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Discard changes"
                                  >
                                    <X className="w-4 h-4" strokeWidth={2} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteYarnReqRowAt(rowIndex)}
                                    className="p-1.5 rounded text-gray-400 hover:text-red-600"
                                    title="Delete row"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {!isSessionRow && (
                                <>
                                  {row.id != null && !yarnReqEditIds.has(row.id) && (
                                    <button
                                      type="button"
                                      onClick={() => !blockOtherRows && startEditYarnReqRow(row.id)}
                                      disabled={blockOtherRows}
                                      className={`p-1.5 rounded ${blockOtherRows ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand'}`}
                                      title={blockOtherRows ? 'Save the row you are editing first' : 'Edit row'}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => !blockOtherRows && deleteYarnReqRowAt(rowIndex)}
                                    disabled={blockOtherRows}
                                    className={`p-1.5 rounded ${blockOtherRows ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
                                    title={blockOtherRows ? 'Save the row you are editing first' : 'Delete row'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                        );
                      })()
                    ))
                  )}
                </tbody>
              </table>
            </div> 
            {canEdit && (
              <div className="flex flex-wrap items-center justify-start gap-2 mt-4">
                <Button variant="secondary" onClick={addYarnReqRow} disabled={yarnReqSessionIndex !== null}>
                  + Add Row
                </Button>
              </div>
            )}
            </>
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
  colour: '',
  count: '',
  content: '',
  type: '',
  no_of_bags: '',
  bundles: '',
  knots: '',
  net_weight: '',
  gross_weight: '',
};

function YarnReceiptModal({ receipt, yarnOrders = [], defaultYarnOrderId = null, onClose, onSaved }) {
  const { options: typeOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_RECEIPT_TYPE, {
    fallback: FALLBACK_YARN_RECEIPT_TYPES,
  });
  const { options: yarnColourOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_COLOUR, {
    fallback: FALLBACK_YARN_COLOURS,
    dropdownType: 'MASTER',
  });
  const { options: yarnReceiptCountOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_RECEIPT_COUNT, {
    fallback: FALLBACK_YARN_RECEIPT_COUNT_CONTENT,
    dropdownType: 'MASTER',
  });
  const { options: yarnReceiptContentOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_RECEIPT_CONTENT, {
    fallback: FALLBACK_YARN_RECEIPT_COUNT_CONTENT,
    dropdownType: 'MASTER',
  });
  const isEdit = Boolean(receipt?.id);
  const [form, setForm] = useState(isEdit ? {
    yarn_order_id: receipt.yarn_order_id ?? '',
    dc_no: receipt.dc_no ?? '',
    vehicle_details: receipt.vehicle_details ?? '',
    date: receipt.date ? (typeof receipt.date === 'string' ? receipt.date.slice(0, 10) : '') : '',
    colour: receipt.colour ?? '',
    count: receipt.count ?? '',
    content: receipt.content ?? '',
    type: receipt.type ?? '',
    no_of_bags: receipt.no_of_bags ?? '',
    bundles: receipt.bundles ?? '',
    knots: receipt.knots ?? '',
    net_weight: receipt.net_weight ?? '',
    gross_weight: receipt.gross_weight ?? '',
  } : { yarn_order_id: defaultYarnOrderId ? String(defaultYarnOrderId) : '', ...emptyForm });
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((f) => {
    if (field === 'type') {
      const next = { ...f, type: value };
      if (value === 'Cone') {
        next.bundles = '';
        next.knots = '';
      } else if (value === 'Hank') {
        next.no_of_bags = '';
      }
      return next;
    }
    return { ...f, [field]: value };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const qty = receiptQtyPayloadForType(form);
    const payload = {
      yarn_order_id: form.yarn_order_id === '' ? null : Number(form.yarn_order_id),
      dc_no: form.dc_no || null,
      vehicle_details: form.vehicle_details || null,
      date: form.date || null,
      colour: form.colour || null,
      count: form.count || null,
      content: form.content || null,
      type: form.type || null,
      ...qty,
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
              <div className={inputClass}>
                <FormSelect
                  label="Colour"
                  options={yarnColourOptions}
                  value={form.colour}
                  onChange={(e) => update('colour', e.target.value)}
                  emptyLabel="Select colour"
                  className="!mb-0"
                />
              </div>
              <div className={inputClass}>
                <FormSelect
                  label="Count"
                  options={yarnReceiptCountOptions}
                  value={form.count}
                  onChange={(e) => update('count', e.target.value)}
                  emptyLabel="Select count"
                  className="!mb-0"
                />
              </div>
              <div className={inputClass}>
                <FormSelect
                  label="Content"
                  options={yarnReceiptContentOptions}
                  value={form.content}
                  onChange={(e) => update('content', e.target.value)}
                  emptyLabel="Select content"
                  className="!mb-0"
                />
              </div>
              <FormSelect
                label="Type"
                options={typeOptions}
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className={inputClass}
                isClearable={false}
                hideIndicators
              />
              <FormInput
                label="No of Bags"
                type="number"
                min="0"
                value={form.no_of_bags}
                onChange={(e) => update('no_of_bags', e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={yarnReceiptTypeIsHank(form.type)}
                title={yarnReceiptTypeIsHank(form.type) ? 'Not used for Hank' : undefined}
              />
              <FormInput
                label="Bundles"
                type="number"
                min="0"
                value={form.bundles}
                onChange={(e) => update('bundles', e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={yarnReceiptTypeIsCone(form.type)}
                title={yarnReceiptTypeIsCone(form.type) ? 'Not used for Cone' : undefined}
              />
              <FormInput
                label="Knots"
                type="number"
                min="0"
                value={form.knots}
                onChange={(e) => update('knots', e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={yarnReceiptTypeIsCone(form.type)}
                title={yarnReceiptTypeIsCone(form.type) ? 'Not used for Cone' : undefined}
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
  description: '', colour: '', design: '', weave_technique: '',
  warp_count: '', warp_content: '', weft_count: '', weft_content: '',
  con_on_loom_reed: '', con_on_loom_pick: '', con_final_reed: '', con_final_pick: '',
  gsm_required: '', actual_gsm: '', required_width: '', po_quantity: '', price_per_metre: '',
};

function FabricModal({ yarnOrderId, fabric, onClose, onSaved }) {
  const { options: fabricColourOptions } = useGenericCode(GENERIC_CODE_TYPES.COLOUR, {
    fallback: FALLBACK_PLANNING_COLOURS,
    dropdownType: 'MASTER',
  });
  const { options: yarnReceiptCountOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_RECEIPT_COUNT, {
    fallback: FALLBACK_YARN_RECEIPT_COUNT_CONTENT,
    dropdownType: 'MASTER',
  });
  const { options: yarnReceiptContentOptions } = useGenericCode(GENERIC_CODE_TYPES.YARN_RECEIPT_CONTENT, {
    fallback: FALLBACK_YARN_RECEIPT_COUNT_CONTENT,
    dropdownType: 'MASTER',
  });
  const isEdit = Boolean(fabric?.id);
  const [form, setForm] = useState(isEdit ? {
    description: fabric.description ?? '',
    colour: fabric.colour ?? '',
    design: fabric.design ?? '',
    weave_technique: fabric.weave_technique ?? '',
    warp_count: fabric.warp_count ?? '',
    warp_content: fabric.warp_content ?? '',
    weft_count: fabric.weft_count ?? '',
    weft_content: fabric.weft_content ?? '',
    con_on_loom_reed: fabric.con_on_loom_reed ?? '',
    con_on_loom_pick: fabric.con_on_loom_pick ?? '',
    con_final_reed: fabric.con_final_reed ?? '',
    con_final_pick: fabric.con_final_pick ?? '',
    gsm_required: fabric.gsm_required ?? '',
    actual_gsm: fabric.actual_gsm ?? '',
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
      colour: form.colour?.trim() || null,
      design: form.design || null,
      weave_technique: form.weave_technique || null,
      warp_count: form.warp_count || null,
      warp_content: form.warp_content || null,
      weft_count: form.weft_count || null,
      weft_content: form.weft_content || null,
      con_on_loom_reed: form.con_on_loom_reed === '' ? null : Number(form.con_on_loom_reed),
      con_on_loom_pick: form.con_on_loom_pick === '' ? null : Number(form.con_on_loom_pick),
      con_final_reed: form.con_final_reed === '' ? null : Number(form.con_final_reed),
      con_final_pick: form.con_final_pick === '' ? null : Number(form.con_final_pick),
      gsm_required: form.gsm_required === '' ? null : Number(form.gsm_required),
      actual_gsm: form.actual_gsm === '' ? null : Number(form.actual_gsm),
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormInput label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} className={cell} />
              <div className={cell}>
                <span className="block text-sm font-medium text-gray-700 mb-1">Colour</span>
                <MultiColourInput
                  value={form.colour}
                  onChange={(v) => update('colour', v)}
                  options={fabricColourOptions}
                  disabled={loading}
                  placeholder="Add colour…"
                />
              </div>
              <FormInput label="Design" value={form.design} onChange={(e) => update('design', e.target.value)} className={cell} />
              <FormInput label="Weave Technique" value={form.weave_technique} onChange={(e) => update('weave_technique', e.target.value)} className={cell} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className={cell}>
                <FormSelect
                  label="Warp Count"
                  options={yarnReceiptCountOptions}
                  value={form.warp_count}
                  onChange={(e) => update('warp_count', e.target.value)}
                  emptyLabel="Select count"
                  className="!mb-0"
                />
              </div>
              <div className={cell}>
                <FormSelect
                  label="Warp Content"
                  options={yarnReceiptContentOptions}
                  value={form.warp_content}
                  onChange={(e) => update('warp_content', e.target.value)}
                  emptyLabel="Select content"
                  className="!mb-0"
                />
              </div>
              <div className={cell}>
                <FormSelect
                  label="Weft Count"
                  options={yarnReceiptCountOptions}
                  value={form.weft_count}
                  onChange={(e) => update('weft_count', e.target.value)}
                  emptyLabel="Select count"
                  className="!mb-0"
                />
              </div>
              <div className={cell}>
                <FormSelect
                  label="Weft Content"
                  options={yarnReceiptContentOptions}
                  value={form.weft_content}
                  onChange={(e) => update('weft_content', e.target.value)}
                  emptyLabel="Select content"
                  className="!mb-0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormInput label="Con On Loom Reed" type="number" step="any" value={form.con_on_loom_reed} onChange={(e) => update('con_on_loom_reed', e.target.value)} className={cell} />
              <FormInput label="Con On Loom Pick" type="number" step="any" value={form.con_on_loom_pick} onChange={(e) => update('con_on_loom_pick', e.target.value)} className={cell} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormInput label="Con Final Reed" type="number" step="any" value={form.con_final_reed} onChange={(e) => update('con_final_reed', e.target.value)} className={cell} />
              <FormInput label="Con Final Pick" type="number" step="any" value={form.con_final_pick} onChange={(e) => update('con_final_pick', e.target.value)} className={cell} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <FormInput label="gsm rqd" type="number" step="any" value={form.gsm_required} onChange={(e) => update('gsm_required', e.target.value)} className={cell} />
              <FormInput label="Actual GSM" type="number" step="any" value={form.actual_gsm} onChange={(e) => update('actual_gsm', e.target.value)} className={cell} />
              <FormInput label="Width" type="number" step="any" value={form.required_width} onChange={(e) => update('required_width', e.target.value)} className={cell} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormInput label="PO Qty" type="number" step="any" value={form.po_quantity} onChange={(e) => update('po_quantity', e.target.value)} className={cell} />
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
