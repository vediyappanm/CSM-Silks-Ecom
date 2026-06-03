import { Phone, MessageCircle } from 'lucide-react';
import { useApp } from '@/store/AppContext';

export function FloatingButtons() {
  return (
    <div className="float-stack">
      <a className="fb fb-wa" href="https://wa.me/919876543210?text=Vanakkam%20CSM%20Silks!" target="_blank" title="WhatsApp">
        <MessageCircle size={20} />
      </a>
      <a className="fb fb-call" href="tel:+919876543210" title="Call">
        <Phone size={20} />
      </a>
    </div>
  );
}

export function ToastStack() {
  const { toast, dismissToast } = useApp();
  if (!toast) return null;
  return (
    <div className="toast-stack">
      <div className="toast" key={toast.id}>
        <div className="toast-ic">{toast.icon}</div>
        <div className="toast-copy">
          <div className="toast-title">{toast.title}</div>
          <div className="toast-msg">{toast.msg}</div>
        </div>
        <button className="toast-close" type="button" onClick={dismissToast} aria-label="Dismiss notification">
          x
        </button>
      </div>
    </div>
  );
}
