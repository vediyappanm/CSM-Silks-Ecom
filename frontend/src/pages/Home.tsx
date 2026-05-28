import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WOMENS, MENS } from '@/lib/data';
import { ProductCard } from '@/components/ProductCard';

export function Home() {
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const initReveal = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('on');
            observerRef.current?.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );
    document.querySelectorAll('.reveal:not(.on)').forEach(el => observerRef.current?.observe(el));
  }, []);

  useEffect(() => {
    setTimeout(initReveal, 100);
    return () => observerRef.current?.disconnect();
  }, [initReveal]);

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="hero-weave" />
        <div className="hero-orb o1" />
        <div className="hero-orb o2" />
        <div className="hero-orb o3" />
        <div className="hero-content">
          <div className="hero-badge">
            <span className="bdot" />
            Pure Handloom · Kanchipuram · Since 1987
          </div>
          <h1 className="hero-h1">CSM SILKS —<br />Where Tradition Meets<br /><em>Timeless Elegance</em></h1>
          <p className="hero-tag">
            Crafted with Heritage, Worn with Pride
            <span className="hero-tag-ta">பாரம்பரியத்துடன் நெய்யப்பட்டது · பெருமையுடன் அணியப்படுகிறது</span>
          </p>
          <p className="hero-p">
            Pure Kanjivaram silk sarees and men's silk dhotis — handwoven by master weavers in Kanchipuram. GI Tagged. Free blouse on all sarees. Pan-India shipping.
          </p>
          <div className="hero-btns">
            <button className="btn btn-gold" onClick={() => navigate('/womens')}>🪡 Women's Collections</button>
            <button className="btn btn-ghost" onClick={() => navigate('/mens')}>👔 Men's Silk</button>
            <a className="btn btn-wa" href="https://wa.me/919876543210?text=Vanakkam%20CSM%20Silks!" target="_blank">💬 WhatsApp</a>
          </div>
          <div className="hero-stats">
            <div className="hs"><div className="hs-n">38</div><div className="hs-l">Years Heritage</div></div>
            <div className="hs"><div className="hs-n">200+</div><div className="hs-l">Designs</div></div>
            <div className="hs"><div className="hs-n">10K+</div><div className="hs-l">Happy Clients</div></div>
            <div className="hs"><div className="hs-n">100%</div><div className="hs-l">Pure Silk</div></div>
          </div>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="section">
        <div className="sec-header reveal">
          <div className="sec-eyebrow">Collections · சேகரிப்புகள்</div>
          <h2 className="sec-h2">Shop by <em>Collection</em></h2>
          <p className="sec-sub">From the sacred looms of Kanchipuram — curated for every occasion</p>
        </div>
        <div className="coll-grid">
          <div className="cc reveal rd1" onClick={() => navigate('/womens')}>
            <div className="cc-body cc-kj">
              <div className="cc-info">
                <span className="cc-tag">✦ Most Loved</span>
                <div className="cc-name">Kanjivaram<br />Silks</div>
                <span className="cc-name-ta">காஞ்சிபுரம் பட்டு</span>
                <div className="cc-count">48 designs</div>
              </div>
            </div>
          </div>
          <div className="cc reveal rd2" onClick={() => navigate('/womens')}>
            <div className="cc-body cc-br">
              <div className="cc-info">
                <span className="cc-tag">💍 Bridal</span>
                <div className="cc-name">Bridal<br />Sarees</div>
                <span className="cc-name-ta">திருமண பட்டு</span>
                <div className="cc-count">32 designs</div>
              </div>
            </div>
          </div>
          <div className="cc reveal rd3" onClick={() => navigate('/womens')}>
            <div className="cc-body cc-fe">
              <div className="cc-info">
                <span className="cc-tag">🎉 Festive</span>
                <div className="cc-name">Festive<br />Silk</div>
                <span className="cc-name-ta">திருவிழா பட்டு</span>
                <div className="cc-count">56 designs</div>
              </div>
            </div>
          </div>
          <div className="cc reveal rd2" onClick={() => navigate('/mens')}>
            <div className="cc-body cc-me">
              <div className="cc-info">
                <span className="cc-tag">👔 NEW</span>
                <div className="cc-name">Men's<br />Silk</div>
                <span className="cc-name-ta">ஆண்கள் பட்டு</span>
                <div className="cc-count">38 designs</div>
              </div>
            </div>
          </div>
          <div className="cc reveal rd3" onClick={() => navigate('/womens')}>
            <div className="cc-body cc-da">
              <div className="cc-info">
                <span className="cc-tag">🌸 Daily</span>
                <div className="cc-name">Daily<br />Wear</div>
                <span className="cc-name-ta">அன்றாட பட்டு</span>
                <div className="cc-count">40 designs</div>
              </div>
            </div>
          </div>
          <div className="cc reveal rd4" onClick={() => navigate('/womens')}>
            <div className="cc-body cc-pa">
              <div className="cc-info">
                <span className="cc-tag">✨ Patola</span>
                <div className="cc-name">Patola<br />Silks</div>
                <span className="cc-name-ta">பட்டோலா பட்டு</span>
                <div className="cc-count">24 designs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="section light-bg">
        <div className="sec-header reveal">
          <div className="sec-eyebrow" style={{ color: 'var(--gold)' }}>Curated Picks · தேர்ந்தெடுக்கப்பட்டவை</div>
          <h2 className="sec-h2" style={{ color: 'var(--ink)' }}>Best <em>Sellers</em></h2>
          <p className="sec-sub" style={{ color: 'rgba(13,11,8,.45)' }}>Our most loved sarees picked by brides and worn with pride across India</p>
        </div>
        <div className="pg">
          {WOMENS.slice(0, 6).map(p => (
            <div key={p.id} className="reveal">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>

      {/* MEN'S PREVIEW */}
      <section className="section" style={{ background: 'var(--ink2)', borderTop: '1px solid var(--gb)' }}>
        <div className="sec-header reveal">
          <div className="sec-eyebrow">New Arrival · புதிய வருகை</div>
          <h2 className="sec-h2">Men's <em>Silk Collection</em></h2>
          <p className="sec-sub">Pure silk dhotis, veshtis and shirts for the modern Indian gentleman</p>
        </div>
        <div className="pg">
          {MENS.slice(0, 4).map(p => (
            <div key={p.id} className="reveal rd1">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button className="btn btn-gold" onClick={() => navigate('/mens')}>View All Men's Silk →</button>
        </div>
      </section>

      {/* BRAND STORY */}
      <section className="section story-section">
        <div className="story-grid">
          <div className="reveal">
            <div className="story-frame">
              <div className="story-inner">
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                  color: 'var(--gold2)', background: 'var(--gd)', border: '1px solid var(--gb)',
                  borderRadius: 100, padding: '5px 14px', position: 'relative', zIndex: 2
                }}>✦ Kanchipuram, Tamil Nadu</div>
                <div style={{
                  fontSize: 72, filter: 'drop-shadow(0 10px 26px rgba(196,146,58,.4))',
                  position: 'relative', zIndex: 2
                }}>🪡</div>
                <div style={{
                  fontFamily: 'var(--acc)', fontSize: 16, fontStyle: 'italic',
                  color: 'rgba(249,246,240,.55)', textAlign: 'center',
                  position: 'relative', zIndex: 2, lineHeight: 1.6
                }}>
                  "Woven with the hands of our ancestors,<br />worn by the brides of tomorrow."
                </div>
              </div>
              <div className="story-badge">
                <div className="sb-n">38</div>
                <div className="sb-s">Years</div>
              </div>
            </div>
          </div>
          <div className="reveal rd2">
            <div className="sec-eyebrow" style={{ justifyContent: 'flex-start' }}>Our Heritage · எங்கள் பாரம்பரியம்</div>
            <h2 className="sec-h2" style={{ textAlign: 'left' }}>The CSM<br /><em>Story</em></h2>
            <p className="story-pull">"Crafted with Heritage,<br />Worn with <em>Pride</em>"</p>
            <p className="story-body">
              Since 1987, CSM Silks has been weaving stories of tradition from the sacred looms of Kanchipuram.
              Every saree is GI-tagged — authenticated as genuine Kanjivaram silk. We use real gold zari,
              natural silk threads, and traditional pit looms.
            </p>
            <p className="story-body">
              In 2025 we added our <strong style={{ color: 'var(--gold2)' }}>Men's Silk Collection</strong> —
              pure silk dhotis, veshtis, and shirts for the modern Indian gentleman who values tradition.
            </p>
            <div className="story-stats">
              <div className="ss-item"><div className="ss-n">10K+</div><div className="ss-l">Happy Clients</div></div>
              <div className="ss-item"><div className="ss-n">200+</div><div className="ss-l">Designs</div></div>
              <div className="ss-item"><div className="ss-n">100%</div><div className="ss-l">Pure Silk</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section contact-section">
        <div className="sec-header reveal">
          <div className="sec-eyebrow">Order Now · ஆர்டர் செய்யுங்கள்</div>
          <h2 className="sec-h2">Get Your <em>Dream Saree</em></h2>
          <p className="sec-sub">WhatsApp us for personalised saree advice and quick order placement</p>
        </div>
        <div className="contact-grid">
          <div className="reveal">
            <div className="cwa-card">
              <div className="cwa-row">
                <div className="cwa-ic">💬</div>
                <div>
                  <div className="cwa-title">WHATSAPP ORDER</div>
                  <div className="cwa-sub">Fastest way · வேகமான வழி</div>
                </div>
              </div>
              <span className="cwa-num">+91 98765 43210</span>
              <a className="cwa-btn" href="https://wa.me/919876543210?text=Vanakkam%20CSM%20Silks!%20I%20am%20looking%20for%20a%20saree." target="_blank">
                💬 Chat on WhatsApp — Free Advice
              </a>
            </div>
            <div className="cd"><div className="cd-ic">📍</div><div><div className="cd-l">Location</div><div className="cd-v">Kanchipuram, Tamil Nadu</div></div></div>
            <div className="cd"><div className="cd-ic">🚚</div><div><div className="cd-l">Shipping</div><div className="cd-v">Pan-India · 3-5 Business Days</div></div></div>
            <div className="cd"><div className="cd-ic">🔄</div><div><div className="cd-l">Returns</div><div className="cd-v">15-Day Easy Returns</div></div></div>
            <div className="cd"><div className="cd-ic">📄</div><div><div className="cd-l">Invoice</div><div className="cd-v">GST Invoice · HSN 5007</div></div></div>
          </div>
          <div className="reveal rd2">
            <div className="cf-title">ENQUIRE NOW</div>
            <p className="cf-sub">Tell us what you need — we'll find the perfect piece.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const name = (document.getElementById('hc-name') as HTMLInputElement)?.value || '';
              const phone = (document.getElementById('hc-phone') as HTMLInputElement)?.value || '';
              const type = (document.getElementById('hc-type') as HTMLSelectElement)?.value || '';
              const budget = (document.getElementById('hc-budget') as HTMLSelectElement)?.value || '';
              const msg = encodeURIComponent(
                `Vanakkam CSM Silks! 🪡\n\nName: ${name}\nPhone: ${phone}\nLooking for: ${type}\nBudget: ${budget}\n\nPlease help me find the perfect piece!`
              );
              window.open(`https://wa.me/919876543210?text=${msg}`, '_blank');
            }}>
              <label className="cf-lbl">Your Name *</label>
              <input className="cf-input" id="hc-name" placeholder="Priya / ராஜ்" required />
              <label className="cf-lbl">WhatsApp *</label>
              <input className="cf-input" id="hc-phone" placeholder="+91 98765 43210" required />
              <label className="cf-lbl">Looking For</label>
              <select className="cf-select" id="hc-type">
                <option value="">Select…</option>
                <option>Bridal Saree</option>
                <option>Festive Saree</option>
                <option>Men's Silk Dhoti</option>
                <option>Men's Veshti</option>
                <option>Men's Silk Shirt</option>
                <option>Daily Wear Silk</option>
                <option>Gift</option>
              </select>
              <label className="cf-lbl">Budget Range</label>
              <select className="cf-select" id="hc-budget">
                <option>Under ₹5,000</option>
                <option>₹5,000 – ₹10,000</option>
                <option>₹10,000 – ₹20,000</option>
                <option>₹20,000 – ₹50,000</option>
                <option>Above ₹50,000</option>
              </select>
              <button type="submit" className="cf-submit">🪡 Send Enquiry via WhatsApp</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
