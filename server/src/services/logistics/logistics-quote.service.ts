// Governed by .rules v1.0
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { logisticsConfig } from '../../config/logistics.js';
import { CartModel } from '../../models/cart.model.js';
import { LogisticsQuoteModel } from '../../models/logistics-quote.model.js';
import { ProductModel } from '../../models/product.model.js';
import type { CourierRate, PackageMeasurement } from '../../types/logistics.types.js';
import { ApiError } from '../../utils/api-error.js';
import { getLogisticsProvider } from './provider-factory.js';
import { calculatePackage, type PackageLine } from './package-calculator.js';

interface PricedCartLine {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  packageLine: PackageLine;
}

export interface ValidatedQuote {
  quoteId: string;
  shippingMethod: 'standard' | 'express';
  shippingCharge: number;
  package: PackageMeasurement;
  option: {
    courierId: number;
    courierName: string;
    providerCost: number;
    codCharge: number;
    shippingMode: 'surface' | 'air' | 'unknown';
    estimatedDeliveryDays?: number;
    estimatedDeliveryDate?: string;
  };
}

const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const idString = (value: unknown): string => value instanceof Types.ObjectId ? value.toString() : String(value ?? '');

const loadCartLines = async (userId: string): Promise<PricedCartLine[]> => {
  const cart = await CartModel.findOne({ user: userId }).lean();
  if (!cart?.items.length) throw new ApiError(400, 'Cart is empty');
  const productIds = [...new Set(cart.items.map((item) => idString(item.product)))];
  const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  return cart.items.map((item) => {
    const productId = idString(item.product);
    const variantId = idString(item.variant);
    const product = byId.get(productId);
    if (!product || product.status !== 'published' || product.visibility !== 'visible' || !product.isActive || product.isArchived) {
      throw new ApiError(409, 'A product in your bag is no longer available');
    }
    const variant = product.variants.find((candidate) => String(candidate._id) === variantId);
    if (!variant || variant.enabled === false || variant.stock < item.quantity) throw new ApiError(409, `Selected variant is unavailable for ${product.title}`);
    return {
      productId,
      variantId,
      quantity: item.quantity,
      price: money(variant.priceOverride ?? variant.price),
      packageLine: { product, variant, quantity: item.quantity }
    };
  });
};

export const cartFingerprint = (lines: Array<{
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  packageLine?: PackageLine;
}>): string => crypto
  .createHash('sha256')
  .update(JSON.stringify(lines.map((line) => {
    const product = line.packageLine?.product;
    const variant = line.packageLine?.variant;
    return [
      line.productId,
      line.variantId,
      line.quantity,
      money(line.price),
      variant?.weight ?? product?.weight ?? null,
      variant?.dimensions?.length ?? product?.dimensions?.length ?? null,
      variant?.dimensions?.width ?? product?.dimensions?.width ?? null,
      variant?.dimensions?.height ?? product?.dimensions?.height ?? null,
      product?.packagingWeight ?? null,
      product?.defaultPackagePreset ?? null,
      product?.maximumQuantityPerPackage ?? null
    ];
  }).sort((a, b) => String(a[0]).localeCompare(String(b[0])))))
  .digest('hex');

interface QuoteOptionInput {
  code: 'standard' | 'express';
  label: string;
  shippingCharge: number;
  providerCost: number;
  codCharge: number;
  courierId: number;
  courierName: string;
  shippingMode: 'surface' | 'air' | 'unknown';
  estimatedDeliveryDays?: number;
  estimatedDeliveryDate?: string;
  codAvailable: boolean;
}

const customerOptions = (couriers: CourierRate[], freeShipping: boolean): QuoteOptionInput[] => {
  const eligible = couriers.filter((courier) => courier.serviceable).sort((a, b) => a.totalCharge - b.totalCharge);
  const standard = eligible.find((courier) => courier.shippingMode === 'surface') ?? eligible[0];
  const express = [...eligible].sort((a, b) => (a.estimatedDeliveryDays ?? 999) - (b.estimatedDeliveryDays ?? 999) || a.totalCharge - b.totalCharge)
    .find((courier) => courier.courierId !== standard?.courierId) ?? eligible.find((courier) => courier.shippingMode === 'air');
  const options: QuoteOptionInput[] = [];
  if (standard) options.push({ code: 'standard', label: 'Standard delivery', shippingCharge: freeShipping ? 0 : money(standard.totalCharge), providerCost: money(standard.freightCharge), codCharge: money(standard.codCharge), courierId: standard.courierId, courierName: standard.courierName, shippingMode: standard.shippingMode, estimatedDeliveryDays: standard.estimatedDeliveryDays, estimatedDeliveryDate: standard.estimatedDeliveryDate, codAvailable: standard.codAvailable });
  if (express) options.push({ code: 'express', label: 'Express delivery', shippingCharge: freeShipping ? 0 : money(express.totalCharge), providerCost: money(express.freightCharge), codCharge: money(express.codCharge), courierId: express.courierId, courierName: express.courierName, shippingMode: express.shippingMode, estimatedDeliveryDays: express.estimatedDeliveryDays, estimatedDeliveryDate: express.estimatedDeliveryDate, codAvailable: express.codAvailable });
  return options;
};

