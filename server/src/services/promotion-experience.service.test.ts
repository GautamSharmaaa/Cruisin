import { describe, expect, it } from 'vitest';
import { promotionExperienceDefaults, promotionExperienceStatus, type CouponSummary } from './promotion-experience.service.js';
import { promotionExperienceBodySchema } from '../validators/promotion-experience.validator.js';

const now = new Date('2026-08-20T12:00:00.000Z');
const coupon = (patch: Partial<CouponSummary> = {}): CouponSummary => ({
  id: '665f6d8403bd2edc93800000',
  code: 'CRUISIN10',
  type: 'percentage',
  value: 10,
  displayValue: '10% OFF',
  discountLabel: '10%',
  isActive: true,
  validFrom: new Date('2026-08-01T00:00:00.000Z'),
  validUntil: new Date('2026-09-01T00:00:00.000Z'),
  usageLimit: 100,
  usedCount: 4,
  userUsageLimit: 1,
  minOrderValue: 0,
  maxDiscount: null,
  applicableProductCount: 0,
  applicableCategoryCount: 0,
  ...patch
});

describe('promotion experience evaluation', () => {
  it('ships disabled by default', () => {
    expect(promotionExperienceDefaults.enabled).toBe(false);
    expect(promotionExperienceStatus(promotionExperienceDefaults, coupon(), now).status).toBe('disabled');
  });

  it('is live only when config and linked coupon are active', () => {
    expect(promotionExperienceStatus({ ...promotionExperienceDefaults, enabled: true, promotionId: coupon().id }, coupon(), now).status).toBe('live');
  });

  it('suppresses missing, disabled, expired, and exhausted coupons', () => {
    const config = { ...promotionExperienceDefaults, enabled: true, promotionId: coupon().id };
    expect(promotionExperienceStatus(config, null, now).status).toBe('linked_offer_inactive');
    expect(promotionExperienceStatus(config, coupon({ isActive: false }), now).status).toBe('linked_offer_inactive');
    expect(promotionExperienceStatus(config, coupon({ validUntil: new Date('2026-08-19T00:00:00.000Z') }), now).status).toBe('linked_offer_inactive');
    expect(promotionExperienceStatus(config, coupon({ usedCount: 100 }), now).status).toBe('linked_offer_inactive');
  });

  it('calculates scheduled and expired states centrally', () => {
    const config = { ...promotionExperienceDefaults, enabled: true, promotionId: coupon().id };
    expect(promotionExperienceStatus({ ...config, startsAt: new Date('2026-08-21T00:00:00.000Z') }, coupon(), now).status).toBe('scheduled');
    expect(promotionExperienceStatus({ ...config, endsAt: new Date('2026-08-19T00:00:00.000Z') }, coupon(), now).status).toBe('expired');
    expect(promotionExperienceStatus(config, coupon({ validFrom: new Date('2026-08-21T00:00:00.000Z') }), now).status).toBe('scheduled');
  });
});

describe('promotion experience validation', () => {
  const enabled = { ...promotionExperienceDefaults, enabled: true, promotionId: coupon().id };

  it('accepts only the approved placeholder vocabulary', () => {
    expect(promotionExperienceBodySchema.safeParse({ ...enabled, popupHeadline: '{{code}} · {{discount}} · {{saving}}' }).success).toBe(true);
    expect(promotionExperienceBodySchema.safeParse({ ...enabled, popupHeadline: '{{customer.email}}' }).success).toBe(false);
    expect(promotionExperienceBodySchema.safeParse({ ...enabled, popupHeadline: '{{code' }).success).toBe(false);
  });

  it('rejects invalid delay, schedule, campaign key, and enabled config without a coupon', () => {
    expect(promotionExperienceBodySchema.safeParse({ ...enabled, popupDelayMs: 30_001 }).success).toBe(false);
    expect(promotionExperienceBodySchema.safeParse({ ...enabled, campaignKey: 'August Offer' }).success).toBe(false);
    expect(promotionExperienceBodySchema.safeParse({ ...enabled, startsAt: '2026-08-22T00:00:00Z', endsAt: '2026-08-21T00:00:00Z' }).success).toBe(false);
    expect(promotionExperienceBodySchema.safeParse({ ...enabled, promotionId: null }).success).toBe(false);
  });
});
