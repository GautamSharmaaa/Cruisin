import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cartModel, couponModel, productModel, couponUserUsageLimit, couponUsesForCustomer } = vi.hoisted(() => ({
  cartModel: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
  couponModel: { findOne: vi.fn() },
  productModel: { find: vi.fn() },
  couponUserUsageLimit: vi.fn((coupon: { code: string; userUsageLimit?: number | null }) => coupon.code === 'CRUISIN10' ? 1 : coupon.userUsageLimit ?? 1),
  couponUsesForCustomer: vi.fn()
}));

vi.mock('../models/cart.model.js', () => ({ CartModel: cartModel }));
vi.mock('../models/coupon.model.js', () => ({ CouponModel: couponModel }));
vi.mock('../models/product.model.js', () => ({ ProductModel: productModel }));
vi.mock('./coupon-redemption.service.js', () => ({ couponUserUsageLimit, couponUsesForCustomer }));

import { CartService } from './cart.service.js';

const productId = '665f6d8403bd2edc93800000';
const variantId = '665f6d8403bd2edc93800001';
const owner = { sessionId: 'qa-session-12345' };
const product = (stock = 5, price = 125) => ({
  _id: productId,
  title: 'Cruisin test piece',
  status: 'published',
  visibility: 'visible',
  isActive: true,
  isArchived: false,
  variants: [{ _id: variantId, enabled: true, stock, price }]
});
const productQuery = (value: unknown) => ({ lean: vi.fn().mockResolvedValue(value) });
const latestCartQuery = (value: unknown) => ({ populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(value) }) });
const updatedCart = (value: Record<string, unknown>) => ({ ...value, populate: vi.fn().mockResolvedValue(value) });

beforeEach(() => {
  vi.resetAllMocks();
  couponUsesForCustomer.mockResolvedValue(0);
});

