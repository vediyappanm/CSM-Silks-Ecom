import { SlidersHorizontal } from 'lucide-react';
import type { CatalogFacets } from '@/types';

interface CatalogToolbarProps {
  facets: CatalogFacets | null;
  sort: string;
  rating: string;
  availability: boolean;
  maxPrice: string;
  onSort: (value: string) => void;
  onRating: (value: string) => void;
  onAvailability: (value: boolean) => void;
  onMaxPrice: (value: string) => void;
}

export function CatalogToolbar({
  facets,
  sort,
  rating,
  availability,
  maxPrice,
  onSort,
  onRating,
  onAvailability,
  onMaxPrice,
}: CatalogToolbarProps) {
  const max = Number(facets?.price?.max_price || 25000);

  return (
    <div className="catalog-toolbar">
      <div className="catalog-toolbar-title">
        <SlidersHorizontal size={16} />
        Filters
      </div>
      <label className="catalog-control">
        <span>Sort</span>
        <select value={sort} onChange={(event) => onSort(event.target.value)}>
          {(facets?.sorts || [
            { key: 'popularity', label: 'Popularity' },
            { key: 'price_asc', label: 'Price: Low to High' },
            { key: 'price_desc', label: 'Price: High to Low' },
            { key: 'discount', label: 'Biggest Discount' },
          ]).map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="catalog-control">
        <span>Rating</span>
        <select value={rating} onChange={(event) => onRating(event.target.value)}>
          <option value="">Any rating</option>
          <option value="4">4 stars and above</option>
          <option value="4.5">4.5 stars and above</option>
        </select>
      </label>
      <label className="catalog-control catalog-range">
        <span>Max price: Rs {Number(maxPrice || max).toLocaleString('en-IN')}</span>
        <input
          type="range"
          min={1000}
          max={Math.max(max, 1000)}
          step={500}
          value={Number(maxPrice || max)}
          onChange={(event) => onMaxPrice(event.target.value)}
        />
      </label>
      <label className="catalog-check">
        <input
          type="checkbox"
          checked={availability}
          onChange={(event) => onAvailability(event.target.checked)}
        />
        In stock only
      </label>
    </div>
  );
}
