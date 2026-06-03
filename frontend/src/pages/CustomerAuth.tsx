import { useEffect, useMemo, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/store/AppContext';

type AuthMode = 'login' | 'signup';
type AuthStep = 'phone' | 'otp';

type CustomerAuthProps = {
  initialMode?: AuthMode;
};

type OTPDeliveryState = {
  sms_sent?: boolean;
  email_sent?: boolean;
  email_masked?: string;
  delivery_channels?: string[];
} | null;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const AUTH_IMAGE_URL = 'https://images.pexels.com/photos/27575174/pexels-photo-27575174.jpeg?auto=compress&cs=tinysrgb&w=1200';

function cleanPhone(value: string) {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return digits;
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 12;
}

function isValidEmail(value: string) {
  if (!value.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/account';
  if (value === '/login' || value === '/signup') return '/account';
  return value;
}

export function CustomerAuth({ initialMode = 'login' }: CustomerAuthProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, refreshSession, isAuthed, user } = useApp();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const nextPath = safeRedirect(query.get('next'));
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [delivery, setDelivery] = useState<OTPDeliveryState>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const isSignup = mode === 'signup';
  const normalizedPhone = cleanPhone(phone);
  const headline = isSignup ? 'Create your CSM Silks account' : 'Login to your CSM Silks account';
  const subcopy = isSignup
    ? 'Save your profile, sync wishlist, earn loyalty points, and checkout faster with OTP-secured access.'
    : 'Use your phone number with SMS or email OTP backup to continue shopping, tracking, returns, rewards, and invoices securely.';
  const deliveredBy = [
    delivery?.sms_sent ? 'SMS' : '',
    delivery?.email_sent ? `email${delivery.email_masked ? ` (${delivery.email_masked})` : ''}` : '',
  ].filter(Boolean).join(' and ');

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const resetForMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStep('phone');
    setOtp('');
    setDelivery(null);
    setError('');
    setResendIn(0);
  };

  const validatePhoneStep = () => {
    if (!isValidPhone(phone)) {
      setError('Enter a valid 10 digit Indian mobile number.');
      return false;
    }
    if (isSignup && fullName.trim().length < 2) {
      setError('Enter the customer full name.');
      return false;
    }
    if (isSignup && !isValidEmail(email)) {
      setError('Enter a valid email for invoices and order updates.');
      return false;
    }
    if (!isSignup && email.trim() && !isValidEmail(email)) {
      setError('Enter a valid email or leave the email OTP backup empty.');
      return false;
    }
    if (isSignup && !termsAccepted) {
      setError('Accept the account terms to create your profile.');
      return false;
    }
    setError('');
    return true;
  };

  const sendOtp = async () => {
    if (!validatePhoneStep()) return;
    setLoading(true);
    setError('');
    try {
      const emailForOtp = email.trim().toLowerCase();
      const response = await api.auth.sendOtp(normalizedPhone, isSignup || emailForOtp ? emailForOtp : undefined);
      setDelivery(response);
      setStep('otp');
      setResendIn(RESEND_SECONDS);
      const channels = [
        response.sms_sent ? 'SMS' : '',
        response.email_sent ? 'email' : '',
      ].filter(Boolean);
      showToast(
        'OK',
        'OTP sent',
        `Check your ${channels.join(' and ') || 'registered SMS/email channel'}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP right now.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendIn > 0 || loading) return;
    await sendOtp();
  };

  const updateOtpAt = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = otp.padEnd(OTP_LENGTH, ' ').split('');
    next[index] = digit || ' ';
    const compact = next.join('').replace(/\s/g, '').slice(0, OTP_LENGTH);
    setOtp(compact);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      document.querySelector<HTMLInputElement>(`[data-otp-index="${index + 1}"]`)?.focus();
    }
  };

  const handleOtpKey = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      document.querySelector<HTMLInputElement>(`[data-otp-index="${index - 1}"]`)?.focus();
    }
  };

  const pasteOtp = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setOtp(pasted);
    document.querySelector<HTMLInputElement>(`[data-otp-index="${Math.min(pasted.length, OTP_LENGTH) - 1}"]`)?.focus();
  };

  const verifyOtp = async () => {
    if (otp.length !== OTP_LENGTH) {
      setError('Enter the 6 digit OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const emailForProfile = email.trim().toLowerCase();
      await api.auth.verifyOtp(normalizedPhone, otp, isSignup || emailForProfile ? {
        ...(isSignup ? { full_name: fullName.trim(), wa_opted_in: whatsappOptIn, push_opted_in: true } : {}),
        ...(emailForProfile ? { email: emailForProfile } : {}),
      } : undefined);
      await refreshSession();
      showToast('OK', isSignup ? 'Account created' : 'Signed in', 'Your customer session is ready');
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthed) {
    return (
      <div className="auth-page">
        <div className="auth-signed-card">
          <div className="auth-success-icon"><CheckCircle2 size={30} /></div>
          <h1>You are already signed in</h1>
          <p>{user?.name || user?.phone || 'Your customer account'} is active on this browser.</p>
          <div className="auth-signed-actions">
            <button type="button" className="btn btn-gold" onClick={() => navigate(nextPath)}>Continue</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/account')}>Open account</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-story" aria-label="CSM Silks customer account benefits">
          <div className="auth-back auth-brand-chip">
            <ShieldCheck size={17} />
            Secure customer access
          </div>
          <div className="auth-story-copy">
            <h1>{headline}</h1>
            <p>{subcopy}</p>
          </div>
          <div className="auth-visual">
            <img src={AUTH_IMAGE_URL} alt="CSM Silks woven silk collection" />
            <div className="auth-visual-panel">
              <div>
                <span>Account benefits</span>
                <strong>Wishlist, rewards, invoices, returns and shipment updates in one place.</strong>
              </div>
              <ShoppingBag size={24} />
            </div>
          </div>
          <div className="auth-benefits">
            <div><ShieldCheck size={18} /><span>OTP verified phone login</span></div>
            <div><Sparkles size={18} /><span>Loyalty points after delivery</span></div>
            <div><MessageCircle size={18} /><span>Email and SMS OTP delivery</span></div>
          </div>
        </section>

        <section className="auth-card" aria-label="Customer login and signup form">
          <div className="auth-switch" role="tablist" aria-label="Choose login or signup">
            <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => resetForMode('login')}>Login</button>
            <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => resetForMode('signup')}>Sign up</button>
          </div>

          <div className="auth-progress" aria-label="Authentication progress">
            <span className="done">1</span>
            <div className={step === 'otp' ? 'done' : ''} />
            <span className={step === 'otp' ? 'done' : ''}>2</span>
          </div>

          <div className="auth-card-head">
            <h2>{step === 'phone' ? (isSignup ? 'Start with your details' : 'Enter mobile number') : 'Verify OTP'}</h2>
            <p>
              {step === 'phone'
                ? 'We will send a one-time password through the live SMS and email channels available for your account.'
                : deliveredBy
                  ? `OTP sent to ${normalizedPhone} by ${deliveredBy}.`
                  : `OTP delivery confirmed for ${normalizedPhone}.`}
            </p>
          </div>

          {step === 'phone' ? (
            <div className="auth-form">
              {isSignup && (
                <label className="auth-field">
                  <span>Full name</span>
                  <div>
                    <UserRound size={18} />
                    <input value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Customer name" autoComplete="name" />
                  </div>
                </label>
              )}

              <label className="auth-field">
                <span>{isSignup ? 'Email for OTP and invoices' : 'Email OTP backup optional'}</span>
                <div>
                  <Mail size={18} />
                  <input value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" />
                </div>
              </label>

              <label className="auth-field">
                <span>Mobile number</span>
                <div>
                  <Phone size={18} />
                  <input value={phone} onChange={event => setPhone(event.target.value)} placeholder="+91 98765 43210" inputMode="tel" autoComplete="tel" />
                </div>
              </label>

              {isSignup && (
                <div className="auth-consents">
                  <label>
                    <input type="checkbox" checked={whatsappOptIn} onChange={event => setWhatsappOptIn(event.target.checked)} />
                    <span>Send order and delivery updates on WhatsApp/SMS.</span>
                  </label>
                  <label>
                    <input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} />
                    <span>I agree to receive email/SMS account updates and accept the CSM Silks customer terms.</span>
                  </label>
                </div>
              )}

              {error && <div className="auth-error" role="alert">{error}</div>}

              <button type="button" className="auth-primary" onClick={() => void sendOtp()} disabled={loading}>
                {loading ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}
                Send OTP
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="auth-form">
              <div className="otp-grid" aria-label="Enter OTP">
                {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                  <input
                    key={index}
                    data-otp-index={index}
                    value={otp[index] || ''}
                    onChange={event => updateOtpAt(index, event.target.value)}
                    onKeyDown={event => handleOtpKey(index, event)}
                    onPaste={pasteOtp}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`OTP digit ${index + 1}`}
                    maxLength={1}
                  />
                ))}
              </div>

              {delivery && (
                <div className="auth-delivery">
                  {delivery.sms_sent && <span>SMS sent</span>}
                  {delivery.email_sent && <span>Email sent{delivery.email_masked ? ` to ${delivery.email_masked}` : ''}</span>}
                </div>
              )}

              {error && <div className="auth-error" role="alert">{error}</div>}

              <button type="button" className="auth-primary" onClick={() => void verifyOtp()} disabled={loading}>
                {loading ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                {isSignup ? 'Create account' : 'Verify and login'}
              </button>

              <div className="auth-otp-actions">
                <button type="button" onClick={() => setStep('phone')}>Change number</button>
                <button type="button" onClick={() => void resendOtp()} disabled={resendIn > 0 || loading}>
                  <RefreshCcw size={14} />
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
