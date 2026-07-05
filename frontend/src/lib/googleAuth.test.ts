import { afterEach, describe, expect, it, vi } from 'vitest';
import { readGoogleCallbackParams, startGoogleRedirect } from './googleAuth';

describe('googleAuth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses id_token from the OAuth hash fragment', () => {
    const params = readGoogleCallbackParams('', '#id_token=abc.def.ghi&state=xyz');
    expect(params.idToken).toBe('abc.def.ghi');
    expect(params.state).toBe('xyz');
    expect(params.error).toBeNull();
  });

  it('parses authorization code from the query string', () => {
    const params = readGoogleCallbackParams('?code=auth-code&state=s1', '');
    expect(params.code).toBe('auth-code');
    expect(params.state).toBe('s1');
  });

  it('starts Google OpenID id_token redirect without a client secret', () => {
    const assign = vi.fn();
    const setItem = vi.fn();
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:5173',
        assign,
      },
    });
    vi.stubGlobal('location', {
      origin: 'http://localhost:5173',
      assign,
    });
    vi.stubGlobal('sessionStorage', {
      setItem,
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });

    startGoogleRedirect('client.apps.googleusercontent.com', '/account');

    expect(assign).toHaveBeenCalledOnce();
    const url = String(assign.mock.calls[0][0]);
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
    expect(url).toContain('response_type=id_token');
    expect(url).toContain('client_id=client.apps.googleusercontent.com');
    expect(url).toContain(encodeURIComponent('http://localhost:5173/auth/google/callback'));
    expect(url).not.toContain('client_secret');
    expect(setItem).toHaveBeenCalled();
  });

  it('starts Google authorization code redirect when configured', () => {
    const assign = vi.fn();
    const setItem = vi.fn();
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:5173',
        port: '5173',
        assign,
      },
    });
    vi.stubGlobal('location', {
      origin: 'http://localhost:5173',
      port: '5173',
      assign,
    });
    vi.stubGlobal('sessionStorage', {
      setItem,
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });

    startGoogleRedirect('client.apps.googleusercontent.com', '/account', { useCodeFlow: true });

    expect(assign).toHaveBeenCalledOnce();
    const url = String(assign.mock.calls[0][0]);
    expect(url).toContain('response_type=code');
    expect(url).not.toContain('nonce=');
    expect(url).toContain(encodeURIComponent('http://localhost:5173/auth/google/callback'));
  });
});
