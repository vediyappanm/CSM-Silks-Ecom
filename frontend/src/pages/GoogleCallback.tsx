import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import {
  consumeGoogleOAuthNext,
  consumeGoogleOAuthNonce,
  consumeGoogleOAuthState,
  getGoogleRedirectUri,
  readGoogleCallbackParams,
} from '@/lib/googleAuth';
import { useApp } from '@/store/AppContext';

export function GoogleCallback() {
  const navigate = useNavigate();
  const { refreshSession, showToast } = useApp();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const completeSignIn = async () => {
      const params = readGoogleCallbackParams(window.location.search, window.location.hash);
      if (params.error) {
        if (active) setError('Google sign-in was cancelled or denied.');
        return;
      }
      try {
        consumeGoogleOAuthState(params.state);
        if (params.idToken) {
          await api.auth.googleLogin(params.idToken, consumeGoogleOAuthNonce() || undefined);
        } else if (params.code) {
          await api.auth.googleExchange(params.code, getGoogleRedirectUri());
        } else {
          throw new Error('Google did not return a sign-in token.');
        }
        await refreshSession();
        const nextPath = consumeGoogleOAuthNext();
        showToast('OK', 'Signed in with Google', 'Your customer session is ready');
        navigate(nextPath, { replace: true });
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed.');
        }
      }
    };
    void completeSignIn();
    return () => {
      active = false;
    };
  }, [navigate, refreshSession, showToast]);

  return (
    <div className="auth-page">
      <div className="auth-signed-card">
        {error ? (
          <>
            <h1>Google sign-in failed</h1>
            <p>{error}</p>
            <div className="auth-signed-actions">
              <button type="button" className="btn btn-gold" onClick={() => navigate('/login', { replace: true })}>
                Back to login
              </button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="spin" size={28} />
            <h1>Completing Google sign-in</h1>
            <p>Please wait while we verify your Google account.</p>
          </>
        )}
      </div>
    </div>
  );
}
