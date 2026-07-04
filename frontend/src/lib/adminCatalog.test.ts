import { describe, expect, it } from 'vitest';
import { editFormFromProduct, primaryVariantId } from './adminCatalog';
import type { Product } from '@/types';

const sampleProduct: Product = {
  id: 7,
  slug: 'ivory-silk-kurta-wedding-set',
  name: 'Ivory Silk Kurta Wedding Set',
  cat: 'Kurta',
  gender: 'men',
  tags: ['kurta', 'wedding'],
  hook: 'Handwoven silk kurta for wedding celebrations',
  deal_label: 'Wedding special',
  price: 8990,
  mrp: 12990,
  is_featured: true,
  is_active: true,
  variant_id: 42,
  available_qty: 12,
  variants: [
    {
      id: 42,
      sku: 'KURTA-IVORY-1',
      price: 8990,
      mrp: 12990,
      stock_qty: 12,
      available_qty: 12,
      color_name: 'Ivory',
      color_hex: '#F5F0E8',
      fabric: 'Silk',
      is_active: true,
    },
  ],
  images: [],
  colors: ['#F5F0E8'],
  badge: 'pb-men',
  'badge-text': "Men's",
  emoji: 'CSM',
  bg: 'linear-gradient(145deg,#1A1208,#2A1808,#F5F0E8)',
};

describe('adminCatalog helpers', () => {
  it('maps an existing product into the edit form', () => {
    expect(editFormFromProduct(sampleProduct)).toEqual({
      name: 'Ivory Silk Kurta Wedding Set',
      hook: 'Handwoven silk kurta for wedding celebrations',
      deal_label: 'Wedding special',
      is_featured: true,
      is_active: true,
      price: '8990',
      mrp: '12990',
      stock_qty: '12',
    });
  });

  it('does not use merchandising badge text as deal label', () => {
    const product = { ...sampleProduct, deal_label: '' };
    expect(editFormFromProduct(product).deal_label).toBe('');
  });

  it('falls back to list-row pricing when variants are missing', () => {
    const product = {
      ...sampleProduct,
      variants: undefined,
      variant_id: 42,
      price: 7500,
      mrp: 9900,
      available_qty: 5,
    };
    expect(editFormFromProduct(product)).toMatchObject({
      price: '7500',
      mrp: '9900',
      stock_qty: '5',
    });
  });

  it('resolves the primary variant id from detail or list payloads', () => {
    expect(primaryVariantId(sampleProduct)).toBe(42);
    expect(primaryVariantId({ ...sampleProduct, variants: undefined, variant_id: 99 })).toBe(99);
    expect(primaryVariantId({ ...sampleProduct, variants: undefined, variant_id: undefined, default_variant_id: 55 })).toBe(55);
    expect(primaryVariantId({ ...sampleProduct, variants: [], variant_id: undefined, default_variant_id: undefined })).toBeNull();
  });
});
