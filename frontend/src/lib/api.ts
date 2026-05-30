import type {
  Address,
  AdminAuditLog,
  AdminProductQuickCreatePayload,
  AdminInventoryRow,
  AdminShipment,
  CartResponse,
  CatalogCategory,
  CatalogCollection,
  CatalogFacets,
  DeliveryCheck,
  Order,
  PaginatedResponse,
  Product,
  ProductReview,
  ReturnRequest,
  User,
} from '@/types';

const API_BASE = '/api';
const ACCESS_KEY = 'csm_access_token';
const REFRESH_KEY = 'csm_refresh_token';

type JsonMap = Record<string, unknown>;
type RazorpayOrderResponse = { razorpay_order_id: string; amount: number; currency: string; order_id: number; key?: string };
type PaymentVerifyPayload = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type AdminDashboardResponse = { kpis: JsonMap; recent_orders: JsonMap[] };
type UnsoldResponse = { count: number; total_capital_blocked: number | string; items: JsonMap[] };
type WishlistApiItem = { id: number; product: Product; created_at: string };

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(access?: string, refresh?: string) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    price: Number(product.price || 0),
    mrp: Number(product.mrp || 0),
    colors: product.colors || product.colours || ['#C4923A'],
    hook: product.hook || '',
    badge: product.badge || 'pb-new',
    'badge-text': product['badge-text'] || 'New',
    emoji: product.emoji || 'CSM',
    bg: product.bg || 'linear-gradient(145deg,#1A1208,#8B1A1A,#C4923A)',
  };
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const isFormData = options?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.message || `API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function download(endpoint: string): Promise<Blob> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.message || `API error: ${res.status}`);
  }
  return res.blob();
}

export const api = {
  tokens: { getAccessToken, setTokens, clearTokens },

  products: {
    list: async (params?: Record<string, string | number | boolean | undefined>) => {
      const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '');
      const qs = entries.length ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : '';
      const data = await request<PaginatedResponse<Product>>(`/products${qs}`);
      return { ...data, items: data.items.map(normalizeProduct) };
    },
    search: async (params?: Record<string, string | number | boolean | undefined>) => {
      const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '');
      const qs = entries.length ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : '';
      const data = await request<PaginatedResponse<Product>>(`/search${qs}`);
      return { ...data, items: data.items.map(normalizeProduct) };
    },
    get: async (slug: string) => normalizeProduct(await request<Product>(`/products/${slug}`)),
    facets: (params?: Record<string, string | number | boolean | undefined>) => {
      const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '');
      const qs = entries.length ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : '';
      return request<CatalogFacets>(`/catalog/facets${qs}`);
    },
    categories: () => request<CatalogCategory[]>('/categories'),
    collections: () => request<CatalogCollection[]>('/collections'),
    delivery: (slug: string, pin_code: string) =>
      request<DeliveryCheck>(`/products/${slug}/delivery?pin_code=${encodeURIComponent(pin_code)}`),
    reviews: {
      list: (slug: string) => request<ProductReview[]>(`/products/${slug}/reviews`),
      create: (slug: string, data: { rating: number; title: string; body: string }) =>
        request<ProductReview>(`/products/${slug}/reviews`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
  },

  auth: {
    sendOtp: (phone: string) => request<{ message: string; dev_otp?: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
    verifyOtp: async (phone: string, otp: string) => {
      const data = await request<{ access_token: string; refresh_token: string; user: User }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      });
      setTokens(data.access_token, data.refresh_token);
      return data;
    },
    adminLogin: async (email: string, password: string) => {
      const data = await request<{ access_token: string; refresh_token: string; user: User }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setTokens(data.access_token, data.refresh_token);
      return data;
    },
    me: () => request<User>('/auth/me'),
    updateMe: (data: Partial<User>) => request<User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    refresh: async () => {
      const refresh = localStorage.getItem(REFRESH_KEY);
      const data = await request<{ access_token: string; refresh_token: string; user: User }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      });
      setTokens(data.access_token, data.refresh_token);
      return data;
    },
    logout: () => {
      clearTokens();
      return Promise.resolve();
    },
  },

  cart: {
    get: () => request<CartResponse>('/cart'),
    add: (variant_id: number, quantity: number) =>
      request<CartResponse>('/cart', {
        method: 'POST',
        body: JSON.stringify({ variant_id, quantity }),
      }),
    update: (itemId: number, quantity: number) =>
      request<CartResponse>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
    remove: (itemId: number) =>
      request<CartResponse>(`/cart/items/${itemId}`, { method: 'DELETE' }),
    clear: () => request<void>('/cart', { method: 'DELETE' }),
    coupon: (coupon_code: string) =>
      request<CartResponse>('/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ coupon_code }),
      }),
    summary: () => request<CartResponse>('/checkout/summary'),
  },

  orders: {
    list: () => request<PaginatedResponse<Order>>('/orders'),
    get: (orderId: string | number) => request<Order>(`/orders/${orderId}`),
    track: (identifier: string, phone: string) =>
      request<Order>(`/orders/track?identifier=${encodeURIComponent(identifier)}&phone=${encodeURIComponent(phone)}`),
    create: (data: { address_id: number; coupon_code?: string; loyalty_points_to_use?: number; payment_method?: 'cod' | 'razorpay' }) =>
      request<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (orderId: string | number) =>
      request<Order>(`/orders/${orderId}/cancel`, { method: 'POST' }),
    invoice: (orderId: string | number) => download(`/orders/${orderId}/invoice`),
  },

  returns: {
    list: () => request<JsonMap[]>('/returns'),
    create: (data: { order_id: number; reason: string; details?: string }) =>
      request<JsonMap>('/returns', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  payments: {
    createRazorpayOrder: (orderId: number) =>
      request<RazorpayOrderResponse>('/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
      }),
    verify: (data: PaymentVerifyPayload) =>
      request<{ message: string; order_number: string; order_id: number }>('/payments/razorpay/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  ai: {
    tryon: (data: JsonMap) =>
      request<JsonMap>('/ai/tryon', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    voiceSearch: (data: JsonMap) =>
      request<JsonMap>('/ai/voice-search', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    recommend: () => request<{ items: Product[] }>('/ai/recommend'),
  },

  admin: {
    dashboard: () => request<AdminDashboardResponse>('/admin/dashboard'),
    products: async () => {
      const data = await request<PaginatedResponse<Product>>('/admin/products');
      return { ...data, items: data.items.map(normalizeProduct) };
    },
    categories: () => request<CatalogCategory[]>('/admin/categories'),
    collections: () => request<CatalogCollection[]>('/admin/collections'),
    createCollection: (data: Partial<CatalogCollection>) =>
      request<CatalogCollection>('/admin/collections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createProductQuick: async (data: AdminProductQuickCreatePayload) =>
      normalizeProduct(await request<Product>('/admin/products/quick-create', {
        method: 'POST',
        body: JSON.stringify(data),
      })),
    uploadProductImage: (file: File) => {
      const body = new FormData();
      body.append('image', file);
      return request<{ image_url: string }>('/admin/product-images', {
        method: 'POST',
        body,
      });
    },
    orders: () => request<{ items: Order[]; total: number }>('/admin/orders'),
    inventory: () => request<AdminInventoryRow[]>('/admin/inventory'),
    adjustInventory: (data: { variant_id: number; quantity_delta: number; note?: string }) =>
      request<JsonMap>('/admin/inventory', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    shipments: () => request<AdminShipment[]>('/admin/shipments'),
    createShipment: (data: { order: number; provider: string; awb_number?: string; tracking_url?: string; label_url?: string; manifest_url?: string; shipping_charge?: number | string; rto_reason?: string; status?: AdminShipment['status']; raw_payload?: JsonMap; event_location?: string; event_note?: string }) =>
      request<AdminShipment>('/admin/shipments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    shipmentLabel: (shipmentId: number) => download(`/admin/shipments/${shipmentId}/label`),
    shipmentManifest: (shipmentId: number) => download(`/admin/shipments/${shipmentId}/manifest`),
    returns: () => request<ReturnRequest[]>('/admin/returns'),
    updateReturn: (returnId: number, data: { status: ReturnRequest['status'] }) =>
      request<ReturnRequest>(`/admin/returns/${returnId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    customers: () => request<JsonMap[]>('/admin/customers'),
    reports: () => request<JsonMap>('/admin/reports'),
    auditLogs: () => request<AdminAuditLog[]>('/admin/audit-logs'),
    unsold: () => request<UnsoldResponse>('/admin/unsold-alerts'),
    updateOrderStatus: (orderId: number, data: JsonMap) =>
      request<Order>(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    workflowOrder: (orderId: number, data: { action: string; provider?: string; note?: string; location?: string }) =>
      request<Order>(`/admin/orders/${orderId}/workflow`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    orderInvoice: (orderId: number) => download(`/admin/orders/${orderId}/invoice`),
  },

  addresses: {
    list: () => request<Address[]>('/addresses'),
    create: (data: Address) =>
      request<Address>('/addresses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  wishlist: {
    list: () => request<WishlistApiItem[]>('/wishlist'),
    toggle: (product_id: number) =>
      request<{ in_wishlist: boolean; item?: WishlistApiItem }>('/wishlist', {
        method: 'POST',
        body: JSON.stringify({ product_id }),
      }),
  },

  loyalty: {
    balance: () => request<JsonMap>('/loyalty/balance'),
    history: () => request<JsonMap[]>('/loyalty/history'),
    rewards: () => request<JsonMap[]>('/loyalty/rewards'),
    redeem: (rewardId: number) => request<JsonMap>(`/loyalty/redeem/${rewardId}`, { method: 'POST' }),
  },

  notifications: {
    list: () => request<JsonMap[]>('/notifications'),
    markRead: () => request<JsonMap>('/notifications', { method: 'PATCH' }),
  },
};

export { normalizeProduct };
