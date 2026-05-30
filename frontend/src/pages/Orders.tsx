import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useApp } from '@/store/AppContext';
import { ProductVisual } from '@/ui/components';
import type { Order } from '@/types';

export function Orders() {
  const navigate = useNavigate();
  const { showToast, isAuthed } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    api.orders.list()
      .then(data => setOrders(data.items))
      .catch(() => setOrders([]));
  }, [isAuthed]);

  const cancelOrder = async (order: Order) => {
    try {
      const updated = await api.orders.cancel(order.id);
      setOrders(prev => prev.map(item => item.id === updated.id ? updated : item));
      showToast('OK', 'Order cancelled', `${order.order_number} has been cancelled`);
    } catch (err) {
      showToast('!', 'Cancel failed', err instanceof Error ? err.message : 'Unable to cancel order');
    }
  };

  const requestReturn = async (order: Order) => {
    try {
      await api.returns.create({ order_id: order.id, reason: 'Customer return request', details: 'Return requested from account orders page.' });
      setOrders(prev => prev.map(item => item.id === order.id ? { ...item, status: 'return_initiated' } : item));
      showToast('OK', 'Return requested', `Return request created for ${order.order_number}`);
    } catch (err) {
      showToast('!', 'Return failed', err instanceof Error ? err.message : 'Unable to request return');
    }
  };

  const statusClass: Record<string, string> = {
    packed: 'os-processing',
    shipped: 'os-shipped',
    out_for_delivery: 'os-shipped',
    delivered: 'os-delivered',
    confirmed: 'os-processing',
    quality_check: 'os-processing',
    return_initiated: 'os-pending',
    returned: 'os-pending',
    refunded: 'os-delivered',
    payment_pending: 'os-pending',
    pending: 'os-pending',
    cancelled: 'os-pending',
  };
  const statusLabel: Record<string, string> = {
    packed: 'Packed',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    confirmed: 'Confirmed',
    quality_check: 'Quality Check',
    return_initiated: 'Return Initiated',
    returned: 'Returned',
    refunded: 'Refunded',
    payment_pending: 'Payment Pending',
    pending: 'Pending',
    cancelled: 'Cancelled',
  };

  if (!isAuthed) {
    return (
      <div className="orders-page">
        <div className="orders-wrap">
          <h1 className="orders-title">My Orders</h1>
          <p className="orders-sub">Please sign in from Account to view your orders.</p>
          <button className="btn btn-gold" onClick={() => navigate('/account')}>Sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-wrap">
        <h1 className="orders-title">My Orders</h1>
        <p className="orders-sub">Track your CSM Silks orders and manage returns</p>
        {orders.length === 0 && <div className="cart-empty">No orders yet.</div>}
        {orders.map(o => {
          const first = o.items?.[0];
          const p = first?.product;
          return (
            <div key={o.id} className="order-card" onClick={() => navigate(`/tracking/${o.id}`)}>
              <div className="oc-header">
                <span className="oc-id">#{o.order_number}</span>
                <span className={`oc-status ${statusClass[o.status] || 'os-processing'}`}>{statusLabel[o.status] || o.status}</span>
              </div>
              <div className="oc-body">
                <ProductVisual product={p} className="oc-img" />
                <div>
                  <div className="oc-name">{first?.product_name || 'CSM Silks order'}</div>
                  <div className="oc-meta">{new Date(o.created_at).toLocaleDateString('en-IN')} - {o.courier_name || 'Processing'}</div>
                </div>
                <div className="oc-price">Rs {Number(o.total_amount).toLocaleString('en-IN')}</div>
              </div>
              <div className="oc-actions">
                {['shipped', 'out_for_delivery', 'delivered'].includes(o.status) && (
                  <button className="oc-btn oc-btn-track" onClick={(e) => { e.stopPropagation(); navigate(`/tracking/${o.id}`); }}>
                    Track Order
                  </button>
                )}
                {o.status === 'delivered' && (
                  <button className="oc-btn oc-btn-review" onClick={(e) => { e.stopPropagation(); showToast('OK', 'Rate & Review', 'Thanks for your feedback'); }}>
                    Review
                  </button>
                )}
                {['pending', 'payment_pending', 'confirmed'].includes(o.status) && (
                  <button className="oc-btn oc-btn-cancel" onClick={(e) => { e.stopPropagation(); void cancelOrder(o); }}>
                    Cancel
                  </button>
                )}
                {o.status === 'delivered' && (
                  <button className="oc-btn oc-btn-return" onClick={(e) => { e.stopPropagation(); void requestReturn(o); }}>
                    Return
                  </button>
                )}
                <button className="oc-btn oc-btn-invoice" onClick={(e) => { e.stopPropagation(); showToast('OK', 'Invoice', `Invoice for ${o.order_number} is available in admin v1`); }}>
                  Invoice
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
