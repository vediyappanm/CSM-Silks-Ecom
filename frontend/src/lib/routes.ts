export const CUSTOMER_AUTH_PATHS = new Set(['/login', '/signup']);
export const GOOGLE_CALLBACK_PATH = '/auth/google/callback';

const PUBLIC_PATHS = new Set(['/', '/womens', '/mens', '/search', '/tracking', '/wishlist', '/tryon', GOOGLE_CALLBACK_PATH]);

export function isPublicCustomerPath(pathname: string) {
  if (CUSTOMER_AUTH_PATHS.has(pathname)) return true;
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/product/')) return true;
  return false;
}

export function isProtectedCustomerPath(pathname: string) {
  return !isPublicCustomerPath(pathname);
}

export function customerNextPath(pathname: string, search = '', hash = '') {
  return `${pathname}${search}${hash}`;
}

export function safeCustomerRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  const pathOnly = value.split(/[?#]/, 1)[0];
  if (CUSTOMER_AUTH_PATHS.has(pathOnly)) return '/';
  return value;
}
