/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { CartItem, CartResponse, CartTotals, Product, Toast, User } from '@/types';

interface AppState {
  cart: CartItem[];
  wishlist: Product[];
  toast: Toast | null;
  cartCount: number;
  user: User | null;
  isAuthed: boolean;
}

interface AppContextType extends AppState {
  addToCart: (product: Product) => Promise<void>;
  removeFromCart: (id: number) => Promise<void>;
  updateQty: (id: number, delta: number) => Promise<void>;
  toggleWishlist: (product: Product) => Promise<void>;
  isInWishlist: (id: number) => boolean;
  showToast: (icon: string, title: string, msg: string) => void;
  clearCart: () => Promise<void>;
  getCartTotals: () => CartTotals;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

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
  }));
}

function variantId(product: Product) {
  return product.variant_id || product.default_variant_id || product.variants?.[0]?.id;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const showToast = useCallback((icon: string, title: string, msg: string) => {
    setToast({ icon, title, msg, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!api.tokens.getAccessToken()) return;
    try {
      const me = await api.auth.me();
      setUser(me);
      if (window.location.pathname === '/admin' && me.role !== 'admin' && me.role !== 'super_admin') {
        api.tokens.clearTokens();
        setUser(null);
        setCart([]);
        setWishlist([]);
        return;
      }
      if (me.role === 'admin' || me.role === 'super_admin') {
        setCart([]);
        setWishlist([]);
        return;
      }
      const cartData = await api.cart.get();
      setCart(cartFromResponse(cartData));
      const wishData = await api.wishlist.list().catch(() => [] as { product: Product }[]);
      setWishlist(wishData.map(item => item.product));
    } catch {
      api.tokens.clearTokens();
      setUser(null);
      setCart([]);
      setWishlist([]);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refreshSession);
  }, [refreshSession]);

  const addToCart = useCallback(async (product: Product) => {
    const vid = variantId(product);
    if (api.tokens.getAccessToken() && vid) {
      try {
        const data = await api.cart.add(vid, 1);
        setCart(cartFromResponse(data));
        showToast('OK', 'Added to Cart', `${product.name} added to your cart`);
        return;
      } catch (err) {
        showToast('!', 'Cart Error', err instanceof Error ? err.message : 'Unable to add item');
      }
    }
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id && c.variant_id === vid);
      if (existing) {
        return prev.map(c => c.id === product.id && c.variant_id === vid ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...product, variant_id: vid, qty: 1 }];
    });
    showToast('OK', 'Added locally', 'Sign in before checkout to sync your cart');
  }, [showToast]);

  const removeFromCart = useCallback(async (id: number) => {
    const item = cart.find(c => c.id === id || c.cart_item_id === id);
    if (api.tokens.getAccessToken() && item?.cart_item_id) {
      const data = await api.cart.remove(item.cart_item_id);
      setCart(cartFromResponse(data));
      return;
    }
    setCart(prev => prev.filter(c => c.id !== id && c.cart_item_id !== id));
  }, [cart]);

  const updateQty = useCallback(async (id: number, delta: number) => {
    const item = cart.find(c => c.id === id || c.cart_item_id === id);
    if (!item) return;
    const nextQty = Math.max(1, item.qty + delta);
    if (api.tokens.getAccessToken() && item.cart_item_id) {
      const data = await api.cart.update(item.cart_item_id, nextQty);
      setCart(cartFromResponse(data));
      return;
    }
    setCart(prev => prev.map(c => (c.id === id || c.cart_item_id === id) ? { ...c, qty: nextQty } : c));
  }, [cart]);

  const toggleWishlist = useCallback(async (product: Product) => {
    if (api.tokens.getAccessToken()) {
      await api.wishlist.toggle(product.id).catch(() => null);
    }
    setWishlist(prev => {
      const idx = prev.findIndex(w => w.id === product.id);
      if (idx >= 0) {
        showToast('OK', 'Removed from Wishlist', product.name);
        return prev.filter((_, i) => i !== idx);
      }
      showToast('OK', 'Added to Wishlist', product.name);
      return [...prev, product];
    });
  }, [showToast]);

  const isInWishlist = useCallback((id: number) => wishlist.some(w => w.id === id), [wishlist]);

  const clearCart = useCallback(async () => {
    if (api.tokens.getAccessToken()) {
      await api.cart.clear().catch(() => null);
    }
    setCart([]);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    setCart([]);
    setWishlist([]);
  }, []);

  const getCartTotals = useCallback((): CartTotals => {
    const subtotal = cart.reduce((a, c) => a + toNumber(c.price) * c.qty, 0);
    const discount = 0;
    const cgst = Math.round((subtotal - discount) * 0.025);
    const sgst = Math.round((subtotal - discount) * 0.025);
    const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 99;
    return { subtotal, discount, cgst, sgst, shipping, total: subtotal - discount + cgst + sgst + shipping };
  }, [cart]);

  const cartCount = cart.reduce((a, c) => a + c.qty, 0);

  return (
    <AppContext.Provider value={{
      cart,
      wishlist,
      toast,
      cartCount,
      user,
      isAuthed: Boolean(user),
      addToCart,
      removeFromCart,
      updateQty,
      toggleWishlist,
      isInWishlist,
      showToast,
      clearCart,
      getCartTotals,
      refreshSession,
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
