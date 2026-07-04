import { Heart, ShoppingBag, Star, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDeliveryPin } from '@/lib/deliveryPin';
import { productDetailPath } from '@/lib/productPaths';
import { ProductVisual } from '@/ui/components';
import { useApp } from '@/store/AppContext';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const inWish = isInWishlist(product.id);
  const rating = Number(product.avg_rating || 0);
  const discount = product.mrp ? Math.max(0, Math.round((1 - product.price / product.mrp) * 100)) : 0;
  const stock = Number(product.available_qty || 0);
  const canBuy = stock > 0;
  const deliveryPin = getDeliveryPin();
  const deliveryDays = `${product.delivery_min_days || 2}-${product.delivery_max_days || 6}`;
  const href = productDetailPath(product);

  return (
    <article className="product-card">
      <div className="product-card-media">
        <Link to={href} className="product-card-media-link" tabIndex={-1} aria-hidden="true">
          <ProductVisual product={product} />
        </Link>
        <button
          type="button"
          className={`product-wish ${inWish ? 'active' : ''}`}
          aria-label={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={() => {
            void toggleWishlist(product);
          }}
        >
          <Heart size={17} fill={inWish ? 'currentColor' : 'none'} />
        </button>
        {product.assured && <span className="product-assured">Assured</span>}
        {discount > 0 && <span className="product-discount">{discount}% off</span>}
      </div>
      <div className="product-card-body">
        <Link to={href} className="product-card-link">
          <div className="product-card-meta">
            <span>{product.cat}</span>
            <span className="product-rating">
              <Star size={12} fill="currentColor" />
              {rating ? rating.toFixed(1) : 'New'}
              {product.review_count ? ` (${product.review_count})` : ''}
            </span>
          </div>
          <h3>{product.name}</h3>
          <p>{product.hook || 'Pure silk textile from CSM Silks.'}</p>
          <div className="product-card-swatches" aria-label="Available colors">
            {(product.colors || []).slice(0, 4).map(color => <span key={color} style={{ background: color }} />)}
          </div>
          <div className="product-card-flags">
            {product.deal_label && <span className="product-flag gold">{product.deal_label}</span>}
            <span className={`product-flag ${stock > 0 ? '' : 'danger'}`}>{stock > 0 ? `${stock} left` : 'Sold out'}</span>
          </div>
          <div className="product-delivery-line">
            <Truck size={13} />
            Delivery to {deliveryPin} in {deliveryDays} days
          </div>
        </Link>
        <div className="product-card-bottom">
          <Link to={href} className="product-card-price-link">
            <div className="product-price">Rs {product.price.toLocaleString('en-IN')}</div>
            {product.mrp > product.price && <div className="product-mrp">Rs {product.mrp.toLocaleString('en-IN')}</div>}
          </Link>
          <button
            type="button"
            className="product-cart"
            aria-label="Add to cart"
            disabled={!canBuy}
            onClick={() => {
              if (!canBuy) return;
              void addToCart(product);
            }}
          >
            <ShoppingBag size={16} /> {canBuy ? 'Add' : 'Sold out'}
          </button>
        </div>
      </div>
    </article>
  );
}
