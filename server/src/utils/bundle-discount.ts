// Governed by .rules v1.0
export type BundleRecommendationStrategy = 'manual' | 'frequently_bought_together' | 'best_sellers';

export interface BundleDiscountConfiguration {
  enabled?: boolean;
  twoItemDiscount?: number;
  threeItemDiscount?: number;
}

export interface BundleDiscountProduct {
  id: string;
  recommendedProductIds: string[];
  strategy?: BundleRecommendationStrategy;
  bundleDiscount?: BundleDiscountConfiguration;
}

export interface BundleDiscountLine { productId: string; quantity: number; }

export interface BundleDiscountResult {
  amount: number;
  eligibleProductCount: number;
  threshold: 2 | 3 | null;
  anchorProductId?: string;
  label: string;
}

const money = (value: number): number => Math.max(0, Math.round((value + Number.EPSILON) * 100) / 100);
const TWO_ITEM_DISCOUNT_CAP = 100;
const THREE_ITEM_DISCOUNT_CAP = 300;

export const calculateBundleDiscount = (lines: BundleDiscountLine[], products: BundleDiscountProduct[]): BundleDiscountResult => {
  const visibleLines = lines.filter((line) => line.quantity > 0);
  const distinctCartIds = Array.from(new Set(visibleLines.map((line) => line.productId)));
  const cartIdSet = new Set(distinctCartIds);
  let best: BundleDiscountResult = { amount: 0, eligibleProductCount: 0, threshold: null, label: '' };

  for (const product of products) {
    if (!cartIdSet.has(product.id) || product.bundleDiscount?.enabled !== true) continue;
    const eligibleIds = product.strategy === 'manual'
      ? new Set([product.id, ...product.recommendedProductIds])
      : cartIdSet;
    const eligibleProductCount = visibleLines.reduce((count, line) => (
      eligibleIds.has(line.productId) ? count + line.quantity : count
    ), 0);
    const twoItemDiscount = Math.min(TWO_ITEM_DISCOUNT_CAP, money(product.bundleDiscount.twoItemDiscount ?? 0));
    const threeItemDiscount = Math.min(THREE_ITEM_DISCOUNT_CAP, money(product.bundleDiscount.threeItemDiscount ?? 0));
    const threshold = eligibleProductCount >= 3 && threeItemDiscount > 0 ? 3 : eligibleProductCount >= 2 && twoItemDiscount > 0 ? 2 : null;
    const amount = threshold === 3 ? threeItemDiscount : threshold === 2 ? twoItemDiscount : 0;
    if (amount > best.amount || (amount === best.amount && eligibleProductCount > best.eligibleProductCount)) {
      best = {
        amount,
        eligibleProductCount,
        threshold,
        anchorProductId: product.id,
        label: threshold ? `${threshold}-piece Complete the Fit saving` : ''
      };
    }
  }
  return best;
};
