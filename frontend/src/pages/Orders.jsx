import React from 'react';
import { usePagePermission } from '../hooks/usePagePermission';
import { OrderGridTable } from '../components/OrderGridTable';

export function OrderList() {
  const { canEdit } = usePagePermission();
  return (
    <div>
      <OrderGridTable canEdit={canEdit} />
    </div>
  );
}

export function OrderForm({ id, onSuccess }) {
  return null;
}
