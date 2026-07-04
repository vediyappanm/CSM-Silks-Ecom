export function productCatalogSegment(gender?: string | null) {
  if (gender === 'men') return 'mens';
  if (gender === 'women') return 'womens';
  if (gender === 'unisex') return 'unisex';
  return 'womens';
}

export function productDetailPath(product: { gender?: string | null; slug: string }) {
  return `/product/${productCatalogSegment(product.gender)}/${product.slug}`;
}
