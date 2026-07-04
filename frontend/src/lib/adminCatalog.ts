import type { Product } from '@/types';

export type AdminEditForm = {
  name: string;
  hook: string;
  deal_label: string;
  is_featured: boolean;
  is_active: boolean;
  price: string;
  mrp: string;
  stock_qty: string;
};

export function primaryVariantId(product: Product): number | null {
  return product.variants?.[0]?.id ?? product.variant_id ?? product.default_variant_id ?? null;
}

export function editFormFromProduct(product: Product): AdminEditForm {
  const variant = product.variants?.[0];
  return {
    name: product.name || '',
    hook: product.hook || '',
    deal_label: product.deal_label || '',
    is_featured: Boolean(product.is_featured),
    is_active: product.is_active !== false,
    price: String(variant?.price ?? product.price ?? ''),
    mrp: String(variant?.mrp ?? product.mrp ?? ''),
    stock_qty: String(variant?.stock_qty ?? product.available_qty ?? 0),
  };
}
