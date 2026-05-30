export interface ProductVariant {
  id: number;
  sku: string;
  title?: string;
  color_name?: string;
  color_hex?: string;
  size?: string;
  fabric?: string;
  zari_type?: string;
  care_instructions?: string;
  blouse_included?: boolean;
  price: number | string;
  mrp: number | string;
  stock_qty: number;
  reserved_qty?: number;
  available_qty: number;
  is_active?: boolean;
}

export interface CatalogCategory {
  id: number;
  name: string;
  slug: string;
  gender: Product['gender'];
  parent_id?: number | null;
  sort_order?: number;
}

export interface CatalogCollection {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_featured?: boolean;
  sort_order?: number;
}

export interface Product {
  id: number;
  slug: string;
  variant_id?: number;
  default_variant_id?: number;
  name: string;
  name_tamil?: string;
  cat: string;
  category_slug?: string;
  price: number;
  mrp: number;
  badge: string;
  'badge-text': string;
  emoji: string;
  bg: string;
  hook: string;
  description?: string;
  brand?: string;
  seller_name?: string;
  deal_label?: string;
  colors: string[];
  colours?: string[];
  gender: 'women' | 'men' | 'unisex';
  tags: string[];
  occasions?: string[];
  images?: string[];
  collections?: CatalogCollection[];
  variants?: ProductVariant[];
  available_qty?: number;
  is_featured?: boolean;
  is_gi_tagged?: boolean;
  assured?: boolean;
  cod_available?: boolean;
  exchange_available?: boolean;
  return_days?: number;
  delivery_min_days?: number;
  delivery_max_days?: number;
  key_highlights?: string[];
  specifications?: Record<string, string>;
  serviceable_pin_codes?: string[];
  discount_percent?: number;
  avg_rating?: number | string;
  review_count?: number;
  total_sold?: number;
}

export interface AdminProductQuickCreatePayload {
  name: string;
  slug?: string;
  gender: Product['gender'];
  category_name: string;
  category_slug?: string;
  collection_name?: string;
  collection_slug?: string;
  collection_description?: string;
  hook?: string;
  description?: string;
  tags_text?: string;
  occasions_text?: string;
  price: number;
  mrp: number;
  cost_price?: number;
  stock_qty: number;
  sku?: string;
  color_name?: string;
  color_hex?: string;
  size?: string;
  fabric?: string;
  zari_type?: string;
  blouse_included?: boolean;
  image_url?: string;
  alt_text?: string;
  deal_label?: string;
  is_featured?: boolean;
  is_active?: boolean;
  assured?: boolean;
  cod_available?: boolean;
  exchange_available?: boolean;
  return_days?: number;
}

export interface CartItem extends Product {
  qty: number;
  cart_item_id?: number;
}

export interface ApiCartItem {
  id: number;
  product_id: number;
  variant_id: number;
  quantity: number;
  product: Product;
  line_total: number | string;
}

export interface CartResponse {
  id?: number;
  items: ApiCartItem[];
  item_count: number;
  subtotal: number | string;
  discount?: number | string;
  coupon_code?: string;
  cgst: number | string;
  sgst: number | string;
  shipping?: number | string;
  total: number | string;
  free_shipping: boolean;
}

export interface OrderItem {
  id: number;
  product_id: number;
  variant_id: number;
  product?: Product;
  product_name: string;
  product_sku: string;
  unit_price: number | string;
  quantity: number;
  subtotal: number | string;
}

export interface TrackingEvent {
  id: number;
  status: string;
  title: string;
  description: string;
  location?: string;
  happened_at: string;
  raw_payload?: Record<string, unknown>;
  created_at?: string;
}

export interface Order {
  id: number;
  order_number: string;
  status: 'pending' | 'payment_pending' | 'confirmed' | 'quality_check' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'delivery_failed' | 'rto_initiated' | 'rto_delivered' | 'cancelled' | 'return_initiated' | 'returned' | 'refunded';
  payment_method?: string;
  payment_status?: string;
  subtotal: number | string;
  discount_amount: number | string;
  cgst_amount: number | string;
  sgst_amount: number | string;
  shipping_amount: number | string;
  total_amount: number | string;
  courier_name?: string;
  tracking_number?: string;
  courier_url?: string;
  tracking_url?: string;
  estimated_delivery?: string;
  created_at: string;
  confirmed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  tracking_events?: TrackingEvent[];
  items: OrderItem[];
}

export interface AdminInventoryRow {
  variant_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  stock_qty: number;
  reserved_qty: number;
  available_qty: number;
  reorder_level: number;
  low_stock: boolean;
}

export interface AdminShipment {
  id: number;
  order: number;
  order_number: string;
  provider: string;
  awb_number: string;
  tracking_url: string;
  label_url?: string;
  manifest_url?: string;
  shipping_charge?: number | string;
  rto_reason?: string;
  status: 'created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'rto_initiated' | 'rto_delivered';
  raw_payload?: Record<string, unknown>;
  events?: TrackingEvent[];
  created_at: string;
  updated_at: string;
}

export interface ReturnRequest {
  id: number;
  order: number;
  order_number: string;
  customer: string;
  reason: string;
  details?: string;
  status: 'requested' | 'approved' | 'rejected' | 'picked_up' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface Address {
  id?: number;
  label?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone: string;
  address_line_1?: string;
  address_line_2?: string;
  address_line1?: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code?: string;
  pincode?: string;
  country?: string;
  email?: string;
  is_default?: boolean;
}

export interface User {
  id?: number;
  phone?: string;
  name?: string;
  full_name?: string;
  email?: string;
  role?: string;
  loyalty_points?: number;
  loyalty_tier?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages?: number;
}

export interface TryOnData {
  skin: string;
  body: string;
  drape: string;
}

export type PaymentMethod = 'upi' | 'card' | 'netbank' | 'cod';

export interface CartTotals {
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  shipping: number;
  total: number;
}

export interface Toast {
  id: number;
  icon: string;
  title: string;
  msg: string;
}

export interface CatalogFacets {
  categories: CatalogCategory[];
  colors: Array<{ color_name: string; color_hex: string }>;
  fabrics: string[];
  occasions: string[];
  price: { min_price: number | string | null; max_price: number | string | null };
  sorts: Array<{ key: string; label: string }>;
}

export interface DeliveryCheck {
  pin_code: string;
  serviceable: boolean;
  message: string;
  eta_min: string;
  eta_max: string;
  cod_available: boolean;
  exchange_available: boolean;
  return_days: number;
  seller_name: string;
  assured: boolean;
}

export interface ProductReview {
  id: number;
  product: number;
  rating: number;
  title: string;
  body: string;
  customer: string;
  is_verified_purchase: boolean;
  created_at: string;
}
