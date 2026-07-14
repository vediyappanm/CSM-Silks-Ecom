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

function googleCredentialsUrl(clientId: string) {
  return `https://console.cloud.google.com/apis/credentials/oauthclient/${encodeURIComponent(clientId)}`;
}

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
    setUnavailable(false);
    const timer = window.setTimeout(() => {
      const iframe = wrapRef.current?.querySelector('iframe[src*="accounts.google.com"]');
      const height = iframe?.getBoundingClientRect().height || 0;
      if (!iframe || height < 20) {
        setUnavailable(true);
        onUnavailable?.();
      }
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [clientId, onUnavailable]);

  if (!clientId) return null;

  if (unavailable) {
    const origin = window.location.origin;
    const consoleUrl = googleCredentialsUrl(clientId);
    return (
      <div className="google-signin-fallback" role="alert">
        <p>
          Google Sign-In needs this origin on the OAuth Web client:{' '}
          <code>{origin}</code>
        </p>
        <ol className="google-signin-steps">
          <li>Open Google Cloud → Credentials → your OAuth 2.0 Web client</li>
          <li>
            Under <strong>Authorized JavaScript origins</strong>, add{' '}
            <code>{origin}</code>
          </li>
          <li>Save, wait ~1 minute, then refresh this page</li>
        </ol>
        <a className="btn btn-secondary google-signin-console-link" href={consoleUrl} target="_blank" rel="noreferrer">
          Open Google Cloud client settings
        </a>
        <p className="google-signin-fallback-note">
          Until that is saved, use phone OTP below (local OTP appears on screen in development).
        </p>
      </div>
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
