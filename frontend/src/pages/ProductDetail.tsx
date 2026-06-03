import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, MapPin, ShieldCheck, Star, Tag, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { useCatalogLiveRefresh } from '@/lib/useCatalogLiveRefresh';
import { useApp } from '@/store/AppContext';
import { ProductVisual } from '@/ui/components';
import type { DeliveryCheck, Product, ProductReview } from '@/types';

export function ProductDetail() {
  const { id } = useParams<{ gender: string; id: string }>();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedThumb, setSelectedThumb] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [pinCode, setPinCode] = useState('600001');
  const pinCodeRef = useRef(pinCode);
  const [delivery, setDelivery] = useState<DeliveryCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pinCodeRef.current = pinCode;
  }, [pinCode]);

  const loadProduct = useCallback(() => {
    if (!id) return Promise.resolve();
    return api.products.get(id)
      .then((item) => {
        setProduct(item);
        setSelectedThumb(0);
        setSelectedColor(0);
        return Promise.allSettled([
          api.products.reviews.list(item.slug).then(setReviews),
          api.products.delivery(item.slug, pinCodeRef.current).then(setDelivery),
        ]);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);
    void loadProduct();
  }, [id, loadProduct]);

  const realtimeStatus = useCatalogLiveRefresh({
    enabled: Boolean(product || id),
    productId: product?.id,
    slug: product?.slug || id,
    onUpdate: () => {
      void loadProduct();
    },
  });

  if (loading) {
    return (
      <div className="pd-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)' }}>Loading product...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pd-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>CSM</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)' }}>Product not found</h2>
          <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  const p = product;
  const variant = p.variants?.[selectedColor] || p.variants?.[0];
  const activePrice = Number(variant?.price || p.price || 0);
  const activeMrp = Number(variant?.mrp || p.mrp || activePrice);
  const activeStock = Number(variant?.available_qty ?? p.available_qty ?? 0);
  const disc = activeMrp ? Math.round((1 - activePrice / activeMrp) * 100) : 0;
  const imageList = p.images?.length ? p.images : [];
  const selectedImage = imageList[selectedThumb];
  const attrs = p.gender === 'men'
    ? [['Material', variant?.fabric || 'Pure Silk'], ['Zari', variant?.zari_type || 'Gold Zari'], ['Size', variant?.size || 'S to 5XL'], ['Care', variant?.care_instructions || 'Dry Clean Only']]
    : [['Fabric', variant?.fabric || 'Pure Silk'], ['Zari', variant?.zari_type || 'Gold Zari'], ['Occasion', (p.occasions || []).join(' / ') || 'Bridal / Festive'], ['Blouse Piece', variant?.blouse_included ? 'Included' : 'Not included']];

  const inWish = isInWishlist(p.id);

  const handleAddToCart = () => {
    if (activeStock <= 0) return;
    void addToCart({ ...p, variant_id: variant?.id || p.variant_id });
  };

  const handleBuyNow = () => {
    if (activeStock <= 0) return;
    void addToCart({ ...p, variant_id: variant?.id || p.variant_id });
    navigate('/cart');
  };
  const checkDelivery = () => {
    void api.products.delivery(p.slug, pinCode).then(setDelivery);
  };
  const etaText = delivery?.serviceable
    ? `${new Date(delivery.eta_min).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(delivery.eta_max).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    : 'Check availability';

  return (
    <div className="pd-page">
      <div className="pd-grid">
        <div className="pd-gallery">
          <div className="pd-main-img">
            <ProductVisual product={p} className="detail-visual" imageUrl={selectedImage} />
          </div>
          <div className="pd-thumbs">
            {(p.images?.length ? p.images : p.colors || ['#7a1e1e', '#c4923a', '#0f5b45']).slice(0, 4).map((value, i) => (
              <button
                type="button"
                key={i}
                className={`pd-thumb ${i === selectedThumb ? 'on' : ''}`}
                style={value.startsWith('http') ? { backgroundImage: `url(${value})` } : { background: value }}
                onClick={() => setSelectedThumb(i)}
                aria-label={`View product image ${i + 1}`}
              >
                {!value.startsWith('http') && 'CSM'}
              </button>
            ))}
          </div>
        </div>

        <div className="pd-info">
          <div className="pd-breadcrumb" onClick={() => navigate(p.gender === 'men' ? '/mens' : '/womens')}>
            Back to {p.gender === 'men' ? "Men's Silk" : "Women's Sarees"} <span>/</span> {p.cat}
          </div>
          <div className="pd-badges">
            <span className="pd-badge pdb-gold">{p.cat}</span>
            <span className="pd-badge pdb-grn">{activeStock > 0 ? `${activeStock} In Stock` : 'Sold Out'}</span>
            <span className={`ws-chip ${realtimeStatus}`}>{realtimeStatus === 'connected' ? 'Live stock' : realtimeStatus}</span>
            {p.assured && <span className="pd-badge pdb-blu">CSM Assured</span>}
            {p.is_gi_tagged && <span className="pd-badge pdb-blu">GI Tagged</span>}
          </div>
          <h1 className="pd-title">{p.name}</h1>
          <div className="pd-price-row">
            <div className="pd-price">Rs {activePrice.toLocaleString('en-IN')}</div>
            <div className="pd-mrp">Rs {activeMrp.toLocaleString('en-IN')}</div>
            <div className="pd-off">{disc}% OFF</div>
          </div>
          <div className="pd-rating">
            <span className="pd-stars"><Star size={14} fill="currentColor" /> {Number(p.avg_rating || 0).toFixed(1)}</span>
            <span>{Number(p.avg_rating || 0).toFixed(1)} / {p.review_count || 0} reviews</span>
          </div>
          <div className="pd-offers">
            {[p.deal_label || 'Special Price', 'Extra 5% off on prepaid orders', 'Free shipping above Rs 999'].map((offer) => (
              <div key={offer} className="pd-offer"><Tag size={15} /> {offer}</div>
            ))}
          </div>
          <div className="pd-delivery-card">
            <div className="pd-delivery-title"><MapPin size={17} /> Delivery options</div>
            <div className="pd-pin-row">
              <input value={pinCode} onChange={(event) => setPinCode(event.target.value)} placeholder="Enter PIN code" />
              <button onClick={checkDelivery}>Check</button>
            </div>
            <div className={`pd-delivery-result ${delivery?.serviceable ? 'ok' : ''}`}>
              <Truck size={16} />
              {delivery?.serviceable ? `Delivery by ${etaText}. ${delivery.cod_available ? 'COD available.' : 'Prepaid only.'}` : delivery?.message || 'Enter PIN to check delivery'}
            </div>
          </div>
          <div className="pd-section-lbl">Product Details</div>
          <div className="pd-attrs">
            {attrs.map(([l, v]) => (
              <div key={l} className="pd-attr">
                <div className="pda-l">{l}</div>
                <div className="pda-v">{v}</div>
              </div>
            ))}
          </div>
          {!!p.key_highlights?.length && (
            <>
              <div className="pd-section-lbl">Highlights</div>
              <div className="pd-highlights">
                {p.key_highlights.map((item) => (
                  <div key={item}><CheckCircle2 size={15} /> {item}</div>
                ))}
              </div>
            </>
          )}
          <div className="pd-section-lbl">Select Colour</div>
          <div className="pd-colors">
            {(p.variants?.length ? p.variants : p.colors.map((c, i) => ({ id: i, color_hex: c }))).map((v, i) => (
              <button
                type="button"
                key={v.id}
                className={`pd-color ${i === selectedColor ? 'on' : ''}`}
                style={{ background: v.color_hex || p.colors[i] }}
                onClick={() => setSelectedColor(i)}
                aria-label={`Select colour ${i + 1}`}
                aria-pressed={i === selectedColor}
              />
            ))}
          </div>
          <div className="pd-cta-row">
            <button className="pd-btn-wish" onClick={() => void toggleWishlist(p)}>
              {inWish ? 'Saved' : 'Save'}
            </button>
            <button className="pd-btn-try" onClick={() => navigate('/tryon')}>
              {p.gender === 'men' ? 'View on Model' : 'AI Try-On'}
            </button>
            <button className="pd-btn-cart" onClick={handleAddToCart} disabled={activeStock <= 0}>
              {activeStock > 0 ? 'Add to Cart' : 'Sold Out'}
            </button>
          </div>
          <button className="pd-btn-buy" onClick={handleBuyNow} disabled={activeStock <= 0}>
            {activeStock > 0 ? `Buy Now - Rs ${activePrice.toLocaleString('en-IN')}` : 'Currently unavailable'}
          </button>
          <div className="pd-guarantee">
            <div className="pd-g">Free {p.gender === 'men' ? 'matching piece' : 'blouse'} included where applicable</div>
            <div className="pd-g">15-day easy returns</div>
            <div className="pd-g">Free pan-India shipping above Rs 999</div>
            <div className="pd-g">GST invoice provided</div>
            <div className="pd-g">100% authentic GI tagged collection</div>
          </div>
          <div className="pd-seller">
            <ShieldCheck size={18} />
            <div>
              <strong>{p.seller_name || 'CSM Silks Kanchipuram'}</strong>
              <span>{p.return_days || 15}-day returns, exchange support, GST invoice, and quality check before dispatch.</span>
            </div>
          </div>
          {!!p.specifications && Object.keys(p.specifications).length > 0 && (
            <div className="pd-spec-table">
              {Object.entries(p.specifications).map(([key, value]) => (
                <div key={key}><span>{key}</span><strong>{value}</strong></div>
              ))}
            </div>
          )}
          <div className="pd-review-panel">
            <div className="pd-review-head">
              <strong>Ratings and reviews</strong>
              <span>{Number(p.avg_rating || 0).toFixed(1)} average</span>
            </div>
            {(reviews.length ? reviews : []).slice(0, 3).map((review) => (
              <div className="pd-review" key={review.id}>
                <div><Star size={13} fill="currentColor" /> {review.rating}</div>
                <strong>{review.title}</strong>
                <p>{review.body}</p>
                <span>{review.customer || 'Verified customer'} {review.is_verified_purchase ? '- verified purchase' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
