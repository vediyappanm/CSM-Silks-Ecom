import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useCatalogLiveRefresh } from '@/lib/useCatalogLiveRefresh';
import { useApp } from '@/store/AppContext';
import { ProductVisual } from '@/ui/components';
import type { Address } from '@/types';

type CheckoutPaymentMethod = 'razorpay' | 'cod';

type CheckoutForm = {
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  pin_code: string;
  email: string;
};

const initialCheckoutForm: CheckoutForm = {
  first_name: '',
  last_name: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  pin_code: '',
  email: '',
};

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

type PinLookupResponse = Array<{
  Status?: string;
  PostOffice?: Array<{ District?: string; State?: string }>;
}>;

type RazorpayCheckoutOptions = {
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

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
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

export function Checkout() {
  const navigate = useNavigate();
  const { cart, getCartTotals, showToast, clearCart, isAuthed, couponCode, refreshCart } = useApp();
  const t = getCartTotals();
  const fmt = (n: number) => 'Rs ' + n.toLocaleString('en-IN');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('razorpay');
  const [form, setForm] = useState<CheckoutForm>(initialCheckoutForm);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'new'>('new');
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});
  const [placing, setPlacing] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [stockNotice, setStockNotice] = useState('');

  const loyaltyToUse = useLoyalty ? Math.min(loyaltyBalance, Math.floor(Math.max(0, t.subtotal - t.discount))) : 0;
  const estimatedPayable = Math.max(0, t.total - loyaltyToUse);
  const stockIssues = cart.filter(item => item.stock_status && item.stock_status !== 'ok');
  const hasStockIssues = stockIssues.length > 0;
  const cartVariantIds = useMemo(() => new Set(cart.map(item => item.variant_id).filter(Boolean) as number[]), [cart]);
  const cartProductIds = useMemo(() => new Set(cart.map(item => item.id).filter(Boolean) as number[]), [cart]);

  const handleLiveStockUpdate = useCallback((message: Parameters<typeof useCatalogLiveRefresh>[0] extends { onUpdate: (msg: infer T) => void } ? T : never) => {
    const affectedVariant = message.variant_id || message.variant?.id;
    const affectedProduct = message.product_id || message.product?.id;
    if ((affectedVariant && cartVariantIds.has(affectedVariant)) || (affectedProduct && cartProductIds.has(affectedProduct))) {
      void refreshCart().then((data) => {
        const issueCount = data?.stock_issues?.length || 0;
        const text = issueCount ? `${issueCount} checkout item needs stock attention.` : 'Checkout stock refreshed from live inventory.';
        setStockNotice(text);
        showToast('LIVE', 'Checkout stock refreshed', text);
      });
    }
  }, [cartProductIds, cartVariantIds, refreshCart, showToast]);

  const realtimeStatus = useCatalogLiveRefresh({
    enabled: isAuthed && cart.length > 0,
    onUpdate: handleLiveStockUpdate,
  });

  useEffect(() => {
    if (!isAuthed) return;
    api.addresses.list()
      .then(items => {
        setAddresses(items);
        const preferred = items.find(item => item.is_default) || items[0];
        if (preferred?.id) {
          setSelectedAddressId(preferred.id);
          setForm({
            first_name: preferred.full_name?.split(' ')[0] || preferred.first_name || '',
            last_name: preferred.full_name?.split(' ').slice(1).join(' ') || preferred.last_name || '',
            phone: preferred.phone || '',
            address_line_1: preferred.address_line_1 || preferred.address_line1 || '',
            address_line_2: preferred.address_line_2 || preferred.address_line2 || '',
            city: preferred.city || '',
            state: preferred.state || '',
            pin_code: preferred.pin_code || preferred.pincode || '',
            email: preferred.email || '',
          });
        }
      })
      .catch(() => setAddresses([]));
  }, [isAuthed]);

  useEffect(() => {
    const pin = form.pin_code.trim();
    if (!/^\d{6}$/.test(pin)) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal })
        .then(res => res.json() as Promise<PinLookupResponse>)
        .then(data => {
          const match = data?.[0];
          const office = match?.Status === 'Success' ? match.PostOffice?.[0] : null;
          if (!office?.District || !office?.State) return;
          setForm(prev => prev.pin_code === pin ? {
            ...prev,
            city: office.District || prev.city,
            state: office.State || prev.state,
          } : prev);
          setErrors(prev => ({ ...prev, city: '', state: '' }));
        })
        .catch(() => null);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.pin_code]);

  useEffect(() => {
    if (!isAuthed) return;
    api.loyalty.balance()
      .then(balance => setLoyaltyBalance(Number(balance.points || 0)))
      .catch(() => setLoyaltyBalance(0));
  }, [isAuthed]);

  const selectedAddress = useMemo(() => {
    return typeof selectedAddressId === 'number' ? addresses.find(address => address.id === selectedAddressId) : null;
  }, [addresses, selectedAddressId]);

  const updateField = (field: keyof CheckoutForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setSelectedAddressId('new');
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof CheckoutForm, string>> = {};
    if (!form.first_name.trim()) nextErrors.first_name = 'Required';
    if (!form.phone.trim()) nextErrors.phone = 'Required';
    if (!form.address_line_1.trim()) nextErrors.address_line_1 = 'Required';
    if (!form.city.trim()) nextErrors.city = 'Required';
    if (!form.state.trim()) nextErrors.state = 'Required';
    if (!/^\d{6}$/.test(form.pin_code.trim())) nextErrors.pin_code = 'Enter a 6 digit PIN';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!isAuthed) {
      showToast('!', 'Sign in required', 'Please login or create an account before checkout');
      navigate('/login?next=/checkout');
      return;
    }
    if (cart.length === 0) {
      showToast('!', 'Empty Cart', 'Add items to cart first');
      return;
    }
    const refreshedCart = await refreshCart();
    if (refreshedCart?.has_stock_issues) {
      showToast('!', 'Stock changed', refreshedCart.stock_issues?.[0]?.message || 'Please review cart stock before checkout');
      return;
    }
    if (!validateForm()) {
      showToast('!', 'Missing Details', 'Please fix the highlighted delivery fields');
      return;
    }
    setPlacing(true);
    try {
      const address = selectedAddress?.id ? selectedAddress : await api.addresses.create({
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        phone: form.phone.trim(),
        address_line_1: form.address_line_1.trim(),
        address_line_2: form.address_line_2.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pin_code: form.pin_code.trim(),
        email: form.email.trim(),
        country: 'India',
        is_default: addresses.length === 0,
        label: 'Home',
      });
      const order = await api.orders.create({
        address_id: address.id!,
        coupon_code: couponCode,
        loyalty_points_to_use: loyaltyToUse,
        payment_method: paymentMethod === 'cod' ? 'cod' : 'razorpay',
      });
      if (paymentMethod !== 'cod') {
        const rz = await api.payments.createRazorpayOrder(order.id);
        const razorpayKey = rz.key;
        if (!razorpayKey) throw new Error('Razorpay checkout is not configured. Please choose COD or contact CSM Silks support.');
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) throw new Error('Unable to load Razorpay checkout. Please try COD or refresh.');
        const RazorpayCtor = window.Razorpay;
        await new Promise<void>((resolve, reject) => {
          const checkout = new RazorpayCtor({
            key: razorpayKey,
            amount: rz.amount,
            currency: rz.currency,
            name: 'CSM Silks',
            description: order.order_number,
            order_id: rz.razorpay_order_id,
            prefill: {
              name: `${form.first_name} ${form.last_name}`.trim(),
              contact: form.phone,
              email: form.email || undefined,
            },
            handler: async (response) => {
              try {
                await api.payments.verify(response);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => reject(new Error('Payment was not completed')),
            },
            theme: { color: '#b9842e' },
          });
          checkout.open();
        });
      }
      showToast('OK', 'Order Placed', `${order.order_number} confirmed for ${fmt(Number(order.total_amount))}`);
      await clearCart();
      setTimeout(() => navigate('/orders'), 1000);
    } catch (err) {
      showToast('!', 'Checkout failed', err instanceof Error ? err.message : 'Unable to place order');
    } finally {
      setPlacing(false);
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
          <div className="checkout-live-row">
            <span className={`ws-chip ${realtimeStatus}`}>{realtimeStatus === 'connected' ? 'Live stock' : realtimeStatus}</span>
            {stockNotice && <small>{stockNotice}</small>}
          </div>
          {hasStockIssues && (
            <div className="cart-stock-alert checkout-alert">
              {stockIssues[0].stock_message || 'One or more checkout items need stock attention before placing order.'}
            </div>
          )}

          <div className="checkout-card">
            <div className="checkout-card-title"><div className="cct-step">1</div>Delivery Address</div>
            {addresses.length > 0 && (
              <div className="address-pills">
                {addresses.map(address => (
                  <button
                    key={address.id}
                    className={selectedAddressId === address.id ? 'on' : ''}
                    onClick={() => {
                      setSelectedAddressId(address.id!);
                      setForm({
                        first_name: address.full_name?.split(' ')[0] || address.first_name || '',
                        last_name: address.full_name?.split(' ').slice(1).join(' ') || address.last_name || '',
                        phone: address.phone || '',
                        address_line_1: address.address_line_1 || address.address_line1 || '',
                        address_line_2: address.address_line_2 || address.address_line2 || '',
                        city: address.city || '',
                        state: address.state || '',
                        pin_code: address.pin_code || address.pincode || '',
                        email: address.email || '',
                      });
                    }}
                    type="button"
                  >
                    <strong>{address.label || 'Address'}</strong>
                    <span>{address.full_name}, {address.city} {address.pin_code}</span>
                  </button>
                ))}
                <button className={selectedAddressId === 'new' ? 'on' : ''} type="button" onClick={() => { setSelectedAddressId('new'); setForm(initialCheckoutForm); }}>New address</button>
              </div>
            )}
            <div className="form-row">
              <div className="form-field"><label>First Name *</label><input placeholder="Priya" value={form.first_name} onChange={e => updateField('first_name', e.target.value)} />{errors.first_name && <span>{errors.first_name}</span>}</div>
              <div className="form-field"><label>Last Name</label><input placeholder="Venkat" value={form.last_name} onChange={e => updateField('last_name', e.target.value)} /></div>
            </div>
            <div className="form-field"><label>Phone / WhatsApp *</label><input placeholder="+91 98765 43210" value={form.phone} onChange={e => updateField('phone', e.target.value)} />{errors.phone && <span>{errors.phone}</span>}</div>
            <div className="form-field"><label>Address Line 1 *</label><input placeholder="House No, Street Name" value={form.address_line_1} onChange={e => updateField('address_line_1', e.target.value)} />{errors.address_line_1 && <span>{errors.address_line_1}</span>}</div>
            <div className="form-field"><label>Address Line 2</label><input placeholder="Area, Landmark" value={form.address_line_2} onChange={e => updateField('address_line_2', e.target.value)} /></div>
            <div className="form-row">
              <div className="form-field"><label>City *</label><input placeholder="Chennai" value={form.city} onChange={e => updateField('city', e.target.value)} />{errors.city && <span>{errors.city}</span>}</div>
              <div className="form-field">
                <label>State *</label>
                <select value={form.state} onChange={e => updateField('state', e.target.value)}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                </select>
                {errors.state && <span>{errors.state}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-field"><label>PIN Code *</label><input placeholder="600001" value={form.pin_code} onChange={e => updateField('pin_code', e.target.value.replace(/\D/g, '').slice(0, 6))} />{errors.pin_code && <span>{errors.pin_code}</span>}</div>
              <div className="form-field"><label>Email</label><input placeholder="priya@email.com" value={form.email} onChange={e => updateField('email', e.target.value)} type="email" /></div>
            </div>
          </div>

          <div className="checkout-card">
            <div className="checkout-card-title"><div className="cct-step">2</div>Payment Method</div>
            {loyaltyBalance > 0 && (
              <label className={`loyalty-toggle ${useLoyalty ? 'on' : ''}`}>
                <input type="checkbox" checked={useLoyalty} onChange={event => setUseLoyalty(event.target.checked)} />
                <span>
                  <strong>Use loyalty points</strong>
                  <small>{loyaltyBalance.toLocaleString('en-IN')} points available. Redeem Rs {loyaltyToUse.toLocaleString('en-IN')} on this order.</small>
                </span>
              </label>
            )}
            <div className="payment-opts">
              {[
                { key: 'razorpay' as const, icon: 'Pay', label: 'Pay Online', sub: 'UPI, cards, wallets, netbanking' },
                { key: 'cod' as const, icon: 'COD', label: 'Cash on Delivery', sub: 'Pay at your doorstep' },
              ].map(pm => (
                <button
                  type="button"
                  key={pm.key}
                  className={`po ${paymentMethod === pm.key ? 'on' : ''}`}
                  aria-pressed={paymentMethod === pm.key}
                  onClick={() => setPaymentMethod(pm.key)}
                >
                  <div className="po-ic">{pm.icon}</div>
                  <div>
                    <div className="po-lbl">{pm.label}</div>
                    <div className="po-sub">{pm.sub}</div>
                  </div>
                </button>
              ))}
            </div>
            {paymentMethod === 'cod' && (
              <div className="cod-note">
                COD orders are confirmed immediately. Loyalty points are credited after checkout in this v1 flow.
              </div>
            )}
          </div>

          <button className="place-btn" onClick={() => void handlePlaceOrder()} disabled={placing || hasStockIssues}>
            {hasStockIssues ? 'Review cart stock first' : placing ? 'Placing order...' : `Place Order - ${fmt(estimatedPayable)}`}
          </button>
        </div>

        <div>
          <div className="order-summary">
            <div className="os-title">Order Review</div>
            {cart.map(p => (
              <div key={`${p.id}-${p.variant_id}`} className="summary-line">
                <ProductVisual product={p} className="summary-visual" />
                <div className="summary-copy">
                  <div className="summary-name">{p.name}</div>
                  <div className="summary-meta">Qty: {p.qty} / {p.stock_message || 'Live stock verified'}</div>
                </div>
                <div className="summary-price">{fmt(p.price * p.qty)}</div>
              </div>
            ))}
            <div className="summary-divider" />
            <div className="os-row"><span>Subtotal</span><span className="os-val">{fmt(t.subtotal)}</span></div>
            {t.discount > 0 && <div className="os-row"><span>Discount {couponCode ? `(${couponCode})` : ''}</span><span className="os-val free">- {fmt(t.discount)}</span></div>}
            {loyaltyToUse > 0 && <div className="os-row"><span>Loyalty points</span><span className="os-val free">- {fmt(loyaltyToUse)}</span></div>}
            <div className="os-row"><span>Shipping</span><span className="os-val" style={{ color: t.shipping === 0 ? 'var(--grn)' : 'inherit' }}>{t.shipping === 0 ? 'Free' : fmt(t.shipping)}</span></div>
            <div className="os-row"><span>GST (5%)</span><span className="os-val">{fmt(t.cgst + t.sgst)}</span></div>
            <div className="os-row total"><span>Total</span><span className="os-val">{fmt(estimatedPayable)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
