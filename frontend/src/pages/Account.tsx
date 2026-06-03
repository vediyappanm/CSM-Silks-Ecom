import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useApp } from '@/store/AppContext';
import { CustomerAuth } from '@/pages/CustomerAuth';
import type { LoyaltyReward } from '@/types';

export function Account() {
  const { showToast, user, isAuthed, refreshSession, logout } = useApp();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!isAuthed) return;
    void Promise.resolve()
      .then(() => {
        setRewardsLoading(true);
        return api.loyalty.rewards();
      })
      .then(setRewards)
      .catch(() => setRewards([]))
      .finally(() => setRewardsLoading(false));
  }, [isAuthed]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.auth.updateMe({
        full_name: profileForm.full_name.trim(),
        email: profileForm.email.trim() || undefined,
      });
      await refreshSession();
      setEditingProfile(false);
      showToast('OK', 'Profile updated', 'Your account details are saved');
    } catch (err) {
      showToast('!', 'Profile update failed', err instanceof Error ? err.message : 'Unable to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const redeemReward = async (reward: LoyaltyReward) => {
    setRedeemingId(reward.id);
    try {
      await api.loyalty.redeem(reward.id);
      await refreshSession();
      showToast('OK', 'Reward redeemed', `${reward.name} has been added to your account`);
    } catch (err) {
      showToast('!', 'Redeem failed', err instanceof Error ? err.message : 'Unable to redeem reward');
    } finally {
      setRedeemingId(null);
    }
  };

  if (!isAuthed) {
    return <CustomerAuth initialMode="login" />;
  }

  return (
    <div className="account-page">
      <div className="account-layout">
        <div className="account-sidebar">
          <div className="account-profile-card">
            <div className="apc-avatar">{(user?.name || user?.phone || 'C').slice(0, 1).toUpperCase()}</div>
            <div className="apc-name">{user?.name || user?.full_name || 'CSM Customer'}</div>
            <div className="apc-email">{user?.email || user?.phone}</div>
            <div className="apc-tier">{(user?.loyalty_tier || 'bronze').toUpperCase()} MEMBER</div>
            <button
              className="account-edit-btn"
              type="button"
              onClick={() => {
                if (!editingProfile) {
                  setProfileForm({
                    full_name: user?.full_name || user?.name || '',
                    email: user?.email || '',
                  });
                }
                setEditingProfile(value => !value);
              }}
            >
              {editingProfile ? 'Close' : 'Edit profile'}
            </button>
          </div>
          <div className="account-nav">
            <div className="an-item on"><span className="an-ic">Pts</span>Loyalty & Points</div>
            <div className="an-item" onClick={() => navigate('/orders')}><span className="an-ic">Box</span>My Orders</div>
            <div className="an-item" onClick={() => navigate('/wishlist')}><span className="an-ic">Wish</span>Wishlist</div>
            <div className="an-item" onClick={() => void logout()}><span className="an-ic">Exit</span>Logout</div>
          </div>
        </div>

        <div>
          {editingProfile && (
            <div className="profile-edit-card">
              <h2>Edit profile</h2>
              <div className="form-row">
                <div className="form-field">
                  <label>Full name</label>
                  <input value={profileForm.full_name} onChange={event => setProfileForm(prev => ({ ...prev, full_name: event.target.value }))} placeholder="Your name" />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input value={profileForm.email} onChange={event => setProfileForm(prev => ({ ...prev, email: event.target.value }))} placeholder="you@example.com" type="email" />
                </div>
              </div>
              <button className="btn btn-gold" type="button" onClick={() => void saveProfile()} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          )}

          <div className="loyalty-card">
            <div className="lc-tier">{(user?.loyalty_tier || 'bronze').toUpperCase()} MEMBER</div>
            <div className="lc-name">{user?.name || user?.full_name || 'CSM Customer'}</div>
            <div className="lc-pts-row"><div className="lc-pts">{user?.loyalty_points || 0}</div><div className="lc-pts-lbl">points</div></div>
            <div className="lc-worth">1 point = Rs 1 checkout discount</div>
            <div className="lc-prog-labels"><span>Bronze</span><span>Elite benefits unlock with repeat orders</span></div>
            <div className="lc-prog"><div className="lc-prog-fill" style={{ width: '28%' }} /></div>
          </div>

          <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Redeem Rewards</h3>
          {rewardsLoading ? (
            <div className="rewards-grid">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="reward-skeleton" />)}
            </div>
          ) : rewards.length === 0 ? (
            <div className="reward-empty">No active rewards are available right now.</div>
          ) : (
            <div className="rewards-grid">
              {rewards.map((r) => {
                const disabled = (user?.loyalty_points || 0) < r.points_required || redeemingId === r.id;
                return (
                  <div key={r.id} className="reward-card">
                    <div className="rc-icon rc-gold">CSM</div>
                    <div>
                      <div className="rc-name">{r.name}</div>
                      <div className="rc-desc">{r.description}</div>
                    </div>
                    <div className="rc-right">
                      <div className="rc-pts">{Number(r.points_required).toLocaleString('en-IN')}</div>
                      <div className="rc-pts-lbl">points</div>
                      <button className="rc-btn" type="button" disabled={disabled} onClick={() => void redeemReward(r)}>
                        {redeemingId === r.id ? 'Redeeming...' : 'Redeem'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
