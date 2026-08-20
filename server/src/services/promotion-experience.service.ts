// Governed by .rules v1.0
import { Types } from 'mongoose';
import { CouponModel } from '../models/coupon.model.js';
import { SiteSettingsModel } from '../models/site-settings.model.js';
import type { PromotionExperienceInput } from '../validators/promotion-experience.validator.js';

export type PromotionExperienceStatus = 'live' | 'scheduled' | 'disabled' | 'expired' | 'linked_offer_inactive';

export interface CouponSummary {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'freeShipping';
  value: number;
  displayValue: string;
  discountLabel: string;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number | null;
  usedCount: number;
  userUsageLimit?: number | null;
  minOrderValue: number;
  maxDiscount?: number | null;
  applicableProductCount: number;
  applicableCategoryCount: number;
}

export const promotionExperienceDefaults: PromotionExperienceInput = {
  enabled: false,
  promotionId: null,
  campaignName: '',
  campaignKey: 'promotion-campaign',
  popupEnabled: true,
  bagMarqueeEnabled: true,
  checkoutStripEnabled: true,
  popupEyebrow: 'PRIVATE OFFER',
  popupHeadline: '{{discount}} OFF YOUR ORDER',
  popupDescription: 'Apply {{code}} and save on your CRUISIN order.',
  popupPrimaryCta: 'APPLY {{discount}} OFF',
  popupSecondaryCta: 'CONTINUE SHOPPING',
  marqueeAvailableText: '{{code}} · {{discount}} OFF · TAP TO APPLY',
  marqueeAppliedText: '{{code}} APPLIED ✓ · YOU SAVE {{saving}}',
  checkoutAvailableText: '{{code}} AVAILABLE · TAP TO APPLY {{discount}} OFF',
  checkoutAppliedText: '✓ {{code}} APPLIED · YOU SAVE {{saving}}',
  popupDelayMs: 2500,
  popupFrequency: 'once_per_session',
  startsAt: null,
  endsAt: null
};

const moneyLabel = (value: number): string => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
const couponLabels = (type: CouponSummary['type'], value: number): { displayValue: string; discountLabel: string } => {
  if (type === 'percentage') return { displayValue: `${value}% OFF`, discountLabel: `${value}%` };
  if (type === 'fixed') return { displayValue: `${moneyLabel(value)} OFF`, discountLabel: moneyLabel(value) };
  return { displayValue: 'FREE SHIPPING', discountLabel: 'FREE SHIPPING' };
};

const couponSummary = (coupon: Record<string, unknown> | null): CouponSummary | null => {
  if (!coupon) return null;
  const type = coupon.type as CouponSummary['type'];
  const value = Number(coupon.value ?? 0);
  return {
    id: String(coupon._id ?? ''),
    code: String(coupon.code ?? ''),
    type,
    value,
    ...couponLabels(type, value),
    isActive: coupon.isActive === true,
    validFrom: new Date(String(coupon.validFrom)),
    validUntil: new Date(String(coupon.validUntil)),
    usageLimit: typeof coupon.usageLimit === 'number' ? coupon.usageLimit : null,
    usedCount: Number(coupon.usedCount ?? 0),
    userUsageLimit: typeof coupon.userUsageLimit === 'number' ? coupon.userUsageLimit : null,
    minOrderValue: Number(coupon.minOrderValue ?? 0),
    maxDiscount: typeof coupon.maxDiscount === 'number' ? coupon.maxDiscount : null,
    applicableProductCount: Array.isArray(coupon.applicableProducts) ? coupon.applicableProducts.length : 0,
    applicableCategoryCount: Array.isArray(coupon.applicableCategories) ? coupon.applicableCategories.length : 0
  };
};

