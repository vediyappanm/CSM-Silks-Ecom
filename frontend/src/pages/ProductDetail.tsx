import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ALL_PRODUCTS, WOMENS, MENS } from '@/lib/data';
import { useApp } from '@/store/AppContext';

export function ProductDetail() {
  const { gender, id } = useParams<{ gender: string; id: string }>();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedThumb, setSelectedThumb] = useState(0);

  const product = ALL_PRODUCTS.find(p => p.id === Number(id));

  if (!product) {
    return (
      <div className="pd-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🪡</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)' }}>Product not found</h2>
          <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  const p = product;
  const disc = Math.round((1 - p.price / p.mrp) * 100);
  const thumbBgs = [
    p.bg,
    'linear-gradient(145deg,#2A1808,#C4923A)',
    'linear-gradient(145deg,#0A0818,#3A1A8A)',
    'linear-gradient(145deg,#040A18,#1A4A2A)',
  ];
  const attrs = p.gender === 'men'
    ? [['Material', 'Pure Kanjivaram Silk'], ['Zari', 'Real Gold Zari'], ['Size', 'S to 5XL'], ['Care', 'Dry Clean Only']]
    : [['Fabric', 'Pure Kanjivaram Silk'], ['Zari', 'Real Gold Zari'], ['Occasion', 'Bridal / Festive'], ['Blouse Piece', 'Included ✓']];

  const inWish = isInWishlist(p.id);

  const handleAddToCart = () => {
    addToCart(p);
  };

  const handleBuyNow = () => {
    addToCart(p);
    navigate('/cart');
  };

  return (
    <div className="pd-page">
      <div className="pd-grid">
        {/* Gallery */}
        <div className="pd-gallery">
          <div className="pd-main-img" style={{ background: thumbBgs[selectedThumb] }}>
            <div style={{ fontSize: 120, position: 'relative', zIndex: 2, filter: 'drop-shadow(0 16px 40px rgba(0,0,0,.4))' }}>
              {p.emoji}
            </div>
          </div>
          <div className="pd-thumbs">
            {thumbBgs.map((bg, i) => (
              <div
                key={i}
                className={`pd-thumb ${i === selectedThumb ? 'on' : ''}`}
                style={{ background: bg }}
                onClick={() => setSelectedThumb(i)}
              >
                {p.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="pd-info">
          <div className="pd-breadcrumb" onClick={() => navigate(p.gender === 'men' ? '/mens' : '/womens')}>
            ← {p.gender === 'men' ? "Men's Silk" : "Women's Sarees"} <span>›</span> {p.cat}
          </div>
          <div className="pd-badges">
            <span className="pd-badge pdb-gold">{p.cat}</span>
            <span className="pd-badge pdb-grn">In Stock ✓</span>
            <span className="pd-badge pdb-blu">GI Tagged</span>
          </div>
          <h1 className="pd-title">{p.name}</h1>
          <div className="pd-price-row">
            <div className="pd-price">₹{p.price.toLocaleString('en-IN')}</div>
            <div className="pd-mrp">₹{p.mrp.toLocaleString('en-IN')}</div>
            <div className="pd-off">{disc}% OFF</div>
          </div>
          <div className="pd-rating">
            <span className="pd-stars">★★★★★</span>
            <span>4.9 · 184 reviews</span>
          </div>
          <div className="pd-section-lbl">Product Details</div>
          <div className="pd-attrs">
            {attrs.map(([l, v]) => (
              <div key={l} className="pd-attr">
                <div className="pda-l">{l}</div>
                <div className="pda-v">{v}</div>
              </div>
            ))}
          </div>
          <div className="pd-section-lbl">Select Colour</div>
          <div className="pd-colors">
            {p.colors.map((c, i) => (
              <div
                key={i}
                className={`pd-color ${i === selectedColor ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => setSelectedColor(i)}
              />
            ))}
          </div>
          <div className="pd-cta-row">
            <button className="pd-btn-wish" onClick={() => toggleWishlist(p)}>
              {inWish ? '♥' : '♡'}
            </button>
            <button className="pd-btn-try" onClick={() => navigate('/tryon')}>
              ✨ {p.gender === 'men' ? 'View on Model' : 'AI Try-On'}
            </button>
            <button className="pd-btn-cart" onClick={handleAddToCart}>
              🛒 Add to Cart
            </button>
          </div>
          <button className="pd-btn-buy" onClick={handleBuyNow}>
            Buy Now — ₹{p.price.toLocaleString('en-IN')}
          </button>
          <div className="pd-guarantee">
            <div className="pd-g">✓ Free {p.gender === 'men' ? 'matching piece' : 'blouse'} included</div>
            <div className="pd-g">✓ 15-day easy returns</div>
            <div className="pd-g">✓ Free pan-India shipping</div>
            <div className="pd-g">✓ GST invoice provided</div>
            <div className="pd-g">✓ 100% authentic GI tagged</div>
          </div>
        </div>
      </div>
    </div>
  );
}
