import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useApp } from '@/store/AppContext';
import { ProductVisual } from '@/ui/components';
import type { PaymentMethod } from '@/types';

export function Checkout() {
  const navigate = useNavigate();
  const { cart, getCartTotals, showToast, clearCart, isAuthed } = useApp();
  const t = getCartTotals();
  const fmt = (n: number) => 'Rs ' + n.toLocaleString('en-IN');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');

  const handlePlaceOrder = async () => {
    const fname = (document.getElementById('ch-fname') as HTMLInputElement)?.value;
    if (!fname) {
      showToast('!', 'Missing Details', 'Please fill in your delivery address');
      return;
    }
    if (!isAuthed) {
      showToast('!', 'Sign in required', 'Please login with OTP from the account page before checkout');
      navigate('/account');
      return;
    }
    if (cart.length === 0) {
      showToast('!', 'Empty Cart', 'Add items to cart first');
      return;
    }
    try {
      const lname = (document.getElementById('ch-lname') as HTMLInputElement)?.value || '';
      const address = await api.addresses.create({
        full_name: `${fname} ${lname}`.trim(),
        phone: (document.getElementById('ch-phone') as HTMLInputElement)?.value || '',
        address_line_1: (document.getElementById('ch-addr1') as HTMLInputElement)?.value || '',
        address_line_2: (document.getElementById('ch-addr2') as HTMLInputElement)?.value || '',
        city: (document.getElementById('ch-city') as HTMLInputElement)?.value || '',
        state: (document.getElementById('ch-state') as HTMLInputElement)?.value || '',
        pin_code: (document.getElementById('ch-pin') as HTMLInputElement)?.value || '',
        country: 'India',
        is_default: true,
        label: 'Home',
      });
      const order = await api.orders.create({
        address_id: address.id!,
        payment_method: paymentMethod === 'cod' ? 'cod' : 'razorpay',
      });
      if (paymentMethod !== 'cod') {
        const rz = await api.payments.createRazorpayOrder(order.id);
        await api.payments.verify({
          razorpay_order_id: rz.razorpay_order_id,
          razorpay_payment_id: `pay_dev_${Date.now()}`,
          razorpay_signature: 'dev',
        });
      }
      showToast('OK', 'Order Placed', `${order.order_number} confirmed for ${fmt(Number(order.total_amount))}`);
      await clearCart();
      setTimeout(() => navigate('/orders'), 1000);
    } catch (err) {
      showToast('!', 'Checkout failed', err instanceof Error ? err.message : 'Unable to place order');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>CSM</div>
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
          <p className="checkout-sub">Confirm delivery, choose Razorpay or COD, and place a real CSM Silks order.</p>

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

          <div className="checkout-card">
            <div className="checkout-card-title"><div className="cct-step">2</div>Payment Method</div>
            <div className="payment-opts">
              {[
                { key: 'upi' as const, icon: 'UPI', label: 'UPI' },
                { key: 'card' as const, icon: 'Card', label: 'Card' },
                { key: 'netbank' as const, icon: 'Bank', label: 'Net Banking' },
                { key: 'cod' as const, icon: 'COD', label: 'Cash on Delivery' },
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
            {paymentMethod === 'cod' && (
              <div style={{ padding: 14, background: 'rgba(26,122,74,.08)', border: '1px solid rgba(26,122,74,.2)', borderRadius: 9, fontSize: 12, color: 'rgba(13,11,8,.6)' }}>
                COD orders are confirmed immediately. Loyalty points are credited after checkout in this v1 flow.
              </div>
            )}
          </div>

          <button className="place-btn" onClick={() => void handlePlaceOrder()}>
            Place Order - {fmt(t.total)}
          </button>
        </div>

        <div>
          <div className="order-summary">
            <div className="os-title">Order Review</div>
            {cart.map(p => (
              <div key={`${p.id}-${p.variant_id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <ProductVisual product={p} className="summary-visual" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Qty: {p.qty}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)' }}>{fmt(p.price * p.qty)}</div>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '14px 0' }} />
            <div className="os-row"><span>Subtotal</span><span className="os-val">{fmt(t.subtotal)}</span></div>
            <div className="os-row"><span>Shipping</span><span className="os-val" style={{ color: t.shipping === 0 ? 'var(--grn)' : 'inherit' }}>{t.shipping === 0 ? 'Free' : fmt(t.shipping)}</span></div>
            <div className="os-row"><span>GST (5%)</span><span className="os-val">{fmt(t.cgst + t.sgst)}</span></div>
            <div className="os-row total"><span>Total</span><span className="os-val">{fmt(t.total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
