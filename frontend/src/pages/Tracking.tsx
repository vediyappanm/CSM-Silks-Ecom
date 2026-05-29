import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { ProductVisual } from '@/ui/components';
import type { Order } from '@/types';

export function Tracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    api.orders.get(orderId)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return <div className="tracking-page"><div className="tracking-wrap">Loading tracking...</div></div>;
  }

  if (!order) {
    return (
      <div className="tracking-page">
        <div className="tracking-wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>CSM</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)' }}>Order not found</h2>
          <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>
      </div>
    );
  }

  const first = order.items?.[0];
  const p = first?.product;
  const isDelivered = order.status === 'delivered';

  const steps = [
    { title: 'Order Placed', desc: `${order.payment_method || 'payment'} checkout`, time: new Date(order.created_at).toLocaleString('en-IN'), status: 'done' },
    { title: 'Quality Check', desc: 'Silk quality verification', time: order.confirmed_at ? new Date(order.confirmed_at).toLocaleString('en-IN') : '', status: order.confirmed_at ? 'done' : 'act' },
    { title: 'Packed', desc: 'Luxury CSM packaging', time: '', status: ['packed', 'shipped', 'out_for_delivery', 'delivered'].includes(order.status) ? 'done' : '' },
    { title: 'Shipped', desc: order.tracking_number || 'Courier assignment pending', time: order.shipped_at ? new Date(order.shipped_at).toLocaleString('en-IN') : '', status: ['shipped', 'out_for_delivery', 'delivered'].includes(order.status) ? 'act' : '' },
    { title: 'Delivered', desc: isDelivered ? 'Delivered to your address' : 'Delivery pending', time: order.delivered_at ? new Date(order.delivered_at).toLocaleString('en-IN') : '', status: isDelivered ? 'done' : '' },
  ];

  return (
    <div className="tracking-page">
      <div className="tracking-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate('/orders')}>
          <span style={{ fontSize: 18, color: 'var(--ink)' }}>Back</span>
          <span style={{ fontSize: 13, color: 'rgba(13,11,8,.5)' }}>Orders</span>
        </div>

        <div className="track-header">
          <div className="track-id-row">
            <span className="track-id">#{order.order_number}</span>
            <span className="track-eta">{isDelivered ? 'Delivered' : order.estimated_delivery ? `Expected: ${new Date(order.estimated_delivery).toLocaleDateString('en-IN')}` : 'Expected date pending'}</span>
          </div>
          <div className="track-prod-row">
            <ProductVisual product={p} className="track-img" />
            <div>
              <div className="track-pname">{first?.product_name || 'CSM Silks order'}</div>
              <div className="track-pmeta">Qty: {first?.quantity || 1}</div>
            </div>
            <div className="track-pprice">Rs {Number(order.total_amount).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className={`track-status-card ${isDelivered ? 'tsc-delivered' : 'tsc-transit'}`}>
          <div className="tsc-icon">{isDelivered ? 'Done' : 'Ship'}</div>
          <div>
            <div className="tsc-status">{isDelivered ? 'Delivered' : order.status.replaceAll('_', ' ')}</div>
            <div className="tsc-desc">{order.courier_name || 'Courier will be assigned by admin'}</div>
            <div className="tsc-eta">{order.tracking_number || 'Tracking number pending'}</div>
          </div>
        </div>

        <div className="track-timeline">
          <div className="tl-title">Order Timeline</div>
          {steps.map((s, i) => (
            <div key={i} className={`tl-item ${s.status}`}>
              <div className="tl-left">
                <div className="tl-dot">{s.status === 'done' ? 'OK' : s.status === 'act' ? '...' : ''}</div>
                {i < steps.length - 1 && <div className="tl-line" />}
              </div>
              <div className="tl-right">
                <div className="tl-step-title">{s.title}</div>
                <div className="tl-step-desc">{s.desc}</div>
                {s.time && <div className="tl-time">{s.time}</div>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }}>Call Support</button>
          <a className="btn btn-wa" style={{ fontSize: 12 }} href={`https://wa.me/919876543210?text=Hi!%20I%20need%20help%20with%20order%20${order.order_number}`} target="_blank">WhatsApp Support</a>
        </div>
      </div>
    </div>
  );
}
