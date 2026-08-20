// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const promotionExperienceSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    promotionId: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
    campaignName: { type: String, trim: true, maxlength: 120, default: '' },
    campaignKey: { type: String, trim: true, lowercase: true, maxlength: 100, default: 'promotion-campaign' },
    popupEnabled: { type: Boolean, default: true },
    bagMarqueeEnabled: { type: Boolean, default: true },
    checkoutStripEnabled: { type: Boolean, default: true },
    popupEyebrow: { type: String, trim: true, maxlength: 80, default: 'PRIVATE OFFER' },
    popupHeadline: { type: String, trim: true, maxlength: 140, default: '{{discount}} OFF YOUR ORDER' },
    popupDescription: { type: String, trim: true, maxlength: 320, default: 'Apply {{code}} and save on your CRUISIN order.' },
    popupPrimaryCta: { type: String, trim: true, maxlength: 80, default: 'APPLY {{discount}} OFF' },
    popupSecondaryCta: { type: String, trim: true, maxlength: 80, default: 'CONTINUE SHOPPING' },
    marqueeAvailableText: { type: String, trim: true, maxlength: 220, default: '{{code}} · {{discount}} OFF · TAP TO APPLY' },
    marqueeAppliedText: { type: String, trim: true, maxlength: 220, default: '{{code}} APPLIED ✓ · YOU SAVE {{saving}}' },
    checkoutAvailableText: { type: String, trim: true, maxlength: 220, default: '{{code}} AVAILABLE · TAP TO APPLY {{discount}} OFF' },
    checkoutAppliedText: { type: String, trim: true, maxlength: 220, default: '✓ {{code}} APPLIED · YOU SAVE {{saving}}' },
    popupDelayMs: { type: Number, min: 0, max: 30_000, default: 2500 },
    popupFrequency: { type: String, enum: ['once_per_session', 'once_per_24_hours', 'always'], default: 'once_per_session' },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { _id: false }
);

const siteSettingsSchema = new Schema(
  {
    singletonKey: { type: String, required: true, default: 'global', unique: true },
    defaultGridView: { type: Number, enum: [1, 2, 4], default: 4 },
    isFlashlightEnabled: { type: Boolean, default: true },
    isCollectionCarouselEnabled: { type: Boolean, default: true },
    isAdvancedFilterEnabled: { type: Boolean, default: true },
    isListingHeroMediaEnabled: { type: Boolean, default: true },
    isStorefrontNavigationVisible: { type: Boolean, default: true },
    standardShippingRate: { type: Number, min: 0, default: 900 },
    expressShippingRate: { type: Number, min: 0, default: 1800 },
    freeStandardShippingThreshold: { type: Number, min: 0, default: 25_000 },
    standardShippingCompareAt: { type: Number, min: 0, default: 0 },
    codCheckoutEnabled: { type: Boolean, default: false },
    codFee: { type: Number, min: 0, max: 10_000, default: 49 },
    promotionExperience: { type: promotionExperienceSchema, default: () => ({ enabled: false }) },
    globalFilterSettings: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export type SiteSettingsDocument = InferSchemaType<typeof siteSettingsSchema>;
export const SiteSettingsModel = model('SiteSettings', siteSettingsSchema);
