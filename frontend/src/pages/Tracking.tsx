import { useParams, useNavigate } from 'react-router-dom';
import { SAMPLE_ORDERS } from '@/lib/data';

export function Tracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const order = SAMPLE_ORDERS.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="tracking-page">
        <div className="tracking-wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)' }}>Order not found</h2>
          <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>
      </div>
    );
  }

  const p = order.product;
  const isDelivered = order.status === 'delivered';

  const steps = [
    { title: 'Order Placed', desc: 'Payment confirmed · Razorpay', time: '17 Mar 11:42 AM', status: 'done' },
    { title: 'Quality Check Passed', desc: 'Silk purity 98% · Certificate issued', time: '17 Mar 3:20 PM', status: 'done' },
    { title: 'Packed in Luxury Box', desc: 'CSM signature gift packaging', time: '17 Mar 5:10 PM', status: 'done' },
    { title: isDelivered ? 'Delivered' : 'In Transit ✦', desc: isDelivered ? 'Delivered to your address' : 'Kanchipuram → Chennai', time: '18 Mar 8:05 AM', status: isDelivered ? 'done' : 'act' },
    { title: 'Delivered', desc: isDelivered ? 'Successfully delivered' : 'ETA: 19 Mar by 7 PM', time: '', status: isDelivered ? 'done' : '' },
  ];

  return (
    <div className="tracking-page">
      <div className="tracking-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate('/orders')}>
          <span style={{ fontSize: 18, color: 'var(--ink)' }}>←</span>
          <span style={{ fontSize: 13, color: 'rgba(13,11,8,.5)' }}>Back to Orders</span>
        </div>

        <div className="track-header">
          <div className="track-id-row">
            <span className="track-id">#{order.id}</span>
            <span className="track-eta">{isDelivered ? `Delivered on ${order.date}` : 'Expected: Tomorrow by 7 PM'}</span>
          </div>
          <div className="track-prod-row">
            <div className="track-img" style={{ background: p.bg }}>{p.emoji}</div>
            <div>
              <div className="track-pname">{p.name}</div>
              <div className="track-pmeta">{p.gender === 'men' ? "Men's Silk · 1 unit" : 'Pure Kanjivaram · 1 unit'}</div>
            </div>
            <div className="track-pprice">₹{p.price.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className={`track-status-card ${isDelivered ? 'tsc-delivered' : 'tsc-transit'}`}>
          <div className="tsc-icon">{isDelivered ? '✅' : '🚚'}</div>
          <div>
            <div className="tsc-status">{isDelivered ? 'Delivered' : 'In Transit'}</div>
            <div className="tsc-desc">{isDelivered ? 'Delivered to your address' : 'Kanchipuram → Chennai via BlueDart'}</div>
            <div className="tsc-eta">{isDelivered ? `Delivered successfully on ${order.date}` : 'Expected delivery: Tomorrow 19 Mar, by 7 PM'}</div>
          </div>
        </div>

        <div className="track-map">
          <div className="tm-route" />
          <div className="tm-pin-a" />
          <div className="tm-pin-b" />
          <div className="tm-truck">🚚</div>
          <span className="tm-label">Live Route</span>
        </div>

        <div className="track-timeline">
          <div className="tl-title">Order Timeline</div>
          {steps.map((s, i) => (
            <div key={i} className={`tl-item ${s.status}`}>
              <div className="tl-left">
                <div className="tl-dot">{s.status === 'done' ? '✓' : s.status === 'act' ? '🚚' : ''}</div>
                {i < steps.length - 1 && <div className="tl-line" />}
              </div>
              <div className="tl-right">
                <div className="tl-step-title">{s.title}</div>
                <div className="tl-step-desc">{s.desc}</div>
                {s.time && <div className="tl-time">{s.time}</div>}
                {s.status === 'act' && <div className="tl-loc">📍 Chennai Sorting Hub</div>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => {}}>📞 Call Support</button>
          <a className="btn btn-wa" style={{ fontSize: 12 }} href="https://wa.me/919876543210?text=Hi!%20My%20order%20is%20in%20transit.%20Order%20ID:" target="_blank">💬 WhatsApp Support</a>
        </div>
      </div>
    </div>
  );
}