describe('CartService authoritative mutations and version guards', () => {
  it('rejects a guest request without an isolated session identifier', async () => {
    await expect(CartService.get()).rejects.toMatchObject({ statusCode: 400 });
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  it('rejects an additive quantity that exceeds current variant stock', async () => {
    cartModel.findOneAndUpdate.mockResolvedValueOnce({ _id: 'cart-1', version: 4, items: [{ product: productId, variant: variantId, quantity: 2 }] });
    productModel.find.mockReturnValue(productQuery([product(3)]));

    await expect(CartService.add(undefined, owner.sessionId, { product: productId, variant: variantId, quantity: 2, expectedVersion: 4 }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(cartModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('updates quantity, price, and version in one guarded cart write', async () => {
    const cart = { _id: 'cart-1', version: 7, items: [{ product: productId, variant: variantId, quantity: 1 }] };
    const authoritative = { version: 8, items: [{ product: productId, variant: variantId, quantity: 3, price: 125 }] };
    cartModel.findOne.mockResolvedValue(cart);
    cartModel.findOneAndUpdate.mockResolvedValue(updatedCart(authoritative));
    productModel.find.mockReturnValue(productQuery([product(5)]));

    await expect(CartService.update(undefined, owner.sessionId, { product: productId, variant: variantId, quantity: 3, expectedVersion: 7 }))
      .resolves.toEqual(authoritative);
    expect(cartModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'cart-1', version: 7 },
      expect.objectContaining({
        $set: expect.objectContaining({ items: [expect.objectContaining({ quantity: 3, price: 125 })] }),
        $unset: { couponCode: 1 },
        $inc: { version: 1 }
      }),
      { new: true }
    );
  });

  it('allows quantities above twenty when current stock is sufficient', async () => {
    const cart = { _id: 'cart-1', version: 0, items: [{ product: productId, variant: variantId, quantity: 20 }] };
    const authoritative = { version: 1, items: [{ product: productId, variant: variantId, quantity: 30, price: 125 }] };
    cartModel.findOneAndUpdate.mockResolvedValueOnce(cart).mockResolvedValueOnce(updatedCart(authoritative));
    productModel.find.mockReturnValue(productQuery([product(50)]));

    await expect(CartService.add(undefined, owner.sessionId, { product: productId, variant: variantId, quantity: 10, expectedVersion: 0 }))
      .resolves.toEqual(authoritative);
  });

  it('atomically replaces client seed items with authoritative prices', async () => {
    const cart = { _id: 'cart-1', version: 0, items: [] };
    const authoritative = { version: 1, items: [{ product: productId, variant: variantId, quantity: 2, price: 125 }] };
    cartModel.findOneAndUpdate.mockResolvedValueOnce(cart).mockResolvedValueOnce(updatedCart(authoritative));
    productModel.find.mockReturnValue(productQuery([product(5)]));

    await expect(CartService.sync(undefined, owner.sessionId, [{ product: productId, variant: variantId, quantity: 2 }], 0))
      .resolves.toEqual(authoritative);
    expect(cartModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { _id: 'cart-1', $or: [{ version: 0 }, { version: { $exists: false } }] },
      expect.objectContaining({ $set: expect.objectContaining({ items: [expect.objectContaining({ quantity: 2, price: 125 })] }), $inc: { version: 1 } }),
      { new: true }
    );
  });

  it('removes a line and increments the version without loading products for an empty result', async () => {
    const cart = { _id: 'cart-1', version: 2, items: [{ product: productId, variant: variantId, quantity: 1 }] };
    const authoritative = { version: 3, items: [] };
    cartModel.findOne.mockResolvedValue(cart);
    cartModel.findOneAndUpdate.mockResolvedValue(updatedCart(authoritative));

    await expect(CartService.remove(undefined, owner.sessionId, productId, variantId, 2)).resolves.toEqual(authoritative);
    expect(productModel.find).not.toHaveBeenCalled();
  });

  it('returns the latest authoritative cart when expectedVersion is stale', async () => {
    const latest = { version: 5, items: [{ product: productId, variant: variantId, quantity: 2, price: 125 }] };
    cartModel.findOne.mockResolvedValueOnce({ _id: 'cart-1', version: 5, items: latest.items }).mockReturnValueOnce(latestCartQuery(latest));

    await expect(CartService.update(undefined, owner.sessionId, { product: productId, variant: variantId, quantity: 3, expectedVersion: 4 }))
      .rejects.toMatchObject({ statusCode: 409, data: latest });
    expect(productModel.find).not.toHaveBeenCalled();
  });

  it('applies a valid coupon with one product batch and one versioned cart write', async () => {
    const now = Date.now();
    const cart = { _id: 'cart-1', version: 9, items: [{ product: productId, variant: variantId, quantity: 2 }] };
    const authoritative = { version: 10, couponCode: 'CRUISIN10', couponDiscount: 25, couponFreeShipping: false, items: [{ product: productId, variant: variantId, quantity: 2, price: 125 }] };
    const coupon = { _id: '665f6d8403bd2edc93800002', code: 'CRUISIN10', type: 'percentage', value: 10, minOrderValue: 0, userUsageLimit: 1, usedCount: 0, validFrom: new Date(now - 10_000), validUntil: new Date(now + 10_000), isActive: true };
    cartModel.findOne.mockResolvedValue(cart);
    cartModel.findOneAndUpdate.mockResolvedValue(updatedCart(authoritative));
    productModel.find.mockReturnValue(productQuery([product(5)]));
    couponModel.findOne.mockResolvedValue(coupon);

    await expect(CartService.applyCoupon('665f6d8403bd2edc93800003', undefined, 'cruisin10', 9)).resolves.toMatchObject({ coupon: 'CRUISIN10', discount: 25, version: 10, cart: authoritative });
    expect(productModel.find).toHaveBeenCalledTimes(1);
    expect(couponModel.findOne).toHaveBeenCalledTimes(1);
    expect(cartModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid coupon without changing the authoritative cart', async () => {
    cartModel.findOne.mockResolvedValue({ _id: 'cart-1', version: 2, items: [{ product: productId, variant: variantId, quantity: 1 }] });
    productModel.find.mockReturnValue(productQuery([product()]));
    couponModel.findOne.mockResolvedValue(null);

    await expect(CartService.applyCoupon(undefined, owner.sessionId, 'NOTREAL', 2)).rejects.toMatchObject({ statusCode: 400 });
    expect(cartModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an expired coupon without clearing the existing confirmed coupon', async () => {
    const now = Date.now();
    cartModel.findOne.mockResolvedValue({ _id: 'cart-1', version: 3, couponCode: 'WELCOME', couponDiscount: 20, items: [{ product: productId, variant: variantId, quantity: 1 }] });
    productModel.find.mockReturnValue(productQuery([product()]));
    couponModel.findOne.mockResolvedValue({ code: 'EXPIRED', type: 'fixed', value: 50, minOrderValue: 0, validFrom: new Date(now - 20_000), validUntil: new Date(now - 10_000) });

    await expect(CartService.applyCoupon(undefined, owner.sessionId, 'EXPIRED', 3)).rejects.toThrow('Coupon is not active');
    expect(cartModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a coupon when the authoritative subtotal is below its minimum', async () => {
    const now = Date.now();
    cartModel.findOne.mockResolvedValue({ _id: 'cart-1', version: 4, items: [{ product: productId, variant: variantId, quantity: 1 }] });
    productModel.find.mockReturnValue(productQuery([product(5, 125)]));
    couponModel.findOne.mockResolvedValue({ code: 'MINIMUM', type: 'percentage', value: 10, minOrderValue: 500, validFrom: new Date(now - 10_000), validUntil: new Date(now + 10_000) });

    await expect(CartService.applyCoupon(undefined, owner.sessionId, 'MINIMUM', 4)).rejects.toThrow('Order does not meet coupon minimum');
    expect(cartModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a stale coupon request before loading products or coupon rules', async () => {
    const latest = { version: 8, couponCode: 'WELCOME', items: [{ product: productId, variant: variantId, quantity: 1, price: 125 }] };
    cartModel.findOne.mockResolvedValueOnce({ _id: 'cart-1', ...latest }).mockReturnValueOnce(latestCartQuery(latest));

    await expect(CartService.applyCoupon(undefined, owner.sessionId, 'CRUISIN10', 7)).rejects.toMatchObject({ statusCode: 409, data: latest });
    expect(productModel.find).not.toHaveBeenCalled();
    expect(couponModel.findOne).not.toHaveBeenCalled();
  });

  it('returns coupon and quantity-based milestone savings from one calculation pass', async () => {
    const now = Date.now();
    const bundleProduct = {
      ...product(5, 1_000),
      completeTheFit: { strategy: 'best_sellers', bundleDiscount: { enabled: true, twoItemDiscount: 100, threeItemDiscount: 300 } }
    };
    const cart = { _id: 'cart-1', version: 5, items: [{ product: productId, variant: variantId, quantity: 2 }] };
    const authoritative = { version: 6, couponCode: 'CRUISIN10', couponDiscount: 200, items: [{ product: productId, variant: variantId, quantity: 2, price: 1_000 }] };
    cartModel.findOne.mockResolvedValue(cart);
    cartModel.findOneAndUpdate.mockResolvedValue(updatedCart(authoritative));
    productModel.find.mockReturnValue(productQuery([bundleProduct]));
    couponModel.findOne.mockResolvedValue({ code: 'CRUISIN10', type: 'percentage', value: 10, minOrderValue: 0, validFrom: new Date(now - 10_000), validUntil: new Date(now + 10_000) });

    await expect(CartService.applyCoupon(undefined, owner.sessionId, 'CRUISIN10', 5)).resolves.toMatchObject({ discount: 200, bundleDiscount: 100, version: 6 });
    expect(productModel.find).toHaveBeenCalledTimes(1);
  });

  it('rejects a one-time coupon already used by the signed-in customer', async () => {
    const now = Date.now();
    cartModel.findOne.mockResolvedValue({ _id: 'cart-1', version: 2, items: [{ product: productId, variant: variantId, quantity: 1 }] });
    productModel.find.mockReturnValue(productQuery([product()]));
    couponModel.findOne.mockResolvedValue({ _id: '665f6d8403bd2edc93800002', code: 'ONCE', type: 'fixed', value: 50, minOrderValue: 0, userUsageLimit: 1, validFrom: new Date(now - 10_000), validUntil: new Date(now + 10_000) });
    couponUsesForCustomer.mockResolvedValue(1);

    await expect(CartService.applyCoupon('665f6d8403bd2edc93800003', undefined, 'ONCE', 2)).rejects.toMatchObject({ statusCode: 409 });
    expect(cartModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('removes a coupon with one version-guarded write', async () => {
    const authoritative = { version: 4, couponDiscount: 0, couponFreeShipping: false, items: [] };
    cartModel.findOne.mockResolvedValue({ _id: 'cart-1', version: 3, items: [] });
    cartModel.findOneAndUpdate.mockResolvedValue(updatedCart(authoritative));

    await expect(CartService.removeCoupon(undefined, owner.sessionId, 3)).resolves.toEqual(authoritative);
    expect(cartModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'cart-1', version: 3 },
      expect.objectContaining({
        $set: expect.objectContaining({ couponDiscount: 0 }),
        $unset: { couponCode: 1 },
        $inc: { version: 1 }
      }),
      { new: true }
    );
  });

  it('rejects duplicate product/variant lines in a synchronized cart', async () => {
    const item = { product: productId, variant: variantId, quantity: 1 };
    await expect(CartService.sync(undefined, owner.sessionId, [item, item])).rejects.toMatchObject({ statusCode: 400 });
    expect(productModel.find).not.toHaveBeenCalled();
  });
});
