import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useApp } from '@/store/AppContext';

export function Account() {
  const { showToast, user, isAuthed, refreshSession, logout } = useApp();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('+918888888888');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const sendOtp = async () => {
    const res = await api.auth.sendOtp(phone);
    setDevOtp(res.dev_otp || '');
    showToast('OK', 'OTP sent', res.dev_otp ? `Dev OTP: ${res.dev_otp}` : 'Check your phone');
  };

  const verifyOtp = async () => {
    await api.auth.verifyOtp(phone, otp);
    await refreshSession();
    showToast('OK', 'Signed in', 'Your CSM Silks account is ready');
  };

  if (!isAuthed) {
    return (
      <div className="account-page">
        <div style={{ maxWidth: 460, margin: '0 auto', background: 'white', border: '1px solid var(--dcream)', borderRadius: 14, padding: 24 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', marginBottom: 8 }}>Sign in with OTP</h1>
          <p style={{ color: 'rgba(13,11,8,.55)', fontSize: 13, marginBottom: 18 }}>Use the seeded customer phone or your own number in development.</p>
          <div className="form-field">
            <label>Phone</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <button className="btn btn-gold" onClick={() => void sendOtp()}>Send OTP</button>
          {devOtp && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink)' }}>Dev OTP: {devOtp}</div>}
          <div className="form-field" style={{ marginTop: 16 }}>
            <label>OTP</label>
            <input style={inputStyle} value={otp} onChange={e => setOtp(e.target.value)} />
          </div>
          <button className="btn btn-gold" onClick={() => void verifyOtp()}>Verify and Continue</button>
        </div>
      </div>
    );
  }

  const rewards = [
    { name: 'Rs 200 Off Coupon', desc: 'Next order discount', pts: '2,000' },
    { name: 'Free Blouse Stitching', desc: 'Expert tailoring included', pts: '1,500' },
    { name: 'Studio Photoshoot', desc: '30-min Kanchipuram session', pts: '5,000' },
    { name: 'Priority Shipping', desc: 'Next-day dispatch', pts: '800' },
  ];

  return (
    <div className="account-page">
      <div className="account-layout">
        <div className="account-sidebar">
          <div className="account-profile-card">
            <div className="apc-avatar">{(user?.name || user?.phone || 'C').slice(0, 1).toUpperCase()}</div>
            <div className="apc-name">{user?.name || user?.full_name || 'CSM Customer'}</div>
            <div className="apc-email">{user?.email || user?.phone}</div>
            <div className="apc-tier">{(user?.loyalty_tier || 'bronze').toUpperCase()} MEMBER</div>
          </div>
          <div className="account-nav">
            <div className="an-item on"><span className="an-ic">Pts</span>Loyalty & Points</div>
            <div className="an-item" onClick={() => navigate('/orders')}><span className="an-ic">Box</span>My Orders</div>
            <div className="an-item" onClick={() => navigate('/wishlist')}><span className="an-ic">Wish</span>Wishlist</div>
            <div className="an-item" onClick={() => void logout()}><span className="an-ic">Exit</span>Logout</div>
          </div>
        </div>

        <div>
          <div className="loyalty-card">
            <div className="lc-tier">{(user?.loyalty_tier || 'bronze').toUpperCase()} MEMBER</div>
            <div className="lc-name">{user?.name || user?.full_name || 'CSM Customer'}</div>
            <div className="lc-pts-row"><div className="lc-pts">{user?.loyalty_points || 0}</div><div className="lc-pts-lbl">points</div></div>
            <div className="lc-worth">1 point = Rs 1 checkout discount</div>
            <div className="lc-prog-labels"><span>Bronze</span><span>Elite benefits unlock with repeat orders</span></div>
            <div className="lc-prog"><div className="lc-prog-fill" style={{ width: '28%' }} /></div>
          </div>

          <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Redeem Rewards</h3>
          <div className="rewards-grid">
            {rewards.map((r, i) => (
              <div key={i} className="reward-card">
                <div className="rc-icon rc-gold">CSM</div>
                <div>
                  <div className="rc-name">{r.name}</div>
                  <div className="rc-desc">{r.desc}</div>
                </div>
                <div className="rc-right">
                  <div className="rc-pts">{r.pts}</div>
                  <div className="rc-pts-lbl">points</div>
                  <a className="rc-btn" onClick={() => showToast('OK', 'Reward Redeemed', `${r.name} applied to your account`)}>Redeem</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--ncream)',
  border: '1px solid var(--dcream)',
  borderRadius: 8,
  padding: '10px 12px',
  fontFamily: 'var(--body)',
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
};
