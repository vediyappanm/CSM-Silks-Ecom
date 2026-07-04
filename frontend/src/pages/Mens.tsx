import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Ruler, Shirt, SlidersHorizontal, Sparkles } from 'lucide-react';
import { CatalogToolbar } from '@/features/catalog/components/CatalogToolbar';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { api } from '@/lib/api';
import { useCatalogLiveRefresh } from '@/lib/useCatalogLiveRefresh';
import { liveStatusLabel } from '@/lib/liveStatus';
import { ProductGridSkeleton } from '@/ui/components';
import type { CatalogFacets, Product } from '@/types';

const MEN_CATS = [
  { key: 'all', label: "All men's" },
  { key: 'dhoti', label: 'Silk dhotis' },
  { key: 'veshti', label: 'Veshtis' },
  { key: 'shirt', label: 'Silk shirts' },
  { key: 'set', label: 'Wedding sets' },
  { key: 'panch', label: 'Panchakacham' },
];

const valueProps = [
  { icon: Sparkles, title: 'Pure Kanjivaram', text: 'GI-tagged silk quality from the same CSM loom standard.' },
  { icon: Shirt, title: 'Wedding ready', text: 'Dhotis, veshtis, shirts, and coordinated occasion sets.' },
  { icon: Ruler, title: 'Size friendly', text: 'Variant-level size and stock management for every SKU.' },
];

export function Mens() {
  const [searchParams] = useSearchParams();
  const [manualFilter, setManualFilter] = useState<string>('all');
  const filter = useMemo(() => {
    const category = (searchParams.get('category') || '').toLowerCase();
    if (category && MEN_CATS.some(item => item.key === category)) return category;
    return manualFilter;
  }, [searchParams, manualFilter]);
  const [products, setProducts] = useState<Product[]>([]);
  const [facets, setFacets] = useState<CatalogFacets | null>(null);
  const [sort, setSort] = useState('popularity');
  const [rating, setRating] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadFacets = useCallback(() => {
    return api.products.facets({ gender: 'men' }).then(setFacets).catch(() => setFacets(null));
  }, []);

  const loadProducts = useCallback(() => {
    return api.products.list({
      gender: 'men',
      category: filter === 'all' ? undefined : filter,
      sort,
      rating,
      max_price: maxPrice,
      availability: inStock ? 'in_stock' : undefined,
      per_page: 48,
    })
      .then(data => setProducts(data.items))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [filter, sort, rating, maxPrice, inStock]);

  useEffect(() => {
    void loadFacets();
  }, [loadFacets]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const realtimeStatus = useCatalogLiveRefresh({
    gender: 'men',
    onUpdate: () => {
      void loadProducts();
      void loadFacets();
    },
  });

  const changeFilter = (nextFilter: string) => {
    setLoading(true);
    setManualFilter(prev => prev === nextFilter && nextFilter !== 'all' ? 'all' : nextFilter);
  };

  return (
    <div className="catalog-page">
      <header className="catalog-hero men">
        <div>
          <div className="catalog-hero-kicker">
            <span>Men's silk collection</span>
            <small className={`ws-chip ${realtimeStatus}`}>{liveStatusLabel(realtimeStatus, 'stock')}</small>
          </div>
          <h1>Silk wear for Indian occasions</h1>
          <p>Pure silk dhotis, veshtis, shirts, and wedding sets with the same live checkout flow as sarees.</p>
          <a className="btn btn-secondary" href="https://wa.me/919876543210?text=Hi%20CSM%20Silks%2C%20I%20need%20men%27s%20silk%20help." target="_blank">
            <MessageCircle size={17} /> WhatsApp stylist
          </a>
        </div>
      </header>

      <section className="mens-value-grid">
        {valueProps.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="mens-value-card">
              <Icon size={22} />
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </div>
          );
        })}
      </section>

      <div className="filter-bar">
        <div className="filter-bar-inner">
          <div className="filter-title"><SlidersHorizontal size={16} /> Categories</div>
          <div className="filter-scroll">
            {MEN_CATS.map(cat => (
              <button key={cat.key} className={`filter-chip ${filter === cat.key ? 'active' : ''}`} onClick={() => changeFilter(cat.key)}>
                {cat.label}
                {filter === cat.key && cat.key !== 'all' && <span className="filter-clear">x</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CatalogToolbar
        facets={facets}
        sort={sort}
        rating={rating}
        availability={inStock}
        maxPrice={maxPrice}
        onSort={(value) => { setLoading(true); setSort(value); }}
        onRating={(value) => { setLoading(true); setRating(value); }}
        onAvailability={(value) => { setLoading(true); setInStock(value); }}
        onMaxPrice={(value) => { setLoading(true); setMaxPrice(value); }}
      />

      <section className="section surface-section">
        <div className="catalog-results-bar">
          <span>{loading ? 'Updating live catalog...' : `${products.length} products`}</span>
          <span className={`ws-chip ${realtimeStatus}`}>{liveStatusLabel(realtimeStatus, 'stock')}</span>
        </div>
        {loading ? (
          <ProductGridSkeleton />
        ) : products.length === 0 ? (
          <div className="catalog-empty">
            <div className="catalog-empty-mark">CSM</div>
            <h2>No men's styles match these filters</h2>
            <p>Try another category, price range, or turn off in-stock only.</p>
            <button type="button" className="btn btn-primary" onClick={() => { setManualFilter('all'); setMaxPrice(''); setRating(''); setInStock(false); }}>Reset filters</button>
          </div>
        ) : (
          <div className="pg">
            {products.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </div>
  );
}