const normalizeConfig = (value: Record<string, unknown> | null | undefined): PromotionExperienceInput => ({
  ...promotionExperienceDefaults,
  ...(value ?? {}),
  promotionId: value?.promotionId ? String(value.promotionId) : null,
  startsAt: value?.startsAt ? new Date(String(value.startsAt)) : null,
  endsAt: value?.endsAt ? new Date(String(value.endsAt)) : null
});

export const promotionExperienceStatus = (config: PromotionExperienceInput, coupon: CouponSummary | null, now = new Date()): { status: PromotionExperienceStatus; reason?: string } => {
  if (!config.enabled) return { status: 'disabled' };
  if (config.endsAt && config.endsAt < now) return { status: 'expired' };
  if (!coupon) return { status: 'linked_offer_inactive', reason: 'The linked coupon is missing.' };
  if (!coupon.isActive) return { status: 'linked_offer_inactive', reason: 'The linked coupon is disabled.' };
  if (coupon.validUntil < now) return { status: 'linked_offer_inactive', reason: 'The linked coupon has expired.' };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { status: 'linked_offer_inactive', reason: 'The linked coupon usage limit has been reached.' };
  const startsAt = [config.startsAt, coupon.validFrom].filter((date): date is Date => date instanceof Date).sort((left, right) => right.getTime() - left.getTime())[0];
  if (startsAt && startsAt > now) return { status: 'scheduled' };
  return { status: 'live' };
};

const loadConfigAndCoupon = async (): Promise<{ config: PromotionExperienceInput; coupon: CouponSummary | null; updatedAt: Date | null; updatedBy: string | null }> => {
  const settings = await SiteSettingsModel.findOne({ singletonKey: 'global' }).select('promotionExperience updatedAt').lean();
  const raw = settings?.promotionExperience as unknown as Record<string, unknown> | undefined;
  const config = normalizeConfig(raw);
  const coupon = config.promotionId
    ? couponSummary(await CouponModel.findById(config.promotionId).lean() as unknown as Record<string, unknown> | null)
    : null;
  return {
    config,
    coupon,
    updatedAt: settings?.updatedAt ?? null,
    updatedBy: raw?.updatedBy ? String(raw.updatedBy) : null
  };
};

export const PromotionExperienceService = {
  async admin(now = new Date()): Promise<unknown> {
    const { config, coupon, updatedAt, updatedBy } = await loadConfigAndCoupon();
    return { config, linkedPromotion: coupon, ...promotionExperienceStatus(config, coupon, now), updatedAt, updatedBy };
  },

  async update(input: PromotionExperienceInput, updatedBy?: string, now = new Date()): Promise<unknown> {
    const promotionId = input.promotionId ? new Types.ObjectId(input.promotionId) : null;
    await SiteSettingsModel.findOneAndUpdate(
      { singletonKey: 'global' },
      { $set: { promotionExperience: { ...input, promotionId, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : null } }, $setOnInsert: { singletonKey: 'global' } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return this.admin(now);
  },

  async active(now = new Date()): Promise<unknown | null> {
    const { config, coupon } = await loadConfigAndCoupon();
    if (!coupon || promotionExperienceStatus(config, coupon, now).status !== 'live') return null;
    return {
      enabled: true,
      campaignKey: config.campaignKey,
      promotion: { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, displayValue: coupon.displayValue, discountLabel: coupon.discountLabel },
      placements: { popup: config.popupEnabled, bagMarquee: config.bagMarqueeEnabled, checkoutStrip: config.checkoutStripEnabled },
      popup: { eyebrow: config.popupEyebrow, headline: config.popupHeadline, description: config.popupDescription, primaryCta: config.popupPrimaryCta, secondaryCta: config.popupSecondaryCta, delayMs: config.popupDelayMs, frequency: config.popupFrequency },
      marquee: { available: config.marqueeAvailableText, applied: config.marqueeAppliedText },
      checkout: { available: config.checkoutAvailableText, applied: config.checkoutAppliedText },
      schedule: { startsAt: config.startsAt ?? null, endsAt: config.endsAt ?? null }
    };
  }
};
