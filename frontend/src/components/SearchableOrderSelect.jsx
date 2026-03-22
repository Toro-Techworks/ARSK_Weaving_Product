import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import api from '../api/client';
import { formatOrderId } from '../utils/formatOrderId';
import { normalizePaginatedResponse } from '../utils/pagination';

/**
 * Searchable yarn order dropdown. Search by PO number, customer, or order ID.
 * value: yarn order id (number or string), onChange: (orderId, order | null) => void
 */
export function SearchableOrderSelect({ label, value, onChange, placeholder = 'Search by P.O number or customer...', className = '' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const fetchOrders = (search) => {
    if (!search?.trim()) {
      setOptions([]);
      return;
    }
    setLoading(true);
    api.get('/yarn-orders', { params: { search: search.trim(), per_page: 15 } })
      .then(({ data: res }) => setOptions(normalizePaginatedResponse(res).data))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOrders(query), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    if (value && selectedOrder?.id === Number(value)) return;
    if (!value) {
      setSelectedOrder(null);
      setQuery('');
      return;
    }
    api.get(`/yarn-orders/${value}`).then(({ data }) => {
      const o = data.data;
      setSelectedOrder(o ? { id: o.id, po_number: o.po_number, customer: o.customer, order_from: o.order_from } : null);
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
    const o = { id: order.id, po_number: order.po_number, customer: order.customer, order_from: order.order_from };
    setSelectedOrder(o);
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

  const displayValue = selectedOrder
    ? `${formatOrderId(selectedOrder)}${selectedOrder.po_number ? ` — ${selectedOrder.po_number}` : ''}${selectedOrder.customer ? ` — ${selectedOrder.customer}` : ''}${selectedOrder.order_from ? ` (${selectedOrder.order_from})` : ''}`
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
              if (selectedOrder) return;
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => { if (!selectedOrder) setOpen(true); }}
            placeholder={placeholder}
            className="flex-1 min-w-0 rounded-r-lg border-0 py-2.5 px-3 text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none"
            readOnly={!!selectedOrder}
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
        {open && (query || !selectedOrder) && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
            {loading ? (
              <div className="py-4 text-center text-sm text-gray-500">Searching...</div>
            ) : options.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                {query.trim() ? 'No orders found. Try P.O number or customer.' : 'Type to search by P.O number or customer.'}
              </div>
            ) : (
              <ul className="py-1">
                {options.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(o)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand/5 focus:bg-brand/5 focus:outline-none"
                    >
                      <span className="font-medium text-gray-900">{formatOrderId(o)}</span>
                      {o.po_number && <span className="text-gray-600"> — {o.po_number}</span>}
                      {o.customer && <span className="text-gray-500"> — {o.customer}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchableOrderSelect;
