import { useState, useEffect } from 'react';
import { WOMENS } from '@/lib/data';
import { ProductCard } from '@/components/ProductCard';

const CATS = ['all', 'kanjivaram', 'bridal', 'festive', 'patola', 'daily', 'mysore', 'banarasi'] as const;

export function Womens() {
  const [filter, setFilter] = useState<string>('all');

  const products = filter === 'all' ? WOMENS : WOMENS.filter(p => p.tags.includes(filter));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      <div style={{ background: 'var(--ink2)', borderBottom: '1px solid var(--gb)', padding: '28px 4vw' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
            Women's Collection · பெண்கள் சேகரிப்பு
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 800, color: 'var(--cream)', letterSpacing: '-.3px' }}>
            Pure Silk <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--gold2)', fontFamily: 'var(--acc)' }}>Sarees</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>200+ handwoven designs · Free blouse included · GI Tagged</p>
        </div>
      </div>

      <div style={{ padding: '16px 4vw', background: 'var(--ink3)', borderBottom: '1px solid var(--gb)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, maxWidth: 1200, margin: '0 auto', whiteSpace: 'nowrap' }}>
          {CATS.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: `1px solid ${filter === c ? 'var(--gold)' : 'rgba(255,255,255,.1)'}`,
                background: filter === c ? 'var(--gd)' : 'rgba(255,255,255,.04)',
                color: filter === c ? 'var(--gold2)' : 'var(--muted)',
                fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all .14s'
              }}
            >
              {c === 'all' ? 'All Sarees' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="section" style={{ paddingTop: 40 }}>
        <div className="pg">
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
