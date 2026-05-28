import { useNavigate } from 'react-router-dom';
import { SAMPLE_ORDERS } from '@/lib/data';
import { useApp } from '@/store/AppContext';

export function Orders() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const statusClass: Record<string, string> = {
    shipped: 'os-shipped', delivered: 'os-delivered', processing: 'os-processing', pending: 'os-pending',
  };
  const statusLabel: Record<string, string> = {
    shipped: '🚚 Shipped', delivered: '✅ Delivered', processing: '⏳ Processing', pending: '🕐 Pending',
  };

  return (
    <div className="orders-page">
      <div className="orders-wrap">
        <h1 className="orders-title">My Orders 📦</h1>
        <p className="orders-sub">Track your CSM Silks orders and manage returns</p>
        {SAMPLE_ORDERS.map(o => (
          <div key={o.id} className="order-card" onClick={() => navigate(`/tracking/${o.id}`)}>
            <div className="oc-header">
              <span className="oc-id">#{o.id}</span>
              <span className={`oc-status ${statusClass[o.status]}`}>{statusLabel[o.status]}</span>
            </div>
            <div className="oc-body">
              <div className="oc-img" style={{ background: o.product.bg }}>{o.product.emoji}</div>
              <div>
                <div className="oc-name">{o.product.name}</div>
                <div className="oc-meta">{o.date} · {o.courier}</div>
              </div>
              <div className="oc-price">₹{o.product.price.toLocaleString('en-IN')}</div>
            </div>
            <div className="oc-actions">
              {o.status === 'shipped' && (
                <button className="oc-btn oc-btn-track" onClick={(e) => { e.stopPropagation(); navigate(`/tracking/${o.id}`); }}>
                  📍 Track Order
                </button>
              )}
              {o.status === 'delivered' && (
                <button className="oc-btn oc-btn-review" onClick={(e) => { e.stopPropagation(); showToast('⭐', 'Rate & Review', 'Thanks for your feedback!'); }}>
                  ⭐ Review
                </button>
              )}
              <button className="oc-btn oc-btn-invoice" onClick={(e) => { e.stopPropagation(); showToast('📄', 'Invoice', `INV-2025-${o.id} sent to your email`); }}>
                🧾 Invoice
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
