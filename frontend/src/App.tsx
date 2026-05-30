import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Ticker } from '@/components/Ticker';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FloatingButtons, ToastStack } from '@/components/FloatingButtons';
import { AppProvider } from '@/store/AppContext';
import { Account } from '@/pages/Account';
import { Admin } from '@/pages/Admin';
import { Cart } from '@/pages/Cart';
import { Checkout } from '@/pages/Checkout';
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

function AppLayout() {
  const location = useLocation();

  if (location.pathname === '/admin') {
    return <Admin />;
  }

  return (
    <>
      <Ticker />
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 104px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/womens" element={<Womens />} />
          <Route path="/mens" element={<Mens />} />
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
      <Footer />
      <FloatingButtons />
      <ToastStack />
    </>
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
    <BrowserRouter>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
