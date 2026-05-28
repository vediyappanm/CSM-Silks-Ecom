import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';

export function TryOn() {
  const navigate = useNavigate();
  const { addToCart, showToast } = useApp();
  const [skin, setSkin] = useState('');
  const [body, setBody] = useState('');
  const [drape, setDrape] = useState('');
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setGenerated(true);
    }, 1800);
  };

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', padding: '28px 4vw' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink)' }}>←</button>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--ink)' }}>✨ AI Virtual Try-On</h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ background: 'var(--ink)', borderRadius: 18, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>1. SELECT SKIN TONE</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Fair', color: '#F5D5B8' },
                  { label: 'Wheatish', color: '#D4A574' },
                  { label: 'Medium', color: '#C17F4A' },
                  { label: 'Dusky', color: '#8B5A2B' },
                  { label: 'Deep', color: '#5C3317' },
                ].map(s => (
                  <div key={s.label} onClick={() => setSkin(s.label)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', background: s.color,
                      border: `2px solid ${skin === s.label ? 'var(--gold)' : 'transparent'}`,
                      transition: 'all .15s'
                    }} />
                    <span style={{ fontSize: 9, color: 'var(--muted)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--ink)', borderRadius: 18, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>2. BODY TYPE</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Petite', 'Regular', 'Tall', 'Plus'].map(b => (
                  <div
                    key={b}
                    onClick={() => setBody(b)}
                    style={{
                      padding: '8px 16px', borderRadius: 9,
                      border: `1px solid ${body === b ? 'var(--gold)' : 'rgba(255,255,255,.1)'}`,
                      background: body === b ? 'rgba(196,146,58,.12)' : 'rgba(255,255,255,.05)',
                      color: body === b ? 'var(--gold2)' : 'var(--muted)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .14s'
                    }}
                  >
                    {b}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--ink)', borderRadius: 18, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>3. DRAPING STYLE</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {['Nivi', 'Bengali', 'Gujarati', 'Coorgi', 'Nauvari', 'Kasavu', 'Madisar', 'Mumtaz'].map(d => (
                  <div
                    key={d}
                    onClick={() => setDrape(d)}
                    style={{
                      padding: '6px 12px', borderRadius: 100,
                      border: `1px solid ${drape === d ? 'var(--gold)' : 'rgba(255,255,255,.1)'}`,
                      background: drape === d ? 'rgba(196,146,58,.12)' : 'rgba(255,255,255,.04)',
                      color: drape === d ? 'var(--gold2)' : 'var(--muted)',
                      fontSize: 11, cursor: 'pointer', transition: 'all .14s'
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                width: '100%', padding: 14,
                background: 'linear-gradient(135deg,var(--gold),var(--gold2))',
                color: '#000', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '⏳ AI is styling…' : '✨ Generate My Look'}
            </button>
          </div>
          <div>
            {!generated ? (
              <div id="tryonResult" style={{
                background: 'var(--ink)', borderRadius: 18, padding: 24,
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center'
              }}>
                <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }}>✨</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>
                  Select your options
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Choose skin tone, body type and draping style, then click Generate
                </div>
              </div>
            ) : (
              <div style={{
                background: 'var(--ink)', borderRadius: 18, padding: 24,
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center'
              }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                    AI CONFIDENCE SCORE
                  </div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 60, fontWeight: 800, color: 'var(--gold2)', lineHeight: 1 }}>
                    94<span style={{ fontSize: 28 }}>%</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Excellent Match</div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(196,146,58,.2)',
                  borderRadius: 12, padding: 16, marginBottom: 14, textAlign: 'left', width: '100%'
                }}>
                  <div style={{
                    fontFamily: 'var(--acc)', fontSize: 14, fontStyle: 'italic',
                    color: 'var(--muted)', lineHeight: 1.7, borderLeft: '2px solid var(--gold)',
                    paddingLeft: 12, marginBottom: 14
                  }}>
                    "This vibrant combination beautifully illuminates your {skin || 'Wheatish'} complexion and will be the centrepiece of any celebration."
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 2 }}>
                      DRAPING TIP
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      For {body || 'Regular'} frame, {drape || 'Nivi'} style — fold pleats 5" wide and pin at shoulder 2" from neckline
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 2 }}>
                      BLOUSE SUGGESTION
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      Gold silk blouse, sweetheart neckline, ¾ sleeves
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 2 }}>
                      JEWELLERY
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Temple gold jhumkas + layered gold necklace + bangles
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button
                    onClick={() => navigate('/womens')}
                    style={{
                      flex: 1, padding: 11, background: 'rgba(196,146,58,.1)',
                      border: '1px solid rgba(196,146,58,.22)', borderRadius: 10,
                      fontSize: 12, fontWeight: 700, color: 'var(--gold)', cursor: 'pointer'
                    }}
                  >
                    Browse Sarees
                  </button>
                  <button
                    onClick={() => { addToCart({ id: 1, name: 'Royal Kanjivaram Gold Zari', price: 12999, mrp: 15999, badge: 'pb-hot', ['badge-text']: '⭐ Bestseller', emoji: '🪡', bg: 'linear-gradient(145deg,#2A1808,#8A4A18,#C4923A)', hook: 'The crown jewel of every bridal trousseau', colors: ['#C4923A'], gender: 'women', tags: ['kanjivaram'], cat: 'Kanjivaram' }); }}
                    style={{
                      flex: 1.5, padding: 11, background: 'linear-gradient(135deg,var(--gold),var(--gold2))',
                      color: '#000', border: 'none', borderRadius: 10,
                      fontSize: 12, fontWeight: 800, cursor: 'pointer'
                    }}
                  >
                    🛒 Add Suggested
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
