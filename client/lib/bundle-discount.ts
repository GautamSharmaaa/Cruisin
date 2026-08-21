// Governed by .rules v1.0
import type { Product } from '@/types/product.types';

export interface BundleCartLine { product: Product; quantity: number; }
export interface AutomaticBundleDiscount { amount: number; eligibleProductCount: number; threshold: 2 | 3 | null; anchorProductId?: string; }
export interface RecommendationBundlePricing {
  source: 'manual' | 'frequently_bought_together' | 'best_sellers';
  anchorProductId?: string;
  eligibleProductIds: string[];
  bundleDiscount: { enabled: boolean; twoItemDiscount: number; threeItemDiscount: number };
}

const money = (value: number): number => Math.max(0, Math.round((value + Number.EPSILON) * 100) / 100);
const TWO_ITEM_DISCOUNT_CAP = 100;
const THREE_ITEM_DISCOUNT_CAP = 300;
const DEFAULT_BUNDLE_DISCOUNT = { enabled: true, twoItemDiscount: TWO_ITEM_DISCOUNT_CAP, threeItemDiscount: THREE_ITEM_DISCOUNT_CAP };

export const recommendationBundleDiscount = (lines: BundleCartLine[], recommendation?: RecommendationBundlePricing): number | undefined => {
  if (!recommendation) return undefined;
  const cartIds = new Set(lines.filter((line) => line.quantity > 0).map((line) => line.product.id));
  const eligibleIds = cartIds;
  const eligibleItemCount = lines.reduce((count, line) => (
    line.quantity > 0 && eligibleIds.has(line.product.id) ? count + line.quantity : count
  ), 0);
  if (eligibleItemCount >= 3) return Math.min(THREE_ITEM_DISCOUNT_CAP, money(recommendation.bundleDiscount.threeItemDiscount));
  if (eligibleItemCount >= 2) return Math.min(TWO_ITEM_DISCOUNT_CAP, money(recommendation.bundleDiscount.twoItemDiscount));
  return 0;
};

export const automaticBundleDiscount = (lines: BundleCartLine[]): AutomaticBundleDiscount => {
  const visibleLines = lines.filter((line) => line.quantity > 0);
  const cartIds = new Set(visibleLines.map((line) => line.product.id));
  let best: AutomaticBundleDiscount = { amount: 0, eligibleProductCount: 0, threshold: null };
  for (const line of visibleLines) {
    const config = line.product.completeTheFit;
    const eligibleIds = cartIds;
    const eligibleProductCount = visibleLines.reduce((count, eligibleLine) => (
      eligibleIds.has(eligibleLine.product.id) ? count + eligibleLine.quantity : count
    ), 0);
    const twoItemDiscount = Math.min(TWO_ITEM_DISCOUNT_CAP, money(config?.bundleDiscount?.twoItemDiscount ?? DEFAULT_BUNDLE_DISCOUNT.twoItemDiscount));
    const threeItemDiscount = Math.min(THREE_ITEM_DISCOUNT_CAP, money(config?.bundleDiscount?.threeItemDiscount ?? DEFAULT_BUNDLE_DISCOUNT.threeItemDiscount));
    const threshold = eligibleProductCount >= 3 && threeItemDiscount > 0 ? 3 : eligibleProductCount >= 2 && twoItemDiscount > 0 ? 2 : null;
    const amount = threshold === 3 ? threeItemDiscount : threshold === 2 ? twoItemDiscount : 0;
    if (amount > best.amount || (amount === best.amount && eligibleProductCount > best.eligibleProductCount)) best = { amount, eligibleProductCount, threshold, anchorProductId: line.product.id };
  }
  return best;
};

export const combinedCartDiscount = (lines: BundleCartLine[], couponDiscount: number, subtotal: number, bundleDiscountOverride?: number): { couponDiscount: number; bundleDiscount: number; totalDiscount: number } => {
  const bundleDiscount = money(bundleDiscountOverride ?? automaticBundleDiscount(lines).amount);
  const safeCoupon = money(couponDiscount);
  return { couponDiscount: safeCoupon, bundleDiscount, totalDiscount: Math.min(Math.max(0, subtotal), money(safeCoupon + bundleDiscount)) };
};
