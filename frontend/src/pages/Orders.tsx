import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useApp } from '@/store/AppContext';
import { ProductVisual } from '@/ui/components';
import type { Order } from '@/types';

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string; email?: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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

  const retryPayment = async (order: Order) => {
    try {
      const rz = await api.payments.createRazorpayOrder(order.id);
      if (rz.key) {
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) throw new Error('Unable to load Razorpay checkout');
        const RazorpayCtor = window.Razorpay as unknown as new (options: RazorpayOptions) => { open: () => void };
        await new Promise<void>((resolve, reject) => {
          new RazorpayCtor({
            key: rz.key || '',
            amount: rz.amount,
            currency: rz.currency,
            name: 'CSM Silks',
            description: order.order_number,
            order_id: rz.razorpay_order_id,
            prefill: { name: 'CSM Customer', contact: '' },
            handler: async (response) => {
              try {
                await api.payments.verify(response);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: { ondismiss: () => reject(new Error('Payment was not completed')) },
            theme: { color: '#b9842e' },
          }).open();
        });
      } else {
        await api.payments.verify({
          razorpay_order_id: rz.razorpay_order_id,
          razorpay_payment_id: `pay_retry_${Date.now()}`,
          razorpay_signature: 'dev',
        });
      }
      const refreshed = await api.orders.get(order.id);
      setOrders(prev => prev.map(item => item.id === refreshed.id ? refreshed : item));
      showToast('OK', 'Payment confirmed', `${order.order_number} is confirmed`);
    } catch (err) {
      showToast('!', 'Payment retry failed', err instanceof Error ? err.message : 'Unable to retry payment');
    }
  };

  const downloadInvoice = async (order: Order) => {
    try {
      const blob = await api.orders.invoice(order.id);
      saveBlob(blob, `invoice-${order.order_number}.html`);
    } catch (err) {
      showToast('!', 'Invoice failed', err instanceof Error ? err.message : 'Unable to download invoice');
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
    delivery_failed: 'os-pending',
    rto_initiated: 'os-pending',
    rto_delivered: 'os-pending',
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
    delivery_failed: 'Delivery Failed',
    rto_initiated: 'Returning to Seller',
    rto_delivered: 'Returned to Seller',
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
                {['shipped', 'out_for_delivery', 'delivered', 'delivery_failed', 'rto_initiated', 'rto_delivered'].includes(o.status) && (
                  <button className="oc-btn oc-btn-track" onClick={(e) => { e.stopPropagation(); navigate(`/tracking/${o.id}`); }}>
                    Track Order
                  </button>
                )}
                {o.status === 'payment_pending' && (
                  <button className="oc-btn oc-btn-track" onClick={(e) => { e.stopPropagation(); void retryPayment(o); }}>
                    Retry Payment
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
                <button className="oc-btn oc-btn-invoice" onClick={(e) => { e.stopPropagation(); void downloadInvoice(o); }}>
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
