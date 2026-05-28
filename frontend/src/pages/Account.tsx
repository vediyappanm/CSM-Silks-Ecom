import { useState } from 'react';
import { useApp } from '@/store/AppContext';

export function Account() {
  const { showToast } = useApp();
  const [tab, setTab] = useState('loyalty');

  const rewards = [
    { ic: '🏷️', bg: 'rc-gold', name: '₹200 Off Coupon', desc: 'Next order discount', pts: '2,000' },
    { ic: '✂️', bg: 'rc-grn', name: 'Free Blouse Stitching', desc: 'Expert tailoring included', pts: '1,500' },
    { ic: '📸', bg: 'rc-gold', name: 'Studio Photoshoot', desc: '30-min Kanchipuram session', pts: '5,000' },
    { ic: '🚚', bg: 'rc-grn', name: 'Priority Shipping', desc: 'Next-day delivery', pts: '800' },
  ];

  return (
    <div className="account-page">
      <div className="account-layout">
        <div className="account-sidebar">
          <div className="account-profile-card">
            <div className="apc-avatar">P</div>
            <div className="apc-name">Priya Venkataraman</div>
            <div className="apc-email">priya@email.com</div>
            <div className="apc-tier">★ PLATINUM MEMBER</div>
          </div>
          <div className="account-nav">
            <div className={`an-item ${tab === 'loyalty' ? 'on' : ''}`} onClick={() => setTab('loyalty')}>
              <span className="an-ic">🏅</span>Loyalty & Points
            </div>
            <div className="an-item" onClick={() => window.location.href = '/orders'}>
              <span className="an-ic">📦</span>My Orders
            </div>
            <div className="an-item" onClick={() => window.location.href = '/wishlist'}>
              <span className="an-ic">♡</span>Wishlist
            </div>
            <div className={`an-item ${tab === 'profile' ? 'on' : ''}`} onClick={() => setTab('profile')}>
              <span className="an-ic">👤</span>Profile
            </div>
            <div className={`an-item ${tab === 'addresses' ? 'on' : ''}`} onClick={() => setTab('addresses')}>
              <span className="an-ic">📍</span>Addresses
            </div>
            <div className={`an-item ${tab === 'settings' ? 'on' : ''}`} onClick={() => setTab('settings')}>
              <span className="an-ic">⚙️</span>Settings
            </div>
          </div>
        </div>

        <div>
          {tab === 'loyalty' && (
            <>
              <div className="loyalty-card">
                <div className="lc-tier">★ PLATINUM MEMBER</div>
                <div className="lc-name">Priya Venkataraman</div>
                <div className="lc-pts-row"><div className="lc-pts">4,820</div><div className="lc-pts-lbl">points</div></div>
                <div className="lc-worth">≈ ₹482 discount value</div>
                <div className="lc-prog-labels"><span>Platinum</span><span>Elite — 1,180 pts away</span></div>
                <div className="lc-prog"><div className="lc-prog-fill" style={{ width: '68%' }} /></div>
                <div className="lc-perks">
                  <div className="lc-perk"><div className="lc-perk-ic">🚚</div><div className="lc-perk-name">Free Ship</div><div className="lc-perk-val">Always</div></div>
                  <div className="lc-perk"><div className="lc-perk-ic">💰</div><div className="lc-perk-name">Cashback</div><div className="lc-perk-val">5%</div></div>
                  <div className="lc-perk"><div className="lc-perk-ic">🎀</div><div className="lc-perk-name">Birthday</div><div className="lc-perk-val">Gift</div></div>
                  <div className="lc-perk"><div className="lc-perk-ic">🔔</div><div className="lc-perk-name">Early</div><div className="lc-perk-val">Access</div></div>
                </div>
              </div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Redeem Rewards</h3>
              <div className="rewards-grid">
                {rewards.map((r, i) => (
                  <div key={i} className="reward-card">
                    <div className={`rc-icon ${r.bg}`}>{r.ic}</div>
                    <div>
                      <div className="rc-name">{r.name}</div>
                      <div className="rc-desc">{r.desc}</div>
                    </div>
                    <div className="rc-right">
                      <div className="rc-pts">{r.pts}</div>
                      <div className="rc-pts-lbl">points</div>
                      <a className="rc-btn" onClick={() => showToast('🎁', 'Reward Redeemed!', `${r.name} applied to your account`)}>Redeem</a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'profile' && (
            <div style={{ background: 'white', border: '1px solid var(--dcream)', borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 18 }}>Edit Profile</h3>
              <div className="form-row">
                <div className="form-field">
                  <label>First Name</label>
                  <input style={inputStyle} defaultValue="Priya" />
                </div>
                <div className="form-field">
                  <label>Last Name</label>
                  <input style={inputStyle} defaultValue="Venkataraman" />
                </div>
              </div>
              <div className="form-field">
                <label>Phone</label>
                <input style={inputStyle} defaultValue="+91 98765 43210" />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input style={inputStyle} defaultValue="priya@email.com" type="email" />
              </div>
              <button
                onClick={() => showToast('✅', 'Profile Saved!', 'Your profile has been updated')}
                style={{ padding: '11px 24px', background: 'linear-gradient(135deg,var(--gold),var(--gold2))', color: '#000', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, marginTop: 8, cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          )}
          {(tab === 'addresses' || tab === 'settings') && (
            <div style={{ background: 'white', border: '1px solid var(--dcream)', borderRadius: 14, padding: 22, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>Coming Soon</div>
              <div style={{ fontSize: 13, color: 'rgba(13,11,8,.4)', marginTop: 6 }}>This section is under development</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--ncream)', border: '1px solid var(--dcream)',
  borderRadius: 8, padding: '10px 12px', fontFamily: 'var(--body)', fontSize: 13,
  color: 'var(--ink)', outline: 'none'
};
