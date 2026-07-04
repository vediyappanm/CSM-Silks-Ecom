/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { connectNotificationRealtime } from '@/lib/realtime';
import type { CartItem, CartResponse, CartTotals, Product, Toast, User } from '@/types';

interface AppState {
  cart: CartItem[];
  wishlist: Product[];
  toast: Toast | null;
  cartCount: number;
  user: User | null;
  isAuthed: boolean;
  authReady: boolean;
  couponCode: string;
  unreadNotifications: number;
}

interface AppContextType extends AppState {
  addToCart: (product: Product, quantity?: number) => Promise<boolean>;
  removeFromCart: (id: number) => Promise<void>;
  updateQty: (id: number, delta: number) => Promise<void>;
  toggleWishlist: (product: Product) => Promise<void>;
  isInWishlist: (id: number) => boolean;
  showToast: (icon: string, title: string, msg: string) => void;
  dismissToast: () => void;
  clearCart: () => Promise<void>;
  applyCoupon: (couponCode: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  getCartTotals: () => CartTotals;
  refreshCart: () => Promise<CartResponse | null>;
  refreshSession: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);
const GUEST_CART_KEY = 'csm_guest_cart';

function toNumber(value: number | string | undefined) {
  return Number(value || 0);
}

function cartFromResponse(data: CartResponse): CartItem[] {
  return (data.items || []).map(item => ({
    ...item.product,
    price: toNumber(item.product.price),
    mrp: toNumber(item.product.mrp),
    qty: item.quantity,
    cart_item_id: item.id,
    variant_id: item.variant_id,
    variant_sku: item.variant_sku,
    variant_available_qty: item.variant_available_qty,
    variant_stock_qty: item.variant_stock_qty,
    variant_reserved_qty: item.variant_reserved_qty,
    stock_status: item.stock_status,
    stock_message: item.stock_message,
  }));
}

function totalsFromResponse(data: CartResponse): CartTotals {
  return {
    subtotal: toNumber(data.subtotal),
    discount: toNumber(data.discount),
    cgst: toNumber(data.cgst),
    sgst: toNumber(data.sgst),
    shipping: toNumber(data.shipping),
    total: toNumber(data.total),
  };
}

function variantId(product: Product) {
  return product.variant_id || product.default_variant_id || product.variants?.[0]?.id;
}

function clearGuestCart() {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // Storage can fail in private mode; server cart remains the source of truth.
  }
}

