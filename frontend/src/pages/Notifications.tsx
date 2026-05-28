import { useNavigate } from 'react-router-dom';

export function Notifications() {
  const navigate = useNavigate();

  const notifs = [
    { icon: '🚚', bg: 'rgba(26,74,138,.1)', title: 'Your saree is on the way!', desc: 'Royal Kanjivaram Gold Zari · ETA Tomorrow by 7 PM', time: '2 hours ago' },
    { icon: '🏅', bg: 'rgba(196,146,58,.1)', title: 'You earned 650 loyalty points!', desc: 'Balance: 4,820 pts ≈ ₹482 discount value', time: '5 hours ago' },
    { icon: '🎉', bg: 'rgba(122,30,30,.1)', title: 'Flash Sale — 10% off 8 sarees!', desc: 'Tussar Natural Gold now ₹3,869. Ends in 24 hours!', time: '6 hours ago' },
    { icon: '✅', bg: 'rgba(26,122,74,.1)', title: 'Order #CSM-2831 Delivered!', desc: 'Champagne Bridal Kanjivaram. Rate your experience →', time: '2 days ago' },
    { icon: '💬', bg: 'rgba(37,211,102,.1)', title: 'New collection just dropped ✦', desc: '12 new Kanjivaram sarees added. Early access for Platinum members!', time: '3 days ago' },
    { icon: '👔', bg: 'rgba(196,146,58,.1)', title: "Men's Silk Collection is live!", desc: 'Pure silk dhotis, veshtis and shirts — shop the new collection', time: '5 days ago' },
  ];

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', padding: '28px 4vw' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink)' }}>←</button>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--ink)' }}>Notifications 🔔</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifs.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, background: 'white', border: '1px solid var(--dcream)', borderRadius: 14, padding: 16 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, background: n.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0
              }}>
                {n.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(13,11,8,.45)', marginBottom: 4 }}>{n.desc}</div>
                <div style={{ fontSize: 10, color: 'rgba(13,11,8,.28)', fontFamily: 'var(--mono)' }}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
