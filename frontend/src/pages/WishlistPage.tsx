import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { useApp } from '@/store/AppContext';

export function WishlistPage() {
  const navigate = useNavigate();
  const { wishlist, isAuthed } = useApp();

  return (
    <div className="wishlist-page">
      <div className="wishlist-shell">
        <div className="page-title-row">
          <div>
            <span>Saved products</span>
            <h1>My wishlist</h1>
          </div>
          <strong>{wishlist.length} item{wishlist.length !== 1 ? 's' : ''}</strong>
        </div>
        {wishlist.length === 0 ? (
          <div className="cart-empty">
            <Heart size={58} aria-hidden="true" />
            <div className="cart-empty-title">No saved textiles yet</div>
            <p className="cart-empty-sub">
              {isAuthed
                ? 'Save products while browsing so you can compare and buy later.'
                : 'Sign in to save products to your wishlist, or browse the catalog now.'}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/womens')}>Browse women</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/mens')}>Browse men</button>
            {!isAuthed && (
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/login?next=/wishlist')}>
                Sign in to save
              </button>
            )}
          </div>
        ) : (
          <div className="pg">
            {wishlist.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </div>
    </div>
  );
}
