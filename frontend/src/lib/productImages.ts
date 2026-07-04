import { resolveAssetUrl } from '@/lib/api';
import type { Product, ProductImageRecord } from '@/types';

export function uniqueImages(urls: string[]) {
  return [...new Set(urls.filter(Boolean))];
}

export function buildVariantImageMap(imageRecords?: ProductImageRecord[]) {
  const map = new Map<number, string[]>();
  if (!imageRecords?.length) return map;

  const grouped = new Map<number, ProductImageRecord[]>();
  for (const rec of imageRecords) {
    if (!rec.variant_id || !rec.image_url) continue;
    const list = grouped.get(rec.variant_id) ?? [];
    list.push(rec);
    grouped.set(rec.variant_id, list);
  }

  for (const [variantId, records] of grouped) {
    map.set(
      variantId,
      uniqueImages(
        records
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(record => resolveAssetUrl(record.image_url)),
      ),
    );
  }

  return map;
}

export function getProductImageList(
  product: Product,
  variantId?: number | null,
  variantImageMap?: Map<number, string[]>,
) {
  const variantImages = variantId ? variantImageMap?.get(variantId) : undefined;
  const base = variantImages?.length ? variantImages : (product.images ?? []);
  if (base.length) return uniqueImages(base);
  return (product.colors || ['#7a1e1e', '#c4923a', '#0f5b45']).slice(0, 4);
}
