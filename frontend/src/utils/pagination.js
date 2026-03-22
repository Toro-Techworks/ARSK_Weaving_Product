/**
 * Normalize Laravel paginated JSON (root keys + legacy meta wrapper).
 */
export function normalizePaginatedResponse(payload) {
  const b = payload && typeof payload === 'object' ? payload : {};
  const meta = b.meta || {};
  return {
    data: Array.isArray(b.data) ? b.data : [],
    current_page: Number(b.current_page ?? meta.current_page ?? 1),
    last_page: Number(b.last_page ?? meta.last_page ?? 1),
    per_page: Number(b.per_page ?? meta.per_page ?? 10),
    total: Number(b.total ?? meta.total ?? 0),
  };
}

/**
 * Fetch every page from a paginated index endpoint (e.g. permission matrix users).
 */
export async function fetchAllPaginated(api, url, { perPage = 200, ...extraParams } = {}) {
  let page = 1;
  let all = [];
  let lastPage = 1;
  do {
    // eslint-disable-next-line no-await-in-loop
    const { data: body } = await api.get(url, { params: { ...extraParams, page, per_page: perPage } });
    const n = normalizePaginatedResponse(body);
    all = all.concat(n.data);
    lastPage = n.last_page;
    page += 1;
  } while (page <= lastPage);
  return all;
}
