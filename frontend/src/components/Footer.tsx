import { useNavigate } from 'react-router-dom';

export function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="footer-mark-row">
            <div className="footer-mark">🪡</div>
            <div className="footer-name">CSM SILKS</div>
          </div>
          <p className="footer-desc">Pure handloom Kanjivaram silk since 1987. GI Tagged. Delivered across India.</p>
          <p className="footer-desc" style={{ marginTop: 8, fontSize: 11, color: 'rgba(249,246,240,.22)' }}>
            1987 முதல் தூய பட்டு புடவைகள்
          </p>
        </div>
        <div>
          <div className="fc-title">Women's</div>
          <div className="footer-links">
            <a onClick={() => navigate('/womens')}>Kanjivaram Silks</a>
            <a onClick={() => navigate('/womens')}>Bridal Sarees</a>
            <a onClick={() => navigate('/womens')}>Festive Collection</a>
            <a onClick={() => navigate('/womens')}>Daily Wear</a>
            <a onClick={() => navigate('/womens')}>Patola</a>
          </div>
        </div>
        <div>
          <div className="fc-title">Men's Silk</div>
          <div className="footer-links">
            <a onClick={() => navigate('/mens')}>Silk Dhotis</a>
            <a onClick={() => navigate('/mens')}>Veshtis</a>
            <a onClick={() => navigate('/mens')}>Silk Shirts</a>
            <a onClick={() => navigate('/mens')}>Wedding Sets</a>
            <a onClick={() => navigate('/mens')}>Panchakacham</a>
          </div>
        </div>
        <div>
          <div className="fc-title">My Account</div>
          <div className="footer-links">
            <a onClick={() => navigate('/orders')}>My Orders</a>
            <a onClick={() => navigate('/account')}>Loyalty Points</a>
            <a onClick={() => navigate('/wishlist')}>My Wishlist</a>
            <a onClick={() => navigate('/cart')}>Cart</a>
          </div>
        </div>
        <div>
          <div className="fc-title">Contact</div>
          <div className="footer-links">
            <a href="tel:+919876543210">📞 +91 98765 43210</a>
            <a href="https://wa.me/919876543210" target="_blank">💬 WhatsApp</a>
            <a>📍 Kanchipuram, TN</a>
            <a>🚚 Pan-India Ship</a>
            <a>📄 GST Invoice</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-copy">© 2025 CSM Silks · Kanchipuram Heritage · csmsilks.com</div>
        <div className="footer-built">Built with BuildVerse AI · 🪡</div>
      </div>
    </footer>
  );
}
