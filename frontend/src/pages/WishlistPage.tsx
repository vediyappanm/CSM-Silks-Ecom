import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { useApp } from '@/store/AppContext';

export function WishlistPage() {
  const navigate = useNavigate();
  const { wishlist } = useApp();

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
            <Heart size={58} />
            <div className="cart-empty-title">No saved textiles yet</div>
            <p className="cart-empty-sub">Save products while browsing so customers can compare later.</p>
            <button className="btn btn-primary" onClick={() => navigate('/womens')}>Browse women</button>
            <button className="btn btn-secondary" onClick={() => navigate('/mens')}>Browse men</button>
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
