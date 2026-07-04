import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { CatalogToolbar } from '@/features/catalog/components/CatalogToolbar';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { api } from '@/lib/api';
import { useCatalogLiveRefresh } from '@/lib/useCatalogLiveRefresh';
import { liveStatusLabel } from '@/lib/liveStatus';
import { ProductGridSkeleton } from '@/ui/components';
import type { CatalogFacets, Product } from '@/types';

const CATS = ['all', 'kanjivaram', 'bridal', 'festive', 'patola', 'daily', 'mysore', 'banarasi'] as const;

export function Womens() {
  const [searchParams] = useSearchParams();
  const [manualFilter, setManualFilter] = useState<string>('all');
  const filter = useMemo(() => {
    const category = (searchParams.get('category') || '').toLowerCase();
    if (category && (CATS as readonly string[]).includes(category)) return category;
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
    return api.products.facets({ gender: 'women' }).then(setFacets).catch(() => setFacets(null));
  }, []);

  const loadProducts = useCallback(() => {
    return api.products.list({
      gender: 'women',
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
    gender: 'women',
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
      <header className="catalog-hero women">
        <div>
          <div className="catalog-hero-kicker">
            <span>Women's collection</span>
            <small className={`ws-chip ${realtimeStatus}`}>{liveStatusLabel(realtimeStatus, 'stock')}</small>
          </div>
          <h1>Pure silk sarees</h1>
          <p>Handwoven Kanjivaram, bridal, festive, daily, Patola, Mysore, and Banarasi edits with live stock.</p>
        </div>
      </header>

      <div className="filter-bar">
        <div className="filter-bar-inner">
          <div className="filter-title"><SlidersHorizontal size={16} /> Collections</div>
          <div className="filter-scroll">
            {CATS.map(c => (
              <button key={c} className={`filter-chip ${filter === c ? 'active' : ''}`} onClick={() => changeFilter(c)}>
                {c === 'all' ? 'All sarees' : c.charAt(0).toUpperCase() + c.slice(1)}
                {filter === c && c !== 'all' && <span className="filter-clear">x</span>}
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
            <h2>No sarees match these filters</h2>
            <p>Try another collection, price range, or turn off in-stock only.</p>
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
