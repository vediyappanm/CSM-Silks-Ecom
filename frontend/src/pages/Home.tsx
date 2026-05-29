import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, CreditCard, MessageCircle, PackageCheck, Search, ShieldCheck, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { ProductVisual, SectionHeader } from '@/ui/components';
import { api } from '@/lib/api';
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

export function Home() {
  const navigate = useNavigate();
  const [womens, setWomens] = useState<Product[]>([]);
  const [mens, setMens] = useState<Product[]>([]);

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

  return (
    <div className="storefront">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-copy">
            <h1>CSM Silks</h1>
            <p className="hero-lede">
              Pure Kanjivaram sarees and men's silk wear with real stock, GST invoices,
              secure checkout, and order tracking.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate('/womens')}>
                Shop women <ArrowRight size={17} />
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/mens')}>
                Shop men
              </button>
            </div>
            <div className="hero-search" onClick={() => navigate('/search')}>
              <Search size={18} />
              <span>Search sarees, dhotis, silk shirts, festive colors</span>
            </div>
          </div>

          <div className="hero-showcase">
            <div className="hero-showcase-card">
              <div className="hero-showcase-top">
                <span>Featured textile</span>
                <BadgeCheck size={18} />
              </div>
              <ProductVisual product={heroProduct} className="hero-visual" />
              <div className="hero-showcase-info">
                <div>
                  <strong>{heroProduct?.name || 'Royal Kanjivaram Silk Saree'}</strong>
                  <span>{heroProduct?.cat || 'Pure silk collection'}</span>
                </div>
                <button onClick={() => navigate(heroProduct ? `/product/${heroProduct.gender === 'men' ? 'mens' : 'womens'}/${heroProduct.slug}` : '/womens')}>
                  View
                </button>
              </div>
            </div>
            <div className="hero-mini-panel">
              <span>Today at CSM</span>
              <strong>{womens.length + mens.length || 10} live picks</strong>
              <p>Fresh silk picks ready for cart, checkout, and doorstep delivery.</p>
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
