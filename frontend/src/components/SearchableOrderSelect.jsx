import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import api from '../api/client';
import { normalizePaginatedResponse } from '../utils/pagination';
import {
  formatYarnOrderPrimaryLine,
  formatYarnOrderSecondaryLine,
  formatYarnOrderSelectedValue,
  yarnOrderSnapshot,
} from '../utils/yarnOrderLabel';

/**
 * Searchable yarn order dropdown. Search by PO number, customer, or order ID.
 * value: yarn order id (number or string), onChange: (orderId, order | null) => void
 * companyId: when set, only lists yarn orders for that company (order_from match).
 */
export function SearchableOrderSelect({
  label,
  value,
  onChange,
  placeholder = 'Search by P.O number or customer...',
  className = '',
  companyId = '',
  orderFrom = '',
  disabled = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const companyFilterActive = Boolean(companyId) || Boolean(String(orderFrom || '').trim());

  const fetchOrders = (search) => {
    const q = search?.trim() || '';
    if (!q && !companyFilterActive) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const params = { per_page: companyFilterActive && !q ? 50 : 15 };
    if (q) params.search = q;
    if (companyId) params.company_id = companyId;
    else if (orderFrom?.trim()) params.filter_order_from = orderFrom.trim();
    api
      .get('/yarn-orders', { params })
      .then(({ data: res }) => setOptions(normalizePaginatedResponse(res).data))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOrders(query), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, companyId, orderFrom]);

  useEffect(() => {
    if (!companyFilterActive) {
      setOptions([]);
      return;
    }
    fetchOrders('');
  }, [companyId, orderFrom]);

  useEffect(() => {
    if (value && selectedOrder?.id === Number(value)) return;
    if (!value) {
      setSelectedOrder(null);
      setQuery('');
      return;
    }
    api.get(`/yarn-orders/${value}`).then(({ data }) => {
      const o = data.data;
      setSelectedOrder(o ? yarnOrderSnapshot(o) : null);
      if (o) setQuery('');
    }).catch(() => setSelectedOrder(null));
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (order) => {
    setSelectedOrder(yarnOrderSnapshot(order));
    setQuery('');
    setOpen(false);
    onChange(order.id, order);
  };

  const handleClear = () => {
    setSelectedOrder(null);
    setQuery('');
    onChange('', null);
    setOpen(false);
  };

  useEffect(() => {
    if (!companyFilterActive && selectedOrder) {
      handleClear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear when company filter removed
  }, [companyFilterActive]);

  const hideOrderFromInDetails = companyFilterActive;
  const displayValue = selectedOrder
    ? formatYarnOrderSelectedValue(selectedOrder, { hideOrderFrom: hideOrderFromInDetails })
    : '';

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
          <span className="flex items-center pl-3 text-gray-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={selectedOrder ? displayValue : query}
            onChange={(e) => {
              if (selectedOrder || disabled) return;
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (!selectedOrder && !disabled) {
                setOpen(true);
                if (companyFilterActive && !query.trim()) fetchOrders('');
              }
            }}
            placeholder={
              disabled && companyId
                ? 'Select a company first'
                : placeholder
            }
            disabled={disabled}
            className="flex-1 min-w-0 rounded-r-lg border-0 py-2.5 px-3 text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            readOnly={!!selectedOrder}
            title={selectedOrder ? displayValue : undefined}
          />
          {selectedOrder && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center pr-2 text-gray-400 hover:text-gray-600"
              aria-label="Clear order"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {open && !disabled && (query || !selectedOrder) && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-auto">
            {loading ? (
              <div className="py-4 text-center text-sm text-gray-500">Searching...</div>
            ) : options.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                {companyFilterActive && !query.trim()
                  ? 'No yarn orders for this company.'
                  : query.trim()
                    ? 'No orders found. Try P.O number or customer.'
                    : 'Type to search by P.O number or customer.'}
              </div>
            ) : (
              <ul className="py-1 divide-y divide-gray-100">
                {options.map((o) => {
                  const secondary = formatYarnOrderSecondaryLine(o, {
                    hideOrderFrom: hideOrderFromInDetails,
                  });
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(o)}
                        className="w-full text-left px-3 py-2.5 hover:bg-brand/5 focus:bg-brand/5 focus:outline-none"
                      >
                        <p className="text-sm font-medium text-gray-900 leading-snug">
                          {formatYarnOrderPrimaryLine(o)}
                        </p>
                        {secondary ? (
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{secondary}</p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchableOrderSelect;
