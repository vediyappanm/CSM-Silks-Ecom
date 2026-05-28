import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { ProductCard } from '@/components/ProductCard';

export function WishlistPage() {
  const navigate = useNavigate();
  const { wishlist } = useApp();

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', padding: '28px 4vw' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--ink)' }}>My Wishlist ♡</h1>
          <span style={{ fontSize: 13, color: 'rgba(13,11,8,.4)' }}>{wishlist.length} item{wishlist.length !== 1 ? 's' : ''}</span>
        </div>
        {wishlist.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>♡</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>No items yet</div>
            <p style={{ fontSize: 14, color: 'rgba(13,11,8,.45)', marginBottom: 24 }}>Tap ♡ on any product to save it here</p>
            <button className="btn btn-gold" onClick={() => navigate('/womens')}>🪡 Browse Women's</button>
            &nbsp;
            <button className="btn btn-ghost" onClick={() => navigate('/mens')}>👔 Browse Men's</button>
          </div>
        ) : (
          <div className="pg">
            {wishlist.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
