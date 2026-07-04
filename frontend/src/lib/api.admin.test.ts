import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('api.admin.getProduct', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('awaits the API response before normalizing product fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 7,
          name: 'Ivory Silk Kurta Wedding Set',
          hook: 'Handwoven silk kurta for wedding celebrations',
          deal_label: 'Wedding special',
          price: '8990.00',
          mrp: '12990.00',
          is_featured: true,
          is_active: true,
          variants: [{ id: 42, price: '8990.00', mrp: '12990.00', stock_qty: 12, available_qty: 12 }],
          images: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', {
      getItem: () => 'test-token',
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    const product = await api.admin.getProduct(7);

    expect(product.name).toBe('Ivory Silk Kurta Wedding Set');
    expect(product.hook).toBe('Handwoven silk kurta for wedding celebrations');
    expect(product.deal_label).toBe('Wedding special');
    expect(product.price).toBe(8990);
    expect(product.mrp).toBe(12990);
    expect(product.variants?.[0]?.stock_qty).toBe(12);
  });
});
