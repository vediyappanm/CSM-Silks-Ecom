import { useEffect, useState } from 'react';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CatalogToolbar } from '@/features/catalog/components/CatalogToolbar';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { api } from '@/lib/api';
import type { CatalogFacets, Product } from '@/types';

export function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [facets, setFacets] = useState<CatalogFacets | null>(null);
  const [sort, setSort] = useState('popularity');
  const [rating, setRating] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(true);

  useEffect(() => {
    api.products.facets().then(setFacets).catch(() => setFacets(null));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      api.products.search({
        q: query.trim() || undefined,
        sort,
        rating,
        max_price: maxPrice,
        availability: inStock ? 'in_stock' : undefined,
        per_page: 48,
      })
        .then(data => setResults(data.items))
        .catch(() => setResults([]));
    }, 180);
    return () => window.clearTimeout(id);
  }, [query, sort, rating, maxPrice, inStock]);

  const chips = ['Kanjivaram', 'Bridal', 'Men', 'Festive', 'Dhoti', 'Daily'];

  return (
    <div className="search-page">
      <div className="search-shell">
        <div className="search-top">
          <button className="back-btn" onClick={() => navigate('/')} aria-label="Back home">
            <ArrowLeft size={20} />
          </button>
          <div>
            <span>Store search</span>
            <h1>Find the right textile fast</h1>
          </div>
        </div>

        <div className="search-box">
          <SearchIcon size={20} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search sarees, silk shirts, dhotis..."
            autoFocus
          />
          <button onClick={() => setQuery(query.trim())}>Search</button>
        </div>

        <div className="quick-chips">
          {chips.map((chip) => (
            <button key={chip} onClick={() => setQuery(chip)}>{chip}</button>
          ))}
        </div>

        <div className="result-count">
          {query.trim() ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"` : `All products (${results.length})`}
        </div>

        <CatalogToolbar
          facets={facets}
          sort={sort}
          rating={rating}
          availability={inStock}
          maxPrice={maxPrice}
          onSort={setSort}
          onRating={setRating}
          onAvailability={setInStock}
          onMaxPrice={setMaxPrice}
        />

        <div className="pg">
          {results.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </div>
  );
}
