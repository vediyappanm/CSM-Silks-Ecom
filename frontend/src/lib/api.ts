const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Products
  products: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString() : '';
      return request<any[]>(`/products${qs}`);
    },
    get: (slug: string) => request<any>(`/products/${slug}`),
  },

  // Auth
  auth: {
    sendOtp: (phone: string) => request<{ message: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
    verifyOtp: (phone: string, otp: string) => request<{ token: string; user: any }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),
    me: () => request<any>('/auth/me'),
    updateMe: (data: any) => request<any>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    refresh: () => request<any>('/auth/refresh', { method: 'POST' }),
  },

  // Cart
  cart: {
    get: () => request<any[]>('/cart'),
    add: (product_id: number, quantity: number, colour?: string) =>
      request<any>('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ product_id, quantity, colour }),
      }),
    remove: (itemId: number) =>
      request<any>(`/cart/${itemId}`, { method: 'DELETE' }),
  },

  // Orders
  orders: {
    list: (page = 1) => request<any>(`/orders?page=${page}`),
    get: (orderId: string) => request<any>(`/orders/${orderId}`),
    create: (address_id: number) =>
      request<any>('/orders', {
        method: 'POST',
        body: JSON.stringify({ address_id }),
      }),
    cancel: (orderId: string) =>
      request<any>(`/orders/${orderId}/cancel`, { method: 'POST' }),
  },

  // Payments
  payments: {
    createOrder: (orderId: string) =>
      request<any>('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
      }),
    verify: (data: any) =>
      request<any>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // AI
  ai: {
    tryon: (data: any) =>
      request<any>('/ai/tryon', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    voiceSearch: (data: any) =>
      request<any>('/ai/voice-search', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    recommend: () => request<any>('/ai/recommend'),
  },

  // Admin
  admin: {
    dashboard: () =>
      request<any>('/admin/dashboard', {
        method: 'POST',
      }),
    products: (data?: any) =>
      request<any>('/admin/products', {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),
  },

  // Addresses
  addresses: {
    list: () => request<any[]>('/addresses'),
    create: (data: any) =>
      request<any>('/addresses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
