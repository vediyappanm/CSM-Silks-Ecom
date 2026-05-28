import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import type { PaymentMethod } from '@/types';

export function Checkout() {
  const navigate = useNavigate();
  const { cart, getCartTotals, showToast, clearCart } = useApp();
  const t = getCartTotals();
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [step, setStep] = useState<'address' | 'payment'>('address');

  const handlePlaceOrder = () => {
    const fname = (document.getElementById('ch-fname') as HTMLInputElement)?.value;
    if (!fname) {
      showToast('⚠️', 'Missing Details', 'Please fill in your delivery address');
      return;
    }
    if (cart.length === 0) {
      showToast('⚠️', 'Empty Cart', 'Add items to cart first');
      return;
    }
    showToast('✅', 'Order Placed!', `Order #CSM-${2848 + Math.floor(Math.random() * 100)} confirmed! ₹${t.total.toLocaleString('en-IN')} via ${paymentMethod.toUpperCase()}`);
    clearCart();
    setTimeout(() => navigate('/orders'), 1500);
  };

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)' }}>Your cart is empty</h2>
          <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => navigate('/womens')}>Shop Now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-layout">
        <div>
          <h1 className="checkout-title">Secure Checkout</h1>
          <p className="checkout-sub">🔒 100% secure · Powered by Razorpay</p>
          <div className="checkout-steps">
            <div className={`cs-step ${step === 'address' ? 'on' : 'done'}`}>
              <span className="cs-num">1</span><span className="cs-lbl">Address</span>
            </div>
            <div className={`cs-step ${step === 'payment' ? 'on' : ''}`}>
              <span className="cs-num">2</span><span className="cs-lbl">Payment</span>
            </div>
            <div className={`cs-step ${step === 'payment' ? 'done' : ''}`}>
              <span className="cs-num">3</span><span className="cs-lbl">Review</span>
            </div>
          </div>

          {/* Address */}
          <div className="checkout-card">
            <div className="checkout-card-title"><div className="cct-step">1</div>Delivery Address</div>
            <div className="form-row">
              <div className="form-field"><label>First Name *</label><input placeholder="Priya" id="ch-fname" /></div>
              <div className="form-field"><label>Last Name *</label><input placeholder="Venkat" id="ch-lname" /></div>
            </div>
            <div className="form-field"><label>Phone / WhatsApp *</label><input placeholder="+91 98765 43210" id="ch-phone" /></div>
            <div className="form-field"><label>Address Line 1 *</label><input placeholder="House No, Street Name" id="ch-addr1" /></div>
            <div className="form-field"><label>Address Line 2</label><input placeholder="Area, Landmark" id="ch-addr2" /></div>
            <div className="form-row">
              <div className="form-field"><label>City *</label><input placeholder="Chennai" id="ch-city" /></div>
              <div className="form-field"><label>State *</label><input placeholder="Tamil Nadu" id="ch-state" /></div>
            </div>
            <div className="form-row">
              <div className="form-field"><label>PIN Code *</label><input placeholder="600001" id="ch-pin" /></div>
              <div className="form-field"><label>Email</label><input placeholder="priya@email.com" id="ch-email" type="email" /></div>
            </div>
          </div>

          {/* Payment */}
          <div className="checkout-card">
            <div className="checkout-card-title"><div className="cct-step">2</div>Payment Method</div>
            <div className="payment-opts">
              {[
                { key: 'upi' as const, icon: '📱', label: 'UPI' },
                { key: 'card' as const, icon: '💳', label: 'Card' },
                { key: 'netbank' as const, icon: '🏦', label: 'Net Banking' },
                { key: 'cod' as const, icon: '💵', label: 'Cash on Delivery' },
              ].map(pm => (
                <div
                  key={pm.key}
                  className={`po ${paymentMethod === pm.key ? 'on' : ''}`}
                  onClick={() => setPaymentMethod(pm.key)}
                >
                  <div className="po-ic">{pm.icon}</div>
                  <div className="po-lbl">{pm.label}</div>
                </div>
              ))}
            </div>
            <div id="paymentDetail">
              {paymentMethod === 'upi' && (
                <div className="form-field"><label>UPI ID *</label><input placeholder="priya@gpay" id="ch-upi" /></div>
              )}
              {paymentMethod === 'card' && (
                <>
                  <div className="form-row">
                    <div className="form-field"><label>Card Number *</label><input placeholder="4242 4242 4242 4242" id="ch-card" /></div>
                    <div className="form-field"><label>Expiry *</label><input placeholder="MM/YY" id="ch-expiry" /></div>
                  </div>
                  <div className="form-field"><label>CVV *</label><input placeholder="123" id="ch-cvv" type="password" /></div>
                </>
              )}
              {paymentMethod === 'netbank' && (
                <div className="form-field">
                  <label>Select Bank</label>
                  <select id="ch-bank">
                    <option>State Bank of India</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                    <option>Kotak Mahindra</option>
                  </select>
                </div>
              )}
              {paymentMethod === 'cod' && (
                <div style={{
                  padding: 14, background: 'rgba(26,122,74,.08)', border: '1px solid rgba(26,122,74,.2)',
                  borderRadius: 9, fontSize: 12, color: 'rgba(13,11,8,.6)'
                }}>
                  Cash on delivery available. Our courier will collect payment at delivery.
                  Loyalty points credited after delivery confirmation.
                </div>
              )}
            </div>
          </div>

          <button className="place-btn" onClick={handlePlaceOrder}>
            🪡 Place Order — {fmt(t.total)}
          </button>
        </div>

        {/* Order Review */}
        <div>
          <div className="order-summary">
            <div className="os-title">Order Review</div>
            {cart.map(p => (
              <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 9, overflow: 'hidden', flexShrink: 0,
                  background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                }}>
                  {p.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Qty: {p.qty}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)' }}>{fmt(p.price * p.qty)}</div>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '14px 0' }} />
            <div className="os-row"><span>Subtotal</span><span className="os-val">{fmt(t.subtotal)}</span></div>
            <div className="os-row"><span>Shipping</span><span className="os-val" style={{ color: 'var(--grn)' }}>Free ✓</span></div>
            <div className="os-row"><span>GST (5%)</span><span className="os-val">{fmt(t.cgst + t.sgst)}</span></div>
            <div className="os-row total"><span>Total</span><span className="os-val">{fmt(t.total)}</span></div>
            <div className="os-guarantees" style={{ marginTop: 14 }}>
              <div className="og">🔒 Secured by Razorpay</div>
              <div className="og">✓ GI Tagged authentic silk</div>
              <div className="og">✓ GST Invoice emailed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
