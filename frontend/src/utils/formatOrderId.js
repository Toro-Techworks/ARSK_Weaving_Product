export function formatOrderId(orderOrId, dateLike) {
  const id = typeof orderOrId === 'object' && orderOrId ? orderOrId.id : orderOrId;
  if (id == null || id === '') return '';

  const d =
    (typeof orderOrId === 'object' && orderOrId ? (orderOrId.created_at || orderOrId.po_date || orderOrId.delivery_date) : null) ||
    dateLike ||
    new Date().toISOString();

  const year = (() => {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return new Date().getFullYear();
    return dt.getFullYear();
  })();

  const yy = String(year).slice(-2);
  const seq = String(Number(id)).padStart(5, '0'); // 1 -> 00001
  return `AEWU${yy}${seq}`; // ex: AEWU2600001
}

export default formatOrderId;

