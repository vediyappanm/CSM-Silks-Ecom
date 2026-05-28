import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const p = product;
  const inWish = isInWishlist(p.id);

  const handleClick = () => {
    navigate(`/product/${p.gender === 'men' ? 'mens' : 'womens'}/${p.id}`);
  };

  return (
    <div className="pc" onClick={handleClick}>
      <div className="pc-img" style={{ background: p.bg }}>
        <div style={{ fontSize: 68, filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.4))', position: 'relative', zIndex: 2 }}>
          {p.emoji}
        </div>
        <span className={`pc-badge ${p.badge}`}>{p['badge-text']}</span>
        <div
          className="pc-wish"
          onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
        >
          {inWish ? '♥' : '♡'}
        </div>
        <button
          className="pc-quick"
          onClick={(e) => { e.stopPropagation(); addToCart(p); }}
        >
          🛒 Add to Cart
        </button>
      </div>
      <div className="pc-info">
        <div className="pc-cat">{p.cat}</div>
        <div className="pc-name">{p.name}</div>
        <div className="pc-hook">{p.hook}</div>
        <div className="pc-row">
          <div className="pc-price">₹{p.price.toLocaleString('en-IN')}</div>
          <div className="pc-dots">
            {p.colors.map((c, i) => (
              <div key={i} className="pd" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