export const LogisticsQuoteService = {
  async create(userId: string, input: { deliveryPostcode: string; paymentMode: 'prepaid' | 'cod'; freeShipping?: boolean }): Promise<unknown> {
    if (!logisticsConfig.enabled) throw new ApiError(404, 'Live courier quotes are not enabled');
    const lines = await loadCartLines(userId);
    const packageMeasurement = await calculatePackage(lines.map((line) => line.packageLine));
    const subtotal = money(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
    const rates = await getLogisticsProvider().getRates({
      pickupPostcode: logisticsConfig.pickupPostcode ?? '560001',
      deliveryPostcode: input.deliveryPostcode,
      paymentMode: input.paymentMode,
      weightKg: packageMeasurement.deadWeightKg,
      lengthCm: packageMeasurement.lengthCm,
      breadthCm: packageMeasurement.breadthCm,
      heightCm: packageMeasurement.heightCm,
      declaredValue: subtotal
    });
    if (!rates.serviceable) throw new ApiError(400, 'Delivery is unavailable for this pincode');
    const options = customerOptions(rates.couriers, logisticsConfig.customerFreeShipping || Boolean(input.freeShipping));
    if (options.length === 0) throw new ApiError(400, 'No eligible courier option is available');
    const quoteId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + logisticsConfig.quoteTtlSeconds * 1_000);
    const quote = await LogisticsQuoteModel.create({
      quoteId,
      user: userId,
      cartFingerprint: cartFingerprint(lines),
      deliveryPostcode: input.deliveryPostcode,
      pickupPostcode: logisticsConfig.pickupPostcode ?? '560001',
      paymentMode: input.paymentMode,
      subtotal,
      declaredValue: subtotal,
      package: packageMeasurement,
      options,
      expiresAt
    });
    return quote.toObject();
  },

  async validate(userId: string, input: { quoteId?: string; shippingMethod: 'standard' | 'express'; paymentMode: 'prepaid' | 'cod'; deliveryPostcode: string; freeShipping?: boolean }): Promise<ValidatedQuote> {
    if (!logisticsConfig.enabled) throw new ApiError(500, 'Quote validation is unavailable while logistics is disabled');
    if (!input.quoteId) throw new ApiError(400, 'Refresh delivery options before placing this order');
    const quote = await LogisticsQuoteModel.findOne({ quoteId: input.quoteId, user: userId });
    if (!quote) throw new ApiError(400, 'Delivery quote is invalid');
    if (quote.expiresAt.getTime() <= Date.now()) throw new ApiError(409, 'Delivery quote expired; refresh delivery options');
    if (quote.consumedAt) throw new ApiError(409, 'Delivery quote was already used');
    if (quote.paymentMode !== input.paymentMode || quote.deliveryPostcode !== input.deliveryPostcode) throw new ApiError(409, 'Delivery details changed; refresh delivery options');
    const lines = await loadCartLines(userId);
    if (quote.cartFingerprint !== cartFingerprint(lines)) throw new ApiError(409, 'Your bag changed; refresh delivery options');
    const option = quote.options.find((candidate) => candidate.code === input.shippingMethod);
    if (!option || (input.paymentMode === 'cod' && !option.codAvailable)) throw new ApiError(409, 'Selected delivery option is no longer available');
    const shippingCharge = logisticsConfig.customerFreeShipping || input.freeShipping ? 0 : option.shippingCharge;
    return {
      quoteId: quote.quoteId,
      shippingMethod: option.code,
      shippingCharge,
      package: quote.package as PackageMeasurement,
      option: {
        courierId: option.courierId,
        courierName: option.courierName,
        providerCost: option.providerCost,
        codCharge: option.codCharge,
        shippingMode: option.shippingMode,
        estimatedDeliveryDays: option.estimatedDeliveryDays ?? undefined,
        estimatedDeliveryDate: option.estimatedDeliveryDate ?? undefined
      }
    };
  },

  async consume(quoteId: string): Promise<void> {
    await LogisticsQuoteModel.updateOne({ quoteId, consumedAt: { $exists: false } }, { $set: { consumedAt: new Date() } });
  }
};
