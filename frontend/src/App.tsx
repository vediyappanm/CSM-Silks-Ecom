import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from '@/store/AppContext';
import { Ticker } from '@/components/Ticker';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FloatingButtons, ToastStack } from '@/components/FloatingButtons';
import { Home } from '@/pages/Home';
import { Womens } from '@/pages/Womens';
import { Mens } from '@/pages/Mens';
import { ProductDetail } from '@/pages/ProductDetail';
import { Cart } from '@/pages/Cart';
import { Checkout } from '@/pages/Checkout';
import { Orders } from '@/pages/Orders';
import { Tracking } from '@/pages/Tracking';
import { Account } from '@/pages/Account';
import { Search } from '@/pages/Search';
import { WishlistPage } from '@/pages/WishlistPage';
import { Notifications } from '@/pages/Notifications';
import { TryOn } from '@/pages/TryOn';
import { Admin } from '@/pages/Admin';

function AppLayout() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  if (isAdmin) {
    return <Admin />;
  }

  return (
    <>
      <Ticker />
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 64px - 34px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/womens" element={<Womens />} />
          <Route path="/mens" element={<Mens />} />
          <Route path="/product/:gender/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/tracking/:orderId" element={<Tracking />} />
          <Route path="/account" element={<Account />} />
          <Route path="/search" element={<Search />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/tryon" element={<TryOn />} />
          <Route path="*" element={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16, background: 'var(--cream)', color: 'var(--ink)' }}>
              <div style={{ fontSize: 64 }}>🪡</div>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 36, fontWeight: 800 }}>Page Not Found</h1>
              <p style={{ color: 'rgba(13,11,8,.45)' }}>The page you're looking for doesn't exist.</p>
              <a href="/" className="btn btn-gold">Back to Home</a>
            </div>
          } />
        </Routes>
      </main>
      <Footer />
      <FloatingButtons />
      <ToastStack />
    </>
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
