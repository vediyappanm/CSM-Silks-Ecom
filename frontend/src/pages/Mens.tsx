import { useState, useEffect } from 'react';
import { MENS } from '@/lib/data';
import { ProductCard } from '@/components/ProductCard';

const MEN_CATS = [
  { key: 'all', label: 'All Men\'s', icon: '👔' },
  { key: 'dhoti', label: 'Silk Dhotis', icon: '🕌' },
  { key: 'veshti', label: 'Veshtis', icon: '🪭' },
  { key: 'shirt', label: 'Silk Shirts', icon: '👕' },
  { key: 'set', label: 'Wedding Sets', icon: '🎁' },
  { key: 'panch', label: 'Panchakacham', icon: '🎗️' },
];

export function Mens() {
  const [filter, setFilter] = useState<string>('all');

  const products = filter === 'all' ? MENS : MENS.filter(p => p.tags.includes(filter));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      {/* Hero Banner */}
      <div style={{
        minHeight: 340, background: 'linear-gradient(145deg,#04100A,#0A2A18,#154A2A)',
        position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '60px 4vw'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(45deg,transparent 0,transparent 18px,rgba(196,146,58,.04) 18px,rgba(196,146,58,.04) 19px)'
        }} />
        <div style={{
          position: 'absolute', top: -80, right: -60, width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(196,146,58,.12),transparent 70%)'
        }} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(196,146,58,.1)', border: '1px solid var(--gb)',
            borderRadius: 100, padding: '5px 16px', fontSize: 9, fontWeight: 700,
            letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--gold2)', marginBottom: 16
          }}>
            👔 NEW COLLECTION · புதிய சேகரிப்பு
          </div>
          <h1 style={{
            fontFamily: 'var(--display)', fontSize: 'clamp(36px,6vw,72px)', fontWeight: 800,
            color: 'var(--cream)', lineHeight: 0.96, letterSpacing: '-.5px', marginBottom: 12
          }}>
            Men's <em style={{ fontStyle: 'italic', fontWeight: 400, fontFamily: 'var(--acc)', color: 'var(--gold2)' }}>Silk Collection</em>
          </h1>
          <p style={{
            fontSize: 'clamp(13px,1.6vw,16px)', color: 'var(--muted)',
            maxWidth: 520, lineHeight: 1.7, marginBottom: 24
          }}>
            Pure Kanjivaram silk dhotis, veshtis, and shirts for the modern Indian gentleman.
            Same quality as our legendary sarees — now for him.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => document.getElementById('mens-products')?.scrollIntoView({ behavior: 'smooth' })}>
              Shop Men's Silk →
            </button>
            <a className="btn btn-wa" href="https://wa.me/919876543210?text=Hi!%20I%20am%20looking%20for%20men%27s%20silk." target="_blank">
              💬 WhatsApp to Order
            </a>
          </div>
        </div>
      </div>

      {/* Men's Categories */}
      <div style={{ background: 'var(--ink3)', borderBottom: '1px solid var(--gb)', padding: '20px 4vw', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 10, maxWidth: 1200, margin: '0 auto', flexWrap: 'wrap' }}>
          {MEN_CATS.map(cat => (
            <div
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              style={{
                padding: '10px 20px',
                background: filter === cat.key ? 'var(--gd)' : 'rgba(255,255,255,.04)',
                border: `1px solid ${filter === cat.key ? 'var(--gb)' : 'rgba(255,255,255,.08)'}`,
                borderRadius: 9, cursor: 'pointer', textAlign: 'center', flexShrink: 0
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{cat.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: filter === cat.key ? 'var(--gold2)' : 'var(--muted)' }}>
                {cat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Men's Silk */}
      <div style={{
        padding: '40px 4vw', background: 'var(--ink2)', borderBottom: '1px solid var(--gb)'
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16
        }}>
          {[
            { icon: '🏆', title: 'Pure Kanjivaram', desc: 'Same GI-tagged pure silk as our legendary sarees' },
            { icon: '✨', title: 'Real Gold Zari', desc: 'Authentic gold and silver zari borders on every piece' },
            { icon: '📏', title: 'Custom Sizes', desc: 'S to 5XL available. Custom sizing on request via WhatsApp' },
            { icon: '🎁', title: 'Matching Sets', desc: 'Coordinate with wife\'s saree — matching border sets available' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'var(--ink3)', border: '1px solid var(--gb)',
              borderRadius: 12, padding: 20, textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 700, color: 'var(--cream)', marginBottom: 5 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div id="mens-products" className="section" style={{ paddingTop: 40 }}>
        <div className="sec-header">
          <div className="sec-eyebrow">Men's Silk Collection</div>
          <h2 className="sec-h2">For the <em>Indian Gentleman</em></h2>
          <p className="sec-sub">Pure silk dhotis, veshtis & shirts — handwoven in Kanchipuram</p>
        </div>
        <div className="pg">
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
