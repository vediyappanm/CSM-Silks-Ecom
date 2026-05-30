import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Heart, Home, MapPin, Menu, Search, Shirt, ShoppingBag, Sparkles, Truck, UserRound, X } from 'lucide-react';
import { BrandMark } from '@/ui/components';
import { useApp } from '@/store/AppContext';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isActive = (path: string) => location.pathname === path;
  const closeAndGo = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/womens', label: 'Women', icon: Sparkles },
    { path: '/mens', label: 'Men', icon: Shirt },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/tracking', label: 'Track', icon: Truck },
  ];

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const nextQuery = query.trim();
    navigate(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : '/search');
  };

  return (
    <>
      <nav className="nav">
        <button className="nav-logo" onClick={() => navigate('/')} aria-label="Go to CSM Silks home">
          <BrandMark />
        </button>

        <button className="nav-location" onClick={() => navigate('/search')} aria-label="Set delivery location">
          <MapPin size={16} />
          <span>Deliver to 600001</span>
        </button>

        <form className="nav-search" onSubmit={submitSearch}>
          <Search size={18} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search sarees, dhotis, silk shirts" />
          <button type="submit">Search</button>
        </form>

        <div className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={`nav-link ${isActive(item.path) ? 'on' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="nav-actions">
          <button className="nav-icon-btn" onClick={() => navigate('/notifications')} aria-label="Notifications">
            <Bell size={18} />
            <span className="nav-badge subtle">3</span>
          </button>
          <button className="nav-icon-btn" onClick={() => navigate('/wishlist')} aria-label="Wishlist">
            <Heart size={18} />
          </button>
          <button className="nav-icon-btn" onClick={() => navigate('/cart')} aria-label="Cart">
            <ShoppingBag size={18} />
            {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
          </button>
          <button className="nav-icon-btn" onClick={() => navigate('/account')} aria-label="Account">
            <UserRound size={18} />
          </button>
          <button className="nav-cta" onClick={() => navigate('/womens')}>Shop silk</button>
          <button className="nav-mob-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
      </nav>

      <div className={`mob-menu ${mobileOpen ? 'on' : ''}`}>
        <button className="mob-menu-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X size={20} />
        </button>
        <BrandMark />
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.path} className="mm-link" onClick={() => closeAndGo(item.path)}>
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
        <button className="mm-link" onClick={() => closeAndGo('/orders')}>
          <ShoppingBag size={18} />
          My orders
        </button>
        <button className="mm-link" onClick={() => closeAndGo('/account')}>
          <UserRound size={18} />
          Account
        </button>
      </div>
    </>
  );
}
