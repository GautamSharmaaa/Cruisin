// Governed by .rules v1.0
import { Types } from 'mongoose';
import { CartModel } from '../models/cart.model.js';
import { CouponModel } from '../models/coupon.model.js';
import { ProductModel } from '../models/product.model.js';
import { ApiError } from '../utils/api-error.js';
import { calculateBundleDiscount, type BundleDiscountProduct } from '../utils/bundle-discount.js';
import { calculateCouponDiscount } from '../utils/coupon-discount.js';
import { recordPerformanceStage } from '../utils/request-performance.js';
import { couponUserUsageLimit, couponUsesForCustomer } from './coupon-redemption.service.js';

const cartExpiry = (): Date => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const ownerQuery = (userId?: string, sessionId?: string): Record<string, string> => {
  if (userId) return { user: userId };
  if (!sessionId || sessionId.length <= 8) throw new ApiError(400, 'A valid guest session is required');
  return { sessionId };
};

type CartLineInput = { product: string; variant: string; quantity: number };
type VersionedInput = { expectedVersion?: number };
type ProductForCart = {
  _id: unknown;
  title: string;
  status: string;
  visibility: string;
  isActive: boolean;
  isArchived?: boolean;
  category?: unknown;
  categoryIds?: unknown[];
  recommendedProducts?: unknown[];
  completeTheFit?: {
    strategy?: 'manual' | 'frequently_bought_together' | 'best_sellers';
    bundleDiscount?: { enabled?: boolean; twoItemDiscount?: number; threeItemDiscount?: number };
  };
  variants: Array<{ _id: unknown; enabled?: boolean; stock: number; price: number; priceOverride?: number | null }>;
};

const idString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (value && typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  return '';
};

const emptyCart = { items: [], version: 0, couponDiscount: 0, couponFreeShipping: false, couponEligibleSubtotal: 0 };
const clearCoupon = {
  couponDiscount: 0,
  couponFreeShipping: false,
  couponEligibleSubtotal: 0
};

const populatedCart = async (owner: Record<string, string>): Promise<unknown> => (
  await CartModel.findOne(owner).populate('items.product').lean() ?? emptyCart
);

const currentVersion = (cart: { version?: number | null }): number => cart.version ?? 0;

const ensureExpectedVersion = async (
  owner: Record<string, string>,
  cart: { version?: number | null },
  expectedVersion?: number
): Promise<void> => {
  if (expectedVersion === undefined || expectedVersion === currentVersion(cart)) return;
  throw new ApiError(409, 'Your bag changed. Review the latest bag and try again.', [], true, await populatedCart(owner));
};

const versionMatch = (version: number): Record<string, unknown> => version === 0
  ? { $or: [{ version: 0 }, { version: { $exists: false } }] }
  : { version };

const throwStaleCart = async (owner: Record<string, string>): Promise<never> => {
  throw new ApiError(409, 'Your bag changed. Review the latest bag and try again.', [], true, await populatedCart(owner));
};

