import { FileText, MapPin, MessageCircle, Phone, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '@/ui/components';
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL, STORE_WHATSAPP_URL } from '@/lib/storeContact';

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
            <button onClick={() => navigate('/womens?category=bridal')}>Bridal sarees</button>
            <button onClick={() => navigate('/womens?category=festive')}>Festive collection</button>
            <button onClick={() => navigate('/womens?category=daily')}>Daily silk</button>
          </div>
        </div>
        <div>
          <div className="fc-title">Men</div>
          <div className="footer-links">
            <button onClick={() => navigate('/mens?category=dhoti')}>Silk dhotis</button>
            <button onClick={() => navigate('/mens?category=veshti')}>Veshtis</button>
            <button onClick={() => navigate('/mens?category=shirt')}>Silk shirts</button>
            <button onClick={() => navigate('/mens?category=set')}>Wedding sets</button>
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
            <a href={`tel:${STORE_PHONE_TEL}`}><Phone size={15} /> {STORE_PHONE_DISPLAY}</a>
            <a href={STORE_WHATSAPP_URL} target="_blank" rel="noreferrer noopener"><MessageCircle size={15} /> WhatsApp</a>
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
