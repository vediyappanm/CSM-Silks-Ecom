import { Phone, MessageCircle } from 'lucide-react';
import { STORE_PHONE_TEL, STORE_WHATSAPP_URL } from '@/lib/storeContact';
import { useApp } from '@/store/AppContext';

export function FloatingButtons() {
  return (
    <div className="float-stack">
      <a className="fb fb-wa" href={`${STORE_WHATSAPP_URL}?text=Vanakkam%20CSM%20Silks!`} target="_blank" rel="noreferrer noopener" title="WhatsApp" aria-label="Chat on WhatsApp">
        <MessageCircle size={20} aria-hidden="true" />
      </a>
      <a className="fb fb-call" href={`tel:${STORE_PHONE_TEL}`} title="Call" aria-label="Call CSM Silks">
        <Phone size={20} aria-hidden="true" />
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
