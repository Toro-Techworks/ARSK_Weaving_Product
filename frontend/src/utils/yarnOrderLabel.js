import { formatOrderId } from './formatOrderId';

function sliceDate(d) {
  if (d == null || d === '') return '';
  return String(d).slice(0, 10);
}

/** Fields needed to render yarn order labels in dropdowns. */
export function yarnOrderSnapshot(order) {
  if (!order) return null;
  return {
    id: order.id,
    display_order_id: order.display_order_id ?? null,
    order_from: order.order_from ?? null,
    po_number: order.po_number ?? null,
    customer: order.customer ?? null,
    weaving_unit: order.weaving_unit ?? null,
    po_date: sliceDate(order.po_date),
    delivery_date: sliceDate(order.delivery_date),
    created_at: order.created_at ?? null,
  };
}

/** Primary line: order id · P.O. · customer */
export function formatYarnOrderPrimaryLine(order) {
  if (!order) return '';
  const code = formatOrderId(order);
  const parts = [code || null];
  const po = order.po_number != null ? String(order.po_number).trim() : '';
  if (po) parts.push(`P.O. ${po}`);
  const customer = order.customer != null ? String(order.customer).trim() : '';
  if (customer) parts.push(customer);
  return parts.filter(Boolean).join(' · ') || `Order #${order.id}`;
}

/**
 * Secondary line: company (optional) · weaving unit · P.O. date · delivery date
 * @param {{ hideOrderFrom?: boolean }} opts
 */
export function formatYarnOrderSecondaryLine(order, opts = {}) {
  if (!order) return '';
  const { hideOrderFrom = false } = opts;
  const parts = [];
  if (!hideOrderFrom) {
    const from = order.order_from != null ? String(order.order_from).trim() : '';
    if (from) parts.push(from);
  }
  const unit = order.weaving_unit != null ? String(order.weaving_unit).trim() : '';
  if (unit) parts.push(`Unit: ${unit}`);
  const poDate = sliceDate(order.po_date);
  if (poDate) parts.push(`P.O. date ${poDate}`);
  const delivery = sliceDate(order.delivery_date);
  if (delivery) parts.push(`Delivery ${delivery}`);
  return parts.join(' · ');
}

/** Single-line label (SearchableSelect options, compact views). */
export function formatYarnOrderLabel(order) {
  const primary = formatYarnOrderPrimaryLine(order);
  const secondary = formatYarnOrderSecondaryLine(order);
  if (!secondary) return primary;
  return `${primary} (${secondary})`;
}

/** Value shown in the input after selection. */
export function formatYarnOrderSelectedValue(order, opts = {}) {
  const primary = formatYarnOrderPrimaryLine(order);
  const secondary = formatYarnOrderSecondaryLine(order, opts);
  if (!secondary) return primary;
  return `${primary} — ${secondary}`;
}