function redirectToLogin(nextPath = window.location.pathname + window.location.search + window.location.hash) {
  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
  window.setTimeout(() => {
    if (window.location.pathname !== '/login') window.location.assign(`/login?next=${encodeURIComponent(safeNext)}`);
  }, 600);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [serverTotals, setServerTotals] = useState<CartTotals | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const showToast = useCallback((icon: string, title: string, msg: string) => {
    const id = Date.now();
    setToast({ icon, title, msg, id });
    window.setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 4000);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!api.tokens.getAccessToken()) {
      setUnreadNotifications(0);
      return;
    }
    try {
      const data = await api.notifications.count();
      setUnreadNotifications(Number(data.unread_count || 0));
    } catch {
      setUnreadNotifications(0);
    }
  }, []);

  const applyCartResponse = useCallback((data: CartResponse) => {
    setCart(cartFromResponse(data));
    setServerTotals(totalsFromResponse(data));
    setCouponCode(data.coupon_code || '');
  }, []);

  const refreshCart = useCallback(async () => {
    if (!api.tokens.getAccessToken()) {
      clearGuestCart();
      setCart([]);
      setServerTotals(null);
      setCouponCode('');
      return null;
    }
    const data = await api.cart.get();
    applyCartResponse(data);
    return data;
  }, [applyCartResponse]);

  const refreshSession = useCallback(async () => {
    if (!api.tokens.hasStoredSession()) {
      setUser(null);
      clearGuestCart();
      setCart([]);
      setUnreadNotifications(0);
      setAuthReady(true);
      return;
    }
    const sessionReady = await api.tokens.ensureFreshAccessToken();
    if (!sessionReady) {
      setUser(null);
      clearGuestCart();
      setCart([]);
      setServerTotals(null);
      setCouponCode('');
      setWishlist([]);
      setUnreadNotifications(0);
      setAuthReady(true);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me);
      if (window.location.pathname === '/admin' && me.role !== 'admin' && me.role !== 'super_admin') {
        api.tokens.clearTokens();
        setUser(null);
        setCart([]);
        setServerTotals(null);
        setCouponCode('');
        setWishlist([]);
        setUnreadNotifications(0);
        return;
      }
      if (me.role === 'admin' || me.role === 'super_admin') {
        setCart([]);
        setServerTotals(null);
        setCouponCode('');
        setWishlist([]);
        setUnreadNotifications(0);
        return;
      }
      clearGuestCart();
      await refreshCart();
      const wishData = await api.wishlist.list().catch(() => [] as { product: Product }[]);
      setWishlist(wishData.map(item => item.product));
      await refreshNotifications();
    } catch {
      api.tokens.clearTokens();
      setUser(null);
      setCart([]);
      setServerTotals(null);
      setCouponCode('');
      setWishlist([]);
      setUnreadNotifications(0);
    } finally {
      setAuthReady(true);
    }
  }, [refreshCart, refreshNotifications]);

  useEffect(() => {
    void Promise.resolve().then(refreshSession);
  }, [refreshSession]);

  useEffect(() => {
    if (!user || user.role === 'admin' || user.role === 'super_admin') return undefined;
    return connectNotificationRealtime({
      onMessage: message => {
        if (typeof message.unread_count === 'number') {
          setUnreadNotifications(message.unread_count);
        }
        if (message.type === 'notification.created' && message.notification) {
          showToast('LIVE', message.notification.title, message.notification.body);
        }
      },
      onStatus: status => {
        if (status === 'connected') void refreshNotifications();
      },
    });
  }, [refreshNotifications, showToast, user]);

  const addToCart = useCallback(async (product: Product, quantity = 1): Promise<boolean> => {
    const vid = variantId(product);
    if (!api.tokens.getAccessToken()) {
      showToast('!', 'Login required', 'Sign in to add live inventory to your cart');
      redirectToLogin(window.location.pathname + window.location.search + window.location.hash);
      return false;
    }
    if (!vid) {
      showToast('!', 'SKU unavailable', 'This product does not have a sellable live variant');
      return false;
    }
    const safeQty = Math.max(1, Math.min(quantity, 10));
    try {
      const data = await api.cart.add(vid, safeQty);
      applyCartResponse(data);
      showToast('OK', 'Added to Cart', `${product.name} x${safeQty} added to your cart`);
      return true;
    } catch (err) {
      showToast('!', 'Cart Error', err instanceof Error ? err.message : 'Unable to add item');
      return false;
    }
  }, [applyCartResponse, showToast]);

  const removeFromCart = useCallback(async (id: number) => {
    const item = cart.find(c => c.id === id || c.cart_item_id === id);
    if (api.tokens.getAccessToken() && item?.cart_item_id) {
      try {
        const data = await api.cart.remove(item.cart_item_id);
        applyCartResponse(data);
      } catch (err) {
        showToast('!', 'Cart Error', err instanceof Error ? err.message : 'Unable to remove item');
      }
      return;
    }
    setCart([]);
    setServerTotals(null);
  }, [applyCartResponse, cart, showToast]);

  const updateQty = useCallback(async (id: number, delta: number) => {
    const item = cart.find(c => c.id === id || c.cart_item_id === id);
    if (!item) return;
    const nextQty = Math.max(1, item.qty + delta);
    if (api.tokens.getAccessToken() && item.cart_item_id) {
      try {
        const data = await api.cart.update(item.cart_item_id, nextQty);
        applyCartResponse(data);
      } catch (err) {
        showToast('!', 'Cart Error', err instanceof Error ? err.message : 'Unable to update quantity');
      }
      return;
    }
    showToast('!', 'Login required', 'Sign in to update your server cart');
    redirectToLogin('/cart');
  }, [applyCartResponse, cart, showToast]);

  const toggleWishlist = useCallback(async (product: Product) => {
    if (!api.tokens.getAccessToken()) {
      showToast('!', 'Sign in to save', 'Login from Account to save this to your wishlist');
      window.setTimeout(() => {
        if (window.location.pathname !== '/login') window.location.assign('/login?next=/wishlist');
      }, 600);
      return;
    }
    try {
      const data = await api.wishlist.toggle(product.id);
      if (data.in_wishlist) {
        setWishlist(prev => (prev.some(w => w.id === product.id) ? prev : [...prev, product]));
        showToast('OK', 'Added to Wishlist', product.name);
      } else {
        setWishlist(prev => prev.filter(w => w.id !== product.id));
        showToast('OK', 'Removed from Wishlist', product.name);
      }
    } catch (err) {
      showToast('!', 'Wishlist Error', err instanceof Error ? err.message : 'Unable to update wishlist');
    }
  }, [showToast]);

  const isInWishlist = useCallback((id: number) => wishlist.some(w => w.id === id), [wishlist]);

  const clearCart = useCallback(async () => {
    if (api.tokens.getAccessToken()) {
      await api.cart.clear().catch(() => null);
    }
    setCart([]);
    setServerTotals(null);
    setCouponCode('');
    clearGuestCart();
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    const nextCode = code.trim().toUpperCase();
    if (!nextCode) {
      showToast('!', 'Coupon required', 'Enter a coupon code first');
      return;
    }
    if (!api.tokens.getAccessToken()) {
      showToast('!', 'Login required', 'Sign in so the backend can validate this coupon');
      redirectToLogin('/cart');
      return;
    }
    try {
      const data = await api.cart.coupon(nextCode);
      applyCartResponse(data);
      showToast('OK', 'Coupon Applied', `${nextCode} updated your cart totals`);
    } catch (err) {
      showToast('!', 'Coupon failed', err instanceof Error ? err.message : 'Unable to apply coupon');
    }
  }, [applyCartResponse, showToast]);

  const removeCoupon = useCallback(async () => {
    if (!couponCode && !serverTotals?.discount) return;
    try {
      if (api.tokens.getAccessToken()) {
        const data = await api.cart.coupon('');
        applyCartResponse(data);
      } else {
        setServerTotals(null);
        setCouponCode('');
        redirectToLogin('/cart');
        return;
      }
      showToast('OK', 'Coupon removed', 'Your cart total has been refreshed');
    } catch (err) {
      showToast('!', 'Coupon failed', err instanceof Error ? err.message : 'Unable to remove coupon');
    }
  }, [applyCartResponse, couponCode, serverTotals, showToast]);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    setAuthReady(true);
    setCart([]);
    setServerTotals(null);
    setCouponCode('');
    setWishlist([]);
    setUnreadNotifications(0);
    clearGuestCart();
  }, []);

  const getCartTotals = useCallback((): CartTotals => {
    if (serverTotals) return serverTotals;
    const subtotal = cart.reduce((a, c) => a + toNumber(c.price) * c.qty, 0);
    const discount = 0;
    const cgst = Math.round((subtotal - discount) * 0.025);
    const sgst = Math.round((subtotal - discount) * 0.025);
    const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 99;
    return { subtotal, discount, cgst, sgst, shipping, total: subtotal - discount + cgst + sgst + shipping };
  }, [cart, serverTotals]);

  const cartCount = cart.reduce((a, c) => a + c.qty, 0);

  return (
    <AppContext.Provider value={{
      cart,
      wishlist,
      toast,
      cartCount,
      user,
      isAuthed: Boolean(user),
      authReady,
      couponCode,
      unreadNotifications,
      addToCart,
      removeFromCart,
      updateQty,
      toggleWishlist,
      isInWishlist,
      showToast,
      dismissToast,
      clearCart,
      applyCoupon,
      removeCoupon,
      getCartTotals,
      refreshCart,
      refreshSession,
      refreshNotifications,
      logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
