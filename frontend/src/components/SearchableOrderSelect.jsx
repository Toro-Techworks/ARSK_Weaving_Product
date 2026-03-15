import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import api from '../api/client';

/**
 * Searchable order dropdown. Search by DC number / order ID.
 * value: order id (number or string), onChange: (orderId, order | null) => void
 */
export function SearchableOrderSelect({ label, value, onChange, placeholder = 'Search by DC number or order...', className = '' }) {
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
    api.get('/orders', { params: { search: search.trim(), per_page: 15 } })
      .then(({ data: res }) => setOptions(res.data || []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOrders(query), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // When value changes externally, try to show label (we don't have order loaded, so show id or fetch one)
  useEffect(() => {
    if (value && selectedOrder?.id === Number(value)) return;
    if (!value) {
      setSelectedOrder(null);
      setQuery('');
      return;
    }
    // Fetch single order to show label
    api.get(`/orders/${value}`).then(({ data }) => {
      const o = data.data;
      setSelectedOrder(o ? { id: o.id, dc_number: o.dc_number, company: o.company, fabric_type: o.fabric_type } : null);
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
    const o = { id: order.id, dc_number: order.dc_number, company: order.company, fabric_type: order.fabric_type };
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
    ? `${selectedOrder.dc_number}${selectedOrder.company?.company_name ? ` — ${selectedOrder.company.company_name}` : ''}${selectedOrder.fabric_type ? ` — ${selectedOrder.fabric_type}` : ''}`
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
                {query.trim() ? 'No orders found. Try another DC number.' : 'Type to search by DC number or fabric.'}
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
                      <span className="font-medium text-gray-900">{o.dc_number}</span>
                      {o.company?.company_name && <span className="text-gray-600"> — {o.company.company_name}</span>}
                      {o.fabric_type && <span className="text-gray-500"> — {o.fabric_type}</span>}
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
