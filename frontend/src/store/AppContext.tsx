import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CartItem, Product, CartTotals, Toast } from '@/types';

interface AppState {
  cart: CartItem[];
  wishlist: Product[];
  toast: Toast | null;
  cartCount: number;
}

interface AppContextType extends AppState {
  addToCart: (product: Product) => void;
  removeFromCart: (id: number) => void;
  updateQty: (id: number, delta: number) => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (id: number) => boolean;
  showToast: (icon: string, title: string, msg: string) => void;
  clearCart: () => void;
  getCartTotals: () => CartTotals;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) {
        return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    showToast('🛒', 'Added to Cart!', `${product.name} — ₹${product.price.toLocaleString('en-IN')}`);
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateQty = useCallback((id: number, delta: number) => {
    setCart(prev => prev.map(c =>
      c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c
    ));
  }, []);

  const toggleWishlist = useCallback((product: Product) => {
    setWishlist(prev => {
      const idx = prev.findIndex(w => w.id === product.id);
      if (idx >= 0) {
        showToast('♡', 'Removed from Wishlist', product.name);
        return prev.filter((_, i) => i !== idx);
      }
      showToast('♥', 'Added to Wishlist!', product.name);
      return [...prev, product];
    });
  }, []);

  const isInWishlist = useCallback((id: number) => {
    return wishlist.some(w => w.id === id);
  }, [wishlist]);

  const showToast = useCallback((icon: string, title: string, msg: string) => {
    setToast({ icon, title, msg, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getCartTotals = useCallback((): CartTotals => {
    const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
    const cgst = Math.round(subtotal * 0.025);
    const sgst = Math.round(subtotal * 0.025);
    return { subtotal, cgst, sgst, total: subtotal + cgst + sgst };
  }, [cart]);

  const cartCount = cart.reduce((a, c) => a + c.qty, 0);

  return (
    <AppContext.Provider value={{
      cart, wishlist, toast, cartCount,
      addToCart, removeFromCart, updateQty,
      toggleWishlist, isInWishlist, showToast, clearCart, getCartTotals,
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
