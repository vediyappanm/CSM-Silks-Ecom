export interface Product {
  id: number;
  name: string;
  cat: string;
  price: number;
  mrp: number;
  badge: string;
  'badge-text': string;
  emoji: string;
  bg: string;
  hook: string;
  colors: string[];
  gender: 'women' | 'men';
  tags: string[];
  description?: string;
  images?: string[];
}

export interface CartItem extends Product {
  qty: number;
}

export interface Order {
  id: string;
  product: Product;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  courier: string;
  total?: number;
  items?: CartItem[];
}

export interface Address {
  id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  email?: string;
  is_default?: boolean;
}

export interface User {
  id?: number;
  phone: string;
  name?: string;
  email?: string;
  loyalty_points?: number;
  loyalty_tier?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface TryOnData {
  skin: string;
  body: string;
  drape: string;
}

export type PaymentMethod = 'upi' | 'card' | 'netbank' | 'cod';

export interface CartTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
}

export interface Toast {
  id: number;
  icon: string;
  title: string;
  msg: string;
}
