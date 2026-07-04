import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Ticker } from '@/components/Ticker';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FloatingButtons, ToastStack } from '@/components/FloatingButtons';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider, useApp } from '@/store/AppContext';
import { ThemeProvider } from '@/store/ThemeContext';
import { CUSTOMER_AUTH_PATHS, GOOGLE_CALLBACK_PATH, customerNextPath, isProtectedCustomerPath, safeCustomerRedirect } from '@/lib/routes';
import { Account } from '@/pages/Account';
import { Admin } from '@/pages/Admin';
import { Cart } from '@/pages/Cart';
import { Checkout } from '@/pages/Checkout';
import { CustomerAuth } from '@/pages/CustomerAuth';
import { GoogleCallback } from '@/pages/GoogleCallback';
import { Home } from '@/pages/Home';
import { Mens } from '@/pages/Mens';
import { Notifications } from '@/pages/Notifications';
import { Orders } from '@/pages/Orders';
import { ProductDetail } from '@/pages/ProductDetail';
import { Search } from '@/pages/Search';
import { Tracking } from '@/pages/Tracking';
import { TryOn } from '@/pages/TryOn';
import { WishlistPage } from '@/pages/WishlistPage';
import { Womens } from '@/pages/Womens';

const PAGE_META: Array<{ match: (path: string) => boolean; title: string; description: string }> = [
  { match: path => path === '/', title: 'CSM Silks - Kanjivaram Sarees and Textile Ecommerce', description: 'Shop CSM Silks sarees, dhotis, silk shirts, wedding textiles, delivery tracking, returns, and loyalty rewards.' },
  { match: path => path === '/womens', title: 'Pure Silk Sarees - CSM Silks', description: 'Browse live-stock Kanjivaram, bridal, festive, Patola, Mysore, and Banarasi sarees from CSM Silks.' },
  { match: path => path === '/mens', title: "Men's Silk Wear - CSM Silks", description: 'Shop silk dhotis, veshtis, shirts, and wedding sets from CSM Silks.' },
  { match: path => path.startsWith('/product'), title: 'Product Details - CSM Silks', description: 'View textile details, SKU variants, delivery availability, reviews, and pricing for a CSM Silks product.' },
  { match: path => path === '/cart', title: 'Cart - CSM Silks', description: 'Review your CSM Silks cart, apply coupons, and proceed to secure checkout.' },
  { match: path => path === '/checkout', title: 'Checkout - CSM Silks', description: 'Place a secure CSM Silks order with address validation, Razorpay online payment, or cash on delivery.' },
  { match: path => path === '/orders', title: 'My Orders - CSM Silks', description: 'Track CSM Silks orders, download invoices, request returns, and review delivered products.' },
  { match: path => path.startsWith('/tracking'), title: 'Order Tracking - CSM Silks', description: 'Track a CSM Silks shipment with order number, AWB, and delivery timeline updates.' },
  { match: path => path === '/account', title: 'Account - CSM Silks', description: 'Sign in with OTP, manage profile, loyalty points, rewards, orders, and wishlist.' },
  { match: path => path === '/login', title: 'Customer Login - CSM Silks', description: 'Login to CSM Silks with secure phone OTP to shop, track orders, and manage rewards.' },
  { match: path => path === '/signup', title: 'Create Customer Account - CSM Silks', description: 'Create a CSM Silks customer account with OTP, profile details, order alerts, and loyalty rewards.' },
  { match: path => path === '/search', title: 'Search - CSM Silks', description: 'Search CSM Silks textile products by category, fabric, occasion, price, and availability.' },
  { match: path => path === '/wishlist', title: 'Wishlist - CSM Silks', description: 'View and manage saved CSM Silks products.' },
  { match: path => path === '/notifications', title: 'Notifications - CSM Silks', description: 'Read CSM Silks order updates, delivery alerts, reward messages, and support notifications.' },
  { match: path => path === '/tryon', title: 'AI Virtual Try-On - CSM Silks', description: 'Generate saree draping and styling recommendations from the CSM Silks AI try-on studio.' },
  { match: path => path === '/admin', title: 'Admin Console - CSM Silks', description: 'Manage CSM Silks catalog, inventory, orders, shipments, returns, and reports.' },
];

function PageMeta() {
  const location = useLocation();
  const meta = PAGE_META.find(item => item.match(location.pathname)) || {
    title: 'CSM Silks',
    description: 'CSM Silks ecommerce platform.',
  };

  useEffect(() => {
    document.title = meta.title;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.content = meta.description;
  }, [meta.description, meta.title]);
  return null;
}

function AppLayout() {
  const location = useLocation();
  const { authReady, isAuthed, user } = useApp();
  const isAdminRoute = location.pathname === '/admin';
  const isAuthRoute = CUSTOMER_AUTH_PATHS.has(location.pathname) || location.pathname === GOOGLE_CALLBACK_PATH;
  const isStaffSession = user?.role === 'admin' || user?.role === 'super_admin';
  const isProtectedRoute = isProtectedCustomerPath(location.pathname);

  if (isAdminRoute) {
    return (
      <>
        <PageMeta />
        <ErrorBoundary>
          <Admin />
        </ErrorBoundary>
      </>
    );
  }

  if (authReady && isStaffSession) {
    return <Navigate to="/admin" replace />;
  }

  if (isAuthRoute) {
    if (authReady && isAuthed) {
      const query = new URLSearchParams(location.search);
      return <Navigate to={safeCustomerRedirect(query.get('next'))} replace />;
    }
    return (
      <>
        <PageMeta />
        <ErrorBoundary>
          <main className="auth-only-main">
            <Routes>
              <Route path="/login" element={<CustomerAuth initialMode="login" />} />
              <Route path="/signup" element={<CustomerAuth initialMode="signup" />} />
              <Route path={GOOGLE_CALLBACK_PATH} element={<GoogleCallback />} />
            </Routes>
          </main>
        </ErrorBoundary>
        <ToastStack />
      </>
    );
  }

  if (isProtectedRoute && !authReady) {
    return (
      <>
        <PageMeta />
        <AuthRouteLoading />
      </>
    );
  }

  if (isProtectedRoute && authReady && !isAuthed) {
    const next = encodeURIComponent(customerNextPath(location.pathname, location.search, location.hash));
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return (
    <>
      <PageMeta />
      <Ticker />
      <Navbar />
      <ErrorBoundary>
        <main className="storefront-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/womens" element={<Womens />} />
            <Route path="/mens" element={<Mens />} />
            <Route path="/collections" element={<Navigate to="/womens" replace />} />
            <Route path="/product/:gender/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/tracking/:orderId" element={<Tracking />} />
            <Route path="/account" element={<Account />} />
            <Route path="/search" element={<Search />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/tryon" element={<TryOn />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </ErrorBoundary>
      <Footer />
      <FloatingButtons />
      <MobileBottomNav />
      <ToastStack />
    </>
  );
}

function AuthRouteLoading() {
  return (
    <main className="auth-only-main">
      <div className="auth-route-loading" aria-live="polite">
        <div className="auth-route-mark">CSM</div>
        <span>Checking secure customer session...</span>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16, background: 'var(--page)', color: 'var(--ink)' }}>
      <div style={{ fontSize: 64, fontFamily: 'var(--font-display)' }}>CSM</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400 }}>Page Not Found</h1>
      <p style={{ color: 'var(--muted)' }}>The page you're looking for doesn't exist.</p>
      <a href="/" className="btn btn-primary">Back to Home</a>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppProvider>
          <AppLayout />
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
