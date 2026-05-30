import { useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductVisual } from '@/ui/components';
import { useApp } from '@/store/AppContext';

export function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQty, getCartTotals, applyCoupon, couponCode } = useApp();
  const [promo, setPromo] = useState(couponCode);
  const [applying, setApplying] = useState(false);
  const totals = getCartTotals();
  const fmt = (n: number) => 'Rs ' + n.toLocaleString('en-IN');

  const handleApplyPromo = async () => {
    setApplying(true);
    try {
      await applyCoupon(promo);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="cart-page">
      <div className="cart-layout">
        <div>
          <h1 className="cart-title">Shopping cart</h1>
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={54} />
              <div className="cart-empty-title">Your cart is empty</div>
              <div className="cart-empty-sub">Browse the catalog and add a real SKU before checkout.</div>
              <button className="btn btn-primary" onClick={() => navigate('/womens')}>Shop women</button>
              <button className="btn btn-secondary" onClick={() => navigate('/mens')}>Shop men</button>
            </div>
          ) : (
            cart.map(item => (
              <div key={`${item.id}-${item.variant_id}`} className="cart-item">
                <ProductVisual product={item} className="cart-visual" />
                <div className="ci-info">
                  <div className="ci-cat">{item.cat}</div>
                  <div className="ci-name">{item.name}</div>
                  <div className="ci-meta">{item.gender === 'men' ? "Men's silk" : 'Pure Kanjivaram silk'} - Free shipping eligible</div>
                  <div className="ci-qty">
                    <button className="ci-qty-btn" onClick={() => void updateQty(item.cart_item_id || item.id, -1)} aria-label="Decrease quantity">
                      <Minus size={15} />
                    </button>
                    <span className="ci-qty-num">{item.qty}</span>
                    <button className="ci-qty-btn" onClick={() => void updateQty(item.cart_item_id || item.id, 1)} aria-label="Increase quantity">
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
                <div className="ci-right">
                  <div className="ci-price">{fmt(item.price * item.qty)}</div>
                  <button className="ci-remove" onClick={() => void removeFromCart(item.cart_item_id || item.id)}>
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="order-summary">
          <div className="os-title">Order summary</div>
          <div className="os-row"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
          {totals.discount > 0 && <div className="os-row"><span>Discount {couponCode ? `(${couponCode})` : ''}</span><span className="free">- {fmt(totals.discount)}</span></div>}
          <div className="os-row"><span>Shipping</span><span className={totals.shipping === 0 ? 'free' : ''}>{totals.shipping === 0 ? 'Free' : fmt(totals.shipping)}</span></div>
          <div className="os-row"><span>CGST (2.5%)</span><span>{fmt(totals.cgst)}</span></div>
          <div className="os-row"><span>SGST (2.5%)</span><span>{fmt(totals.sgst)}</span></div>
          <div className="os-row total"><span>Total</span><span>{fmt(totals.total)}</span></div>
          <div className="os-promo">
            <input className="os-promo-input" placeholder="Promo code" value={promo} onChange={event => setPromo(event.target.value.toUpperCase())} />
            <button className="os-promo-btn" onClick={() => void handleApplyPromo()} disabled={applying}>{applying ? '...' : 'Apply'}</button>
          </div>
          <button className="os-checkout-btn" onClick={() => navigate('/checkout')} disabled={cart.length === 0}>
            Proceed to checkout
          </button>
          <div className="os-guarantees">
            <div className="og">Free pan-India shipping</div>
            <div className="og">15-day easy returns</div>
            <div className="og">GST invoice included</div>
            <div className="og">Secure Razorpay payment</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
