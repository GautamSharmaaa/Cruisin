// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const siteSettingsSchema = new Schema(
  {
    singletonKey: { type: String, required: true, default: 'global', unique: true },
    defaultGridView: { type: Number, enum: [1, 2, 4], default: 4 },
    isFlashlightEnabled: { type: Boolean, default: true },
    isCollectionCarouselEnabled: { type: Boolean, default: true },
    isAdvancedFilterEnabled: { type: Boolean, default: true },
    isStorefrontNavigationVisible: { type: Boolean, default: true },
    globalFilterSettings: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export type SiteSettingsDocument = InferSchemaType<typeof siteSettingsSchema>;
export const SiteSettingsModel = model('SiteSettings', siteSettingsSchema);
