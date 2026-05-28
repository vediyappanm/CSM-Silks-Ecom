import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/store/AppContext';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: '🏠 Home' },
    { path: '/womens', label: '🪡 Women\'s' },
    { path: '/mens', label: '👔 Men\'s Silk', cls: 'mens' },
    { path: '/search', label: '🔍 Search' },
  ];

  return (
    <>
      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          <div className="nav-mark">🪡</div>
          <div>
            <div className="nav-brand">CSM SILKS</div>
            <div className="nav-sub">Kanchipuram · Est. 1987</div>
          </div>
        </div>
        <div className="nav-links">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-link ${isActive(item.path) ? 'on' : ''} ${item.cls || ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="nav-actions">
          <button className="nav-icon-btn" onClick={() => navigate('/notifications')} title="Notifications" style={{ position: 'relative' }}>
            🔔
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px',
              borderRadius: '50%', background: 'var(--crimson)', fontSize: '7px', fontWeight: 700,
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid var(--ink)'
            }}>3</span>
          </button>
          <button className="nav-icon-btn" onClick={() => navigate('/wishlist')} title="Wishlist">♡</button>
          <button className="nav-icon-btn" onClick={() => navigate('/cart')} title="Cart" style={{ position: 'relative' }}>
            🛒
            {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
          </button>
          <button className="nav-icon-btn" onClick={() => navigate('/account')} title="Account">👤</button>
          <button className="nav-cta" onClick={() => navigate('/womens')}>Shop Now ✦</button>
          <button className="nav-mob-menu" onClick={() => setMobileOpen(true)}>☰</button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mob-menu ${mobileOpen ? 'on' : ''}`}>
        <button className="mob-menu-close" onClick={() => setMobileOpen(false)}>✕</button>
        <div className="mm-link" onClick={() => { navigate('/'); setMobileOpen(false); }}>🏠 Home</div>
        <div className="mm-link" onClick={() => { navigate('/womens'); setMobileOpen(false); }}>🪡 Women's Sarees</div>
        <div className="mm-link mens" onClick={() => { navigate('/mens'); setMobileOpen(false); }}>👔 Men's Silk</div>
        <div className="mm-link" onClick={() => { navigate('/cart'); setMobileOpen(false); }}>🛒 Cart</div>
        <div className="mm-link" onClick={() => { navigate('/orders'); setMobileOpen(false); }}>📦 My Orders</div>
        <div className="mm-link" onClick={() => { navigate('/account'); setMobileOpen(false); }}>👤 My Account</div>
      </div>
    </>
  );
}
