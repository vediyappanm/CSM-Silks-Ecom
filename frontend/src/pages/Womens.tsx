import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CatalogToolbar } from '@/features/catalog/components/CatalogToolbar';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { api } from '@/lib/api';
import type { CatalogFacets, Product } from '@/types';

const CATS = ['all', 'kanjivaram', 'bridal', 'festive', 'patola', 'daily', 'mysore', 'banarasi'] as const;

export function Womens() {
  const [filter, setFilter] = useState<string>('all');
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

  useEffect(() => {
    api.products.facets({ gender: 'women' }).then(setFacets).catch(() => setFacets(null));
  }, []);

  useEffect(() => {
    api.products.list({
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

  const changeFilter = (nextFilter: string) => {
    setLoading(true);
    setFilter(nextFilter);
  };

  return (
    <div className="catalog-page">
      <header className="catalog-hero women">
        <div>
          <span>Women's collection</span>
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
        {loading ? (
          <div className="loading-state">Loading collection...</div>
        ) : (
          <div className="pg">
            {products.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </div>
  );
}
