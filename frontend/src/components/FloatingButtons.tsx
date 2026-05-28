import { useApp } from '@/store/AppContext';

export function FloatingButtons() {
  return (
    <div className="float-stack">
      <a className="fb fb-wa" href="https://wa.me/919876543210?text=Vanakkam%20CSM%20Silks!" target="_blank" title="WhatsApp">💬</a>
      <a className="fb fb-call" href="tel:+919****3210" title="Call">📞</a>
    </div>
  );
}

export function ToastStack() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="toast-stack">
      <div className="toast" key={toast.id}>
        <div className="toast-ic">{toast.icon}</div>
        <div>
          <div className="toast-title">{toast.title}</div>
          <div className="toast-msg">{toast.msg}</div>
        </div>
      </div>
    </div>
  );
}
