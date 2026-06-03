import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, BadgeCheck, CreditCard, MessageCircle, PackageCheck, Search, ShieldCheck, ShoppingBag, Star, Truck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { ProductVisual, SectionHeader } from '@/ui/components';
import { api } from '@/lib/api';
import { useApp } from '@/store/AppContext';
import type { Product } from '@/types';

const collectionTiles = [
  { title: 'Kanjivaram sarees', text: 'Temple borders, rich zari, heirloom wedding pieces.', path: '/womens', tone: 'ruby' },
  { title: 'Bridal edits', text: 'Curated silk sarees with blouse options and verified stock.', path: '/womens', tone: 'gold' },
  { title: "Men's silk", text: 'Dhotis, veshtis, shirts, and wedding sets for him.', path: '/mens', tone: 'green' },
  { title: 'Daily silk', text: 'Lighter silk picks for gifting, puja, and everyday occasions.', path: '/womens', tone: 'indigo' },
];

const trustItems = [
  { icon: ShieldCheck, title: 'GI-tagged silk', text: 'Authenticity-first product details.' },
  { icon: PackageCheck, title: 'Live inventory', text: 'SKU-level stock for color and fabric.' },
  { icon: Truck, title: 'India shipping', text: 'Track orders from processing to delivery.' },
  { icon: CreditCard, title: 'Razorpay or COD', text: 'Secure prepaid checkout or cash on delivery.' },
];

function productPath(product?: Product) {
  if (!product) return '/womens';
  return `/product/${product.gender === 'men' ? 'mens' : 'womens'}/${product.slug}`;
}

function formatINR(value?: number) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}

