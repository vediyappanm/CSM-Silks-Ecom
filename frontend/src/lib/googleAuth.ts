import { GOOGLE_CALLBACK_PATH } from '@/lib/routes';

const GOOGLE_NEXT_KEY = 'csm_google_oauth_next';
const GOOGLE_STATE_KEY = 'csm_google_oauth_state';
const GOOGLE_NONCE_KEY = 'csm_google_oauth_nonce';

export { GOOGLE_CALLBACK_PATH };

function randomValue() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getGoogleRedirectUri() {
  if (import.meta.env.DEV) {
    const port = window.location.port || '5173';
    return `http://localhost:${port}${GOOGLE_CALLBACK_PATH}`;
  }
  return `${window.location.origin}${GOOGLE_CALLBACK_PATH}`;
}

type GoogleRedirectOptions = {
  /** Authorization code flow (recommended). Requires GOOGLE_CLIENT_SECRET on the backend. */
  useCodeFlow?: boolean;
};

/**
 * Starts Google OAuth redirect sign-in.
 * Prefer authorization code flow when the backend has GOOGLE_CLIENT_SECRET configured.
 */
export function startGoogleRedirect(clientId: string, nextPath: string, options: GoogleRedirectOptions = {}) {
  const redirectUri = getGoogleRedirectUri();
  const state = randomValue();
  const useCodeFlow = Boolean(options.useCodeFlow);
  sessionStorage.setItem(GOOGLE_NEXT_KEY, nextPath);
  sessionStorage.setItem(GOOGLE_STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: useCodeFlow ? 'code' : 'id_token',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  });
  if (!useCodeFlow) {
    const nonce = randomValue();
    sessionStorage.setItem(GOOGLE_NONCE_KEY, nonce);
    params.set('nonce', nonce);
  }
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export function consumeGoogleOAuthState(receivedState: string | null) {
  const expected = sessionStorage.getItem(GOOGLE_STATE_KEY);
  sessionStorage.removeItem(GOOGLE_STATE_KEY);
  if (!expected || !receivedState || expected !== receivedState) {
    throw new Error('Google sign-in state mismatch. Please try again.');
  }
}

export function consumeGoogleOAuthNonce() {
  const nonce = sessionStorage.getItem(GOOGLE_NONCE_KEY);
  sessionStorage.removeItem(GOOGLE_NONCE_KEY);
  return nonce;
}

export function consumeGoogleOAuthNext() {
  const next = sessionStorage.getItem(GOOGLE_NEXT_KEY) || '/account';
  sessionStorage.removeItem(GOOGLE_NEXT_KEY);
  return next;
}

/** Parse OAuth response from hash (#id_token=...) or query (?code=...). */
export function readGoogleCallbackParams(search: string, hash: string) {
  const fromQuery = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const fromHash = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  return {
    idToken: fromHash.get('id_token') || fromQuery.get('id_token'),
    code: fromQuery.get('code') || fromHash.get('code'),
    state: fromHash.get('state') || fromQuery.get('state'),
    error: fromHash.get('error') || fromQuery.get('error'),
  };
}
