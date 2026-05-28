import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';

export function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQty, getCartTotals, showToast } = useApp();
  const t = getCartTotals();
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  const handleApplyPromo = () => {
    const input = document.getElementById('promoInput') as HTMLInputElement;
    const code = input?.value?.toUpperCase();
    if (code === 'CSM10') showToast('🎁', 'Promo Applied!', '10% discount has been applied');
    else showToast('❌', 'Invalid Code', 'Try CSM10 for 10% off');
  };

  return (
    <div className="cart-page">
      <div className="cart-layout">
        <div>
          <h1 className="cart-title">Shopping Cart 🛒</h1>
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🛒</div>
              <div className="cart-empty-title">Your cart is empty</div>
              <div className="cart-empty-sub">Discover our beautiful silk collection</div>
              <button className="btn btn-gold" onClick={() => navigate('/womens')}>🪡 Shop Women's</button>
              &nbsp;
              <button className="btn btn-ghost" onClick={() => navigate('/mens')}>👔 Shop Men's</button>
            </div>
          ) : (
            cart.map(p => (
              <div key={p.id} className="cart-item">
                <div className="ci-img" style={{ background: p.bg }}>{p.emoji}</div>
                <div className="ci-info">
                  <div className="ci-cat">{p.cat}</div>
                  <div className="ci-name">{p.name}</div>
                  <div className="ci-meta">{p.gender === 'men' ? "Men's Silk" : 'Pure Kanjivaram Silk'} · Free shipping</div>
                  <div className="ci-qty">
                    <button className="ci-qty-btn" onClick={() => updateQty(p.id, -1)}>−</button>
                    <span className="ci-qty-num">{p.qty}</span>
                    <button className="ci-qty-btn" onClick={() => updateQty(p.id, 1)}>+</button>
                  </div>
                </div>
                <div className="ci-right">
                  <div className="ci-price">₹{(p.price * p.qty).toLocaleString('en-IN')}</div>
                  <button className="ci-remove" onClick={() => removeFromCart(p.id)}>Remove ✕</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div>
          <div className="order-summary">
            <div className="os-title">Order Summary</div>
            <div className="os-row"><span>Subtotal</span><span className="os-val">{fmt(t.subtotal)}</span></div>
            <div className="os-row"><span>Shipping</span><span className="os-val" style={{ color: 'var(--grn)' }}>Free ✓</span></div>
            <div className="os-row"><span>CGST (2.5%)</span><span className="os-val">{fmt(t.cgst)}</span></div>
            <div className="os-row"><span>SGST (2.5%)</span><span className="os-val">{fmt(t.sgst)}</span></div>
            <div className="os-row total"><span>Total</span><span className="os-val">{fmt(t.total)}</span></div>
            <div className="os-promo">
              <input className="os-promo-input" placeholder="Promo code…" id="promoInput" />
              <button className="os-promo-btn" onClick={handleApplyPromo}>Apply</button>
            </div>
            <button className="os-checkout-btn" onClick={() => navigate('/checkout')} disabled={cart.length === 0}>
              Proceed to Checkout →
            </button>
            <div className="os-guarantees">
              <div className="og">✓ Free pan-India shipping</div>
              <div className="og">✓ 15-day easy returns</div>
              <div className="og">✓ GST invoice included</div>
              <div className="og">✓ Secure Razorpay payment</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