export function Home() {
  const navigate = useNavigate();
  const { addToCart, isAuthed } = useApp();
  const [womens, setWomens] = useState<Product[]>([]);
  const [mens, setMens] = useState<Product[]>([]);
  const [heroQuery, setHeroQuery] = useState('');

  useEffect(() => {
    Promise.all([
      api.products.list({ gender: 'women', featured: true, per_page: 6 }),
      api.products.list({ gender: 'men', per_page: 4 }),
    ]).then(([womenData, menData]) => {
      setWomens(womenData.items);
      setMens(menData.items);
    }).catch(() => {
      setWomens([]);
      setMens([]);
    });
  }, []);

  const heroProduct = womens[0] || mens[0];
  const liveCount = womens.length + mens.length;
  const stockCount = Number(heroProduct?.available_qty || 0);
  const discount = heroProduct?.mrp && heroProduct.mrp > heroProduct.price
    ? Math.max(0, Math.round((1 - heroProduct.price / heroProduct.mrp) * 100))
    : 0;
  const rating = Number(heroProduct?.avg_rating || 0);

  const submitHeroSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = heroQuery.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  const addFeaturedToCart = async () => {
    if (!heroProduct) {
      navigate('/womens');
      return;
    }
    await addToCart(heroProduct);
  };

  return (
    <div className="storefront">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-copy">
            <h1>Pure silk shopping, from product to delivery.</h1>
            <p className="hero-lede">
              Browse real CSM Silks inventory with product photos, GST invoices, OTP-secured
              checkout, Razorpay/COD payments, and shipment tracking.
            </p>
            <form className="hero-search" onSubmit={submitHeroSearch} role="search">
              <Search size={18} />
              <input
                value={heroQuery}
                onChange={event => setHeroQuery(event.target.value)}
                placeholder="Search sarees, dhotis, silk shirts, festive colors"
                aria-label="Search CSM Silks products"
              />
              <button type="submit">Search</button>
            </form>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate('/womens')}>
                Shop women <ArrowRight size={17} />
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/mens')}>
                Shop men
              </button>
              <button className="btn btn-ghost hero-account-action" onClick={() => navigate(isAuthed ? '/account' : '/signup')}>
                <UserRound size={17} />
                {isAuthed ? 'My account' : 'Create account'}
              </button>
            </div>
            <div className="hero-market-row">
              {collectionTiles.map((tile) => (
                <button key={tile.title} onClick={() => navigate(tile.path)}>
                  <strong>{tile.title}</strong>
                  <span>{tile.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hero-showcase">
            <div className="hero-showcase-card">
              <div className="hero-showcase-top">
                <span>Live featured pick</span>
                <BadgeCheck size={18} />
              </div>
              <button className="hero-image-button" type="button" onClick={() => navigate(productPath(heroProduct))}>
                <ProductVisual product={heroProduct} className="hero-visual hero-product-image" />
              </button>
              <div className="hero-showcase-info">
                <div>
                  <strong>{heroProduct?.name || 'Catalog waiting for live products'}</strong>
                  <span>
                    {heroProduct
                      ? `${heroProduct.cat || 'CSM catalog'} - ${stockCount > 0 ? `${stockCount} in stock` : 'Stock pending'}`
                      : 'No published API product returned yet'}
                  </span>
                </div>
                <div className="hero-price-stack">
                  {heroProduct && <strong>{formatINR(heroProduct.price)}</strong>}
                  {heroProduct?.mrp && heroProduct.mrp > heroProduct.price && <span>{formatINR(heroProduct.mrp)}</span>}
                </div>
              </div>
              {heroProduct ? (
                <div className="hero-product-proof">
                  <span><Star size={14} fill="currentColor" /> {rating ? rating.toFixed(1) : 'New'} rating</span>
                  <span>{discount > 0 ? `${discount}% off` : 'Assured stock'}</span>
                  <span>Delivery {heroProduct.delivery_min_days || 2}-{heroProduct.delivery_max_days || 6} days</span>
                </div>
              ) : (
                <div className="hero-product-proof">
                  <span>Connect catalog API</span>
                  <span>Publish products in admin</span>
                  <span>Customer card stays empty until live data arrives</span>
                </div>
              )}
              <div className="hero-showcase-actions">
                <button type="button" onClick={() => void addFeaturedToCart()} disabled={!heroProduct}>
                  <ShoppingBag size={17} />
                  Add to cart
                </button>
                <button type="button" className="secondary" onClick={() => navigate(productPath(heroProduct))}>
                  {heroProduct ? 'View details' : 'Open catalog'}
                </button>
              </div>
            </div>
            <div className="hero-mini-panel">
              <span>Today at CSM</span>
              <strong>{liveCount} live picks</strong>
              <p>Cart, checkout, payments, order tracking, and delivery updates are connected.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-band">
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="trust-item">
              <Icon size={21} />
              <div>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="section surface-section">
        <SectionHeader
          label="Shop by collection"
          title="Textile edits for"
          accent="every occasion"
          description="Move through the store the way customers shop: occasion, fabric, color, stock, then checkout."
          tone="light"
        />
        <div className="collection-grid">
          {collectionTiles.map((tile) => (
            <button key={tile.title} className={`collection-tile ${tile.tone}`} onClick={() => navigate(tile.path)}>
              <span>{tile.title}</span>
              <p>{tile.text}</p>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader
          label="Best sellers"
          title="Sarees customers"
          accent="keep choosing"
          description="Live pricing, available colors, wishlist, and cart actions for repeat shopping."
        />
        <div className="pg">
          {womens.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="section split-section">
        <div className="split-copy">
          <SectionHeader
            label="Men's silk"
            title="Wedding-ready"
            accent="silk for him"
            description="Dhotis, veshtis, shirts, and coordinated sets that can be processed by the same catalog and stock engine."
            align="left"
          />
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => navigate('/mens')}>Browse men's silk</button>
            <a className="btn btn-secondary" href="https://wa.me/919876543210?text=Hi%20CSM%20Silks%2C%20I%20need%20help%20choosing%20men%27s%20silk." target="_blank">
              <MessageCircle size={17} /> WhatsApp help
            </a>
          </div>
        </div>
        <div className="pg compact-products">
          {mens.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </div>
  );
}
