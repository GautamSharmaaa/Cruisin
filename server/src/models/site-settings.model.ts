// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

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
    globalFilterSettings: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export type SiteSettingsDocument = InferSchemaType<typeof siteSettingsSchema>;
export const SiteSettingsModel = model('SiteSettings', siteSettingsSchema);
