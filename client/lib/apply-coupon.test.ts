import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
vi.mock('@/lib/api', () => ({ api }));

import { applyCouponCode } from './apply-coupon';
import { useCartStore } from '@/store/cartStore';

const product = { id: 'product-1', variants: [] } as never;
beforeEach(() => {
  vi.clearAllMocks();
  useCartStore.setState({ items: [{ product, variantId: 'variant-1', size: 'M', color: 'Black', quantity: 2, price: 1000 }], coupon: undefined, couponDiscount: 0, freeShipping: false });
  api.get.mockResolvedValue({ data: { data: { items: [{ product: 'product-1', variant: 'variant-1' }] } } });
  api.put.mockResolvedValue({ data: { data: {} } });
});

describe('shared coupon application', () => {
  it('updates the one cart source only after server confirmation', async () => {
    api.post.mockResolvedValue({ data: { data: { coupon: 'CRUISIN10', discount: 200, freeShipping: false, eligibleSubtotal: 2000 } } });
    await expect(applyCouponCode('cruisin10')).resolves.toMatchObject({ coupon: 'CRUISIN10', discount: 200 });
    expect(useCartStore.getState()).toMatchObject({ coupon: 'CRUISIN10', couponDiscount: 200, freeShipping: false });
    expect(api.post).toHaveBeenCalledWith('/cart/coupon', { code: 'cruisin10' });
  });

  it('does not fake applied state when the server rejects the offer', async () => {
    api.post.mockRejectedValue(new Error('Coupon is not active'));
    await expect(applyCouponCode('CRUISIN10')).rejects.toThrow('not active');
    expect(useCartStore.getState()).toMatchObject({ coupon: undefined, couponDiscount: 0, freeShipping: false });
  });
});