const ensureCart = async (owner: Record<string, string>) => {
  return await CartModel.findOneAndUpdate(
    owner,
    { $setOnInsert: { ...owner, items: [], expiresAt: cartExpiry(), version: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const loadProducts = async (items: CartLineInput[]): Promise<ProductForCart[]> => {
  const productIds = [...new Set(items.map((item) => item.product).filter((id) => Types.ObjectId.isValid(id)))];
  return await ProductModel.find({ _id: { $in: productIds } }).lean() as unknown as ProductForCart[];
};

const validatedItems = (items: CartLineInput[], products: ProductForCart[]) => {
  const productsById = new Map(products.map((product) => [idString(product._id), product]));
  return items.map((item) => {
    const product = productsById.get(item.product);
    if (!product || product.status !== 'published' || product.visibility !== 'visible' || !product.isActive || product.isArchived) {
      throw new ApiError(409, 'A product in your bag is no longer available');
    }
    const variant = product.variants.find((candidate) => idString(candidate._id) === item.variant && candidate.enabled !== false);
    if (!variant) throw new ApiError(409, `Selected variant is unavailable for ${product.title}`);
    if (item.quantity > variant.stock) throw new ApiError(409, `Only ${variant.stock} unit${variant.stock === 1 ? '' : 's'} remain for ${product.title}`);
    return {
      product: new Types.ObjectId(item.product),
      variant: new Types.ObjectId(item.variant),
      quantity: item.quantity,
      price: variant.priceOverride ?? variant.price
    };
  });
};

const mutateItems = async (
  owner: Record<string, string>,
  cart: { _id: unknown; version?: number | null },
  items: Array<{ product: Types.ObjectId; variant: Types.ObjectId; quantity: number; price: number }>
): Promise<unknown> => {
  const version = currentVersion(cart);
  const updated = await CartModel.findOneAndUpdate(
    { _id: cart._id, ...versionMatch(version) },
    {
      $set: { items, expiresAt: cartExpiry(), ...clearCoupon },
      $unset: { couponCode: 1 },
      $inc: { version: 1 }
    },
    { new: true }
  );
  if (!updated) return throwStaleCart(owner);
  return updated.populate('items.product');
};

const bundleProducts = (products: ProductForCart[]): BundleDiscountProduct[] => products.map((product) => ({
  id: idString(product._id),
  recommendedProductIds: (product.recommendedProducts ?? []).map(idString).filter(Boolean),
  strategy: product.completeTheFit?.strategy,
  bundleDiscount: product.completeTheFit?.bundleDiscount
}));

export const CartService = {
  async get(userId?: string, sessionId?: string): Promise<unknown> {
    return await recordPerformanceStage('cart.load', () => populatedCart(ownerQuery(userId, sessionId)));
  },

  async sync(userId: string | undefined, sessionId: string | undefined, items: CartLineInput[], expectedVersion?: number): Promise<unknown> {
    const uniqueKeys = new Set(items.map((item) => `${item.product}:${item.variant}`));
    if (uniqueKeys.size !== items.length) throw new ApiError(400, 'Cart contains duplicate items');
    const owner = ownerQuery(userId, sessionId);
    const cart = await recordPerformanceStage('cart.load', () => ensureCart(owner));
    await ensureExpectedVersion(owner, cart, expectedVersion);
    const products = await recordPerformanceStage('products', () => loadProducts(items));
    const authoritativeItems = recordPerformanceStage('variants', () => validatedItems(items, products));
    return await recordPerformanceStage('cart.write', () => mutateItems(owner, cart, authoritativeItems));
  },

  async add(userId: string | undefined, sessionId: string | undefined, input: CartLineInput & VersionedInput): Promise<unknown> {
    const owner = ownerQuery(userId, sessionId);
    const cart = await recordPerformanceStage('cart.load', () => ensureCart(owner));
    await ensureExpectedVersion(owner, cart, input.expectedVersion);
    const lines: CartLineInput[] = cart.items.map((item) => ({ product: idString(item.product), variant: idString(item.variant), quantity: item.quantity }));
    const existing = lines.find((item) => item.product === input.product && item.variant === input.variant);
    if (existing) existing.quantity += input.quantity;
    else lines.push({ product: input.product, variant: input.variant, quantity: input.quantity });
    const products = await recordPerformanceStage('products', () => loadProducts(lines));
    const authoritativeItems = recordPerformanceStage('variants', () => validatedItems(lines, products));
    return await recordPerformanceStage('cart.write', () => mutateItems(owner, cart, authoritativeItems));
  },

  async update(userId: string | undefined, sessionId: string | undefined, input: CartLineInput & VersionedInput): Promise<unknown> {
    const owner = ownerQuery(userId, sessionId);
    const cart = await recordPerformanceStage('cart.load', () => CartModel.findOne(owner));
    if (!cart) throw new ApiError(404, 'Cart not found');
    await ensureExpectedVersion(owner, cart, input.expectedVersion);
    const lines: CartLineInput[] = cart.items.map((item) => ({ product: idString(item.product), variant: idString(item.variant), quantity: item.quantity }));
    const item = lines.find((entry) => entry.product === input.product && entry.variant === input.variant);
    if (!item) throw new ApiError(404, 'Cart item not found');
    item.quantity = input.quantity;
    const products = await recordPerformanceStage('products', () => loadProducts(lines));
    const authoritativeItems = recordPerformanceStage('variants', () => validatedItems(lines, products));
    return await recordPerformanceStage('cart.write', () => mutateItems(owner, cart, authoritativeItems));
  },

  async remove(userId: string | undefined, sessionId: string | undefined, product: string, variant: string, expectedVersion?: number): Promise<unknown> {
    const owner = ownerQuery(userId, sessionId);
    const cart = await recordPerformanceStage('cart.load', () => CartModel.findOne(owner));
    if (!cart) throw new ApiError(404, 'Cart not found');
    await ensureExpectedVersion(owner, cart, expectedVersion);
    const remaining: CartLineInput[] = cart.items
      .filter((entry) => !(idString(entry.product) === product && idString(entry.variant) === variant))
      .map((item) => ({ product: idString(item.product), variant: idString(item.variant), quantity: item.quantity }));
    const products = remaining.length > 0 ? await recordPerformanceStage('products', () => loadProducts(remaining)) : [];
    const authoritativeItems = recordPerformanceStage('variants', () => validatedItems(remaining, products));
    return await recordPerformanceStage('cart.write', () => mutateItems(owner, cart, authoritativeItems));
  },

  async merge(userId: string, sessionId: string): Promise<unknown> {
    const owner = ownerQuery(userId);
    const [guestCart, userCart] = await recordPerformanceStage('cart.load', () => Promise.all([
      CartModel.findOne({ sessionId }),
      ensureCart(owner)
    ]));
    if (!guestCart?.items.length) return userCart.populate('items.product');
    const merged = new Map<string, CartLineInput>();
    for (const item of [...userCart.items, ...guestCart.items]) {
      const line = { product: idString(item.product), variant: idString(item.variant), quantity: item.quantity };
      const key = `${line.product}:${line.variant}`;
      const current = merged.get(key);
      if (current) current.quantity += line.quantity;
      else merged.set(key, line);
    }
    const lines = [...merged.values()];
    const products = await recordPerformanceStage('products', () => loadProducts(lines));
    const authoritativeItems = recordPerformanceStage('variants', () => validatedItems(lines, products));
    const result = await recordPerformanceStage('cart.write', () => mutateItems(owner, userCart, authoritativeItems));
    await guestCart.deleteOne();
    return result;
  },

  async applyCoupon(userId: string | undefined, sessionId: string | undefined, code: string, expectedVersion?: number): Promise<unknown> {
    const owner = ownerQuery(userId, sessionId);
    const cart = await recordPerformanceStage('cart', () => CartModel.findOne(owner));
    if (!cart || cart.items.length === 0) throw new ApiError(400, 'Cart is empty');
    await ensureExpectedVersion(owner, cart, expectedVersion);
    const normalizedCode = code.trim().toUpperCase();
    const lines = cart.items.map((item) => ({ product: idString(item.product), variant: idString(item.variant), quantity: item.quantity }));
    const couponPromise = recordPerformanceStage('coupon', () => CouponModel.findOne({ code: normalizedCode, isActive: true }));
    const [products, coupon, uses] = await Promise.all([
      recordPerformanceStage('products', () => loadProducts(lines)),
      couponPromise,
      userId ? recordPerformanceStage('usage', async () => {
        const loadedCoupon = await couponPromise;
        return loadedCoupon ? couponUsesForCustomer(userId, loadedCoupon) : 0;
      }) : Promise.resolve(0)
    ]);
    if (!coupon) throw new ApiError(400, 'Invalid coupon');
    if (userId && uses >= couponUserUsageLimit(coupon)) throw new ApiError(409, 'This coupon has already been used on this account');
    const authoritativeItems = recordPerformanceStage('variants', () => validatedItems(lines, products));
    const result = await recordPerformanceStage('calculation', () => calculateCouponDiscount(coupon, authoritativeItems, products));
    const bundleSaving = recordPerformanceStage('bundles', () => calculateBundleDiscount(
      authoritativeItems.map((item) => ({ productId: idString(item.product), quantity: item.quantity })),
      bundleProducts(products)
    ));
    const version = currentVersion(cart);
    const updated = await recordPerformanceStage('cart.write', () => CartModel.findOneAndUpdate(
      { _id: cart._id, ...versionMatch(version) },
      {
        $set: {
          items: authoritativeItems,
          couponCode: coupon.code,
          couponDiscount: result.discount,
          couponFreeShipping: result.freeShipping,
          couponEligibleSubtotal: result.eligibleSubtotal,
          expiresAt: cartExpiry()
        },
        $inc: { version: 1 }
      },
      { new: true }
    ));
    if (!updated) return throwStaleCart(owner);
    const authoritativeCart = await updated.populate('items.product');
    return {
      coupon: coupon.code,
      type: coupon.type,
      discount: result.discount,
      freeShipping: result.freeShipping,
      eligibleSubtotal: result.eligibleSubtotal,
      bundleDiscount: bundleSaving.amount,
      version: updated.version,
      cart: authoritativeCart
    };
  },

  async removeCoupon(userId: string | undefined, sessionId: string | undefined, expectedVersion?: number): Promise<unknown> {
    const owner = ownerQuery(userId, sessionId);
    const cart = await recordPerformanceStage('cart', () => CartModel.findOne(owner));
    if (!cart) throw new ApiError(404, 'Cart not found');
    await ensureExpectedVersion(owner, cart, expectedVersion);
    const version = currentVersion(cart);
    const updated = await recordPerformanceStage('cart.write', () => CartModel.findOneAndUpdate(
      { _id: cart._id, ...versionMatch(version) },
      {
        $set: { ...clearCoupon, expiresAt: cartExpiry() },
        $unset: { couponCode: 1 },
        $inc: { version: 1 }
      },
      { new: true }
    ));
    if (!updated) return throwStaleCart(owner);
    return updated.populate('items.product');
  }
};
