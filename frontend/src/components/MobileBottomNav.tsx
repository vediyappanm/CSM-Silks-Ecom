import { Home, LayoutGrid, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CUSTOMER_AUTH_PATHS } from '@/lib/routes';
import { useApp } from '@/store/AppContext';

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, isAuthed } = useApp();

  if (location.pathname === '/admin' || location.pathname === '/checkout') return null;
  if (location.pathname.startsWith('/product/')) return null;
  if (CUSTOMER_AUTH_PATHS.has(location.pathname)) return null;

  const tabs = [
    { path: '/', label: 'Home', icon: Home, ariaLabel: 'Home tab', match: (path: string) => path === '/' },
    { path: '/womens', label: 'Shop', icon: LayoutGrid, ariaLabel: 'Shop tab', match: (path: string) => path === '/womens' || path === '/mens' || path.startsWith('/product/') },
    { path: '/tryon', label: 'Try On', icon: Sparkles, ariaLabel: 'Try on tab', match: (path: string) => path.startsWith('/tryon') },
    { path: '/cart', label: 'Bag', icon: ShoppingBag, ariaLabel: 'Cart tab', match: (path: string) => path.startsWith('/cart') },
    {
      path: isAuthed ? '/account' : '/login',
      label: 'Account',
      icon: UserRound,
      ariaLabel: isAuthed ? 'Account tab' : 'Login tab',
      match: (path: string) => path.startsWith('/account') || path.startsWith('/orders') || path.startsWith('/login') || path.startsWith('/signup'),
    },
  ];

  return (
    <nav className="mob-bottom-nav" aria-label="App navigation">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = tab.match(location.pathname);
        return (
          <button
            key={tab.path}
            type="button"
            className={`mob-bottom-tab ${active ? 'on' : ''}`}
            onClick={() => navigate(tab.path)}
            aria-label={tab.ariaLabel || tab.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mob-bottom-icon">
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {tab.path === '/cart' && cartCount > 0 && (
                <span className="mob-bottom-badge">{cartCount}</span>
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

