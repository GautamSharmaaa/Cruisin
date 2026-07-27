import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cartModel, productModel } = vi.hoisted(() => ({
  cartModel: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
  productModel: { findOne: vi.fn() }
}));

vi.mock('../models/cart.model.js', () => ({ CartModel: cartModel }));
vi.mock('../models/product.model.js', () => ({ ProductModel: productModel }));

import { CartService } from './cart.service.js';

const productId = '665f6d8403bd2edc93800000';
const variantId = '665f6d8403bd2edc93800001';

beforeEach(() => vi.clearAllMocks());

describe('CartService ownership and stock guards', () => {
  it('rejects a guest request without an isolated session identifier', async () => {
    await expect(CartService.get()).rejects.toMatchObject({ statusCode: 400 });
    expect(cartModel.findOne).not.toHaveBeenCalled();
  });

  it('rejects an additive quantity that exceeds current variant stock', async () => {
    productModel.findOne.mockResolvedValue({ variants: [{ _id: variantId, enabled: true, stock: 3, price: 100 }] });
    cartModel.findOneAndUpdate.mockResolvedValue({ items: [{ product: productId, variant: variantId, quantity: 2 }], save: vi.fn() });
    await expect(CartService.add(undefined, 'qa-session-12345', { product: productId, variant: variantId, quantity: 2 })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects a direct quantity update that exceeds current variant stock', async () => {
    productModel.findOne.mockResolvedValue({ variants: [{ _id: variantId, enabled: true, stock: 2, price: 100 }] });
    cartModel.findOne.mockResolvedValue({ items: [{ product: productId, variant: variantId, quantity: 1 }], save: vi.fn() });
    await expect(CartService.update(undefined, 'qa-session-12345', { product: productId, variant: variantId, quantity: 3 })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('allows quantities above twenty when the variant has enough stock', async () => {
    productModel.findOne.mockResolvedValue({ variants: [{ _id: variantId, enabled: true, stock: 50, price: 100 }] });
    const cart = { items: [{ product: productId, variant: variantId, quantity: 20 }], save: vi.fn(), populate: vi.fn().mockResolvedValue({ items: [] }) };
    cartModel.findOneAndUpdate.mockResolvedValue(cart);
    await expect(CartService.add(undefined, 'qa-session-12345', { product: productId, variant: variantId, quantity: 10 })).resolves.toEqual({ items: [] });
    expect(cart.items[0]?.quantity).toBe(30);
  });
});
