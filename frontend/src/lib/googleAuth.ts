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
  return `${window.location.origin}${GOOGLE_CALLBACK_PATH}`;
}

/**
 * Starts Google OpenID Connect implicit flow (id_token).
 * Works with only GOOGLE_CLIENT_ID — no client secret required.
 * Requires the redirect URI in Google Cloud Console Authorized redirect URIs.
 */
export function startGoogleRedirect(clientId: string, nextPath: string) {
  const redirectUri = getGoogleRedirectUri();
  const state = randomValue();
  const nonce = randomValue();
  sessionStorage.setItem(GOOGLE_NEXT_KEY, nextPath);
  sessionStorage.setItem(GOOGLE_STATE_KEY, state);
  sessionStorage.setItem(GOOGLE_NONCE_KEY, nonce);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
    nonce,
  });
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
