import { useEffect, useRef, useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

type GoogleSignInButtonProps = {
  clientId: string;
  label?: 'signin_with' | 'signup_with' | 'continue_with';
  disabled?: boolean;
  onSuccess: (response: CredentialResponse) => void;
  onError?: () => void;
  onUnavailable?: () => void;
};

export function GoogleSignInButton({
  clientId,
  label = 'continue_with',
  disabled = false,
  onSuccess,
  onError,
  onUnavailable,
}: GoogleSignInButtonProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    const update = () => setWidth(Math.max(240, Math.floor(node.clientWidth || 320)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const iframe = wrapRef.current?.querySelector('iframe[src*="accounts.google.com"]');
      const height = iframe?.getBoundingClientRect().height || 0;
      if (!iframe || height < 20) {
        setUnavailable(true);
        onUnavailable?.();
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [clientId, onUnavailable]);

  if (!clientId) return null;

  if (unavailable) {
    return (
      <p className="google-signin-fallback">
        Google sign-in is not available for this site origin. Use phone OTP below, or add{' '}
        <code>{window.location.origin}</code> to Authorized JavaScript origins in Google Cloud.
      </p>
    );
  }

  return (
    <div ref={wrapRef} className={`google-signin-wrap ${disabled ? 'is-disabled' : ''}`}>
      <div className="google-signin-button">
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => {
            setUnavailable(true);
            onError?.();
            onUnavailable?.();
          }}
          useOneTap={false}
          text={label}
          shape="rectangular"
          theme="outline"
          size="large"
          width={String(width)}
          locale="en"
        />
      </div>
    </div>
  );
}
