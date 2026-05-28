import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_PRODUCTS } from '@/lib/data';
import { ProductCard } from '@/components/ProductCard';

export function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const results = query.trim() === ''
    ? ALL_PRODUCTS
    : ALL_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.cat.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
      );

  const chips = [
    { label: '🪡 Kanjivaram', value: 'Kanjivaram' },
    { label: '💍 Bridal', value: 'Bridal' },
    { label: '👔 Men\'s Silk', value: 'Men' },
    { label: '🎉 Festive', value: 'Festive' },
    { label: '🕌 Dhoti', value: 'Dhoti' },
    { label: '🌿 Daily', value: 'Daily' },
  ];

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', padding: '28px 4vw' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink)' }}>←</button>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>Search</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search sarees, silk shirts, dhotis…"
            style={{
              flex: 1, padding: '13px 16px', background: 'var(--ncream)', border: '1px solid var(--dcream)',
              borderRadius: 10, fontFamily: 'var(--body)', fontSize: 14, color: 'var(--ink)', outline: 'none'
            }}
          />
          <button
            onClick={() => {}}
            style={{ padding: '13px 20px', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Search
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {chips.map((chip, i) => (
            <span
              key={i}
              onClick={() => setQuery(chip.value)}
              style={{
                padding: '6px 14px', borderRadius: 100, border: '1px solid var(--gb)',
                background: 'var(--gd)', fontSize: 11, fontWeight: 600, color: 'var(--gold)', cursor: 'pointer'
              }}
            >
              {chip.label}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(13,11,8,.35)', marginBottom: 14 }}>
          {query.trim() ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"` : `All Products (${results.length})`}
        </div>
        <div className="pg">
          {results.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
