import { FileText, MapPin, MessageCircle, Phone, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '@/ui/components';

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <BrandMark />
          <p className="footer-desc">
            Single-brand textile commerce for CSM Silks. Pure Kanjivaram sarees, men's silk wear,
            verified inventory, GST billing, and assisted WhatsApp ordering.
          </p>
        </div>
        <div>
          <div className="fc-title">Women</div>
          <div className="footer-links">
            <button onClick={() => navigate('/womens')}>Kanjivaram silks</button>
            <button onClick={() => navigate('/womens')}>Bridal sarees</button>
            <button onClick={() => navigate('/womens')}>Festive collection</button>
            <button onClick={() => navigate('/womens')}>Daily silk</button>
          </div>
        </div>
        <div>
          <div className="fc-title">Men</div>
          <div className="footer-links">
            <button onClick={() => navigate('/mens')}>Silk dhotis</button>
            <button onClick={() => navigate('/mens')}>Veshtis</button>
            <button onClick={() => navigate('/mens')}>Silk shirts</button>
            <button onClick={() => navigate('/mens')}>Wedding sets</button>
          </div>
        </div>
        <div>
          <div className="fc-title">Account</div>
          <div className="footer-links">
            <button onClick={() => navigate('/orders')}>My orders</button>
            <button onClick={() => navigate('/account')}>Loyalty points</button>
            <button onClick={() => navigate('/wishlist')}>Wishlist</button>
            <button onClick={() => navigate('/cart')}>Cart</button>
          </div>
        </div>
        <div>
          <div className="fc-title">Contact</div>
          <div className="footer-contact">
            <a href="tel:+919876543210"><Phone size={15} /> +91 98765 43210</a>
            <a href="https://wa.me/919876543210" target="_blank"><MessageCircle size={15} /> WhatsApp</a>
            <span><MapPin size={15} /> Kanchipuram, TN</span>
            <span><Truck size={15} /> Pan-India ship</span>
            <span><FileText size={15} /> GST invoice</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-copy">2026 CSM Silks. Kanchipuram heritage textile retailer.</div>
        <div className="footer-built">Django API + React commerce UI</div>
      </div>
    </footer>
  );
}
