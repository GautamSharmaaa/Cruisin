// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const pageSettingsSchema = new Schema(
  {
    pageType: { type: String, required: true, trim: true, index: true },
    pageSlug: { type: String, required: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: '' },
    heroImage: { type: String, trim: true, default: '' },
    mobileHeroImage: { type: String, trim: true, default: '' },
    heroVideo: { type: String, trim: true, default: '' },
    mobileHeroVideo: { type: String, trim: true, default: '' },
    bannerImage: { type: String, trim: true, default: '' },
    mobileBannerImage: { type: String, trim: true, default: '' },
    bannerVideo: { type: String, trim: true, default: '' },
    mobileBannerVideo: { type: String, trim: true, default: '' },
    videoPosterImage: { type: String, trim: true, default: '' },
    ctaText: { type: String, trim: true, default: '' },
    ctaLink: { type: String, trim: true, default: '' },
    isBannerVisible: { type: Boolean, default: false },
    defaultSort: { type: String, default: 'newest' },
    defaultGridView: { type: Number, enum: [1, 2, 4], default: 4 },
    areFiltersVisible: { type: Boolean, default: true },
    isAdvancedFilterEnabled: { type: Boolean, default: true },
    isFlashlightEnabled: { type: Boolean, default: true },
    seoTitle: { type: String, trim: true, default: '' },
    seoDescription: { type: String, trim: true, default: '' },
    ogImage: { type: String, trim: true, default: '' },
    isPublished: { type: Boolean, default: true, index: true },
    sectionVisibility: { type: Schema.Types.Mixed, default: {} },
    customSections: { type: [Schema.Types.Mixed], default: [] }
  },
  { timestamps: true }
);

pageSettingsSchema.index({ pageType: 1, pageSlug: 1 }, { unique: true });
pageSettingsSchema.index({ isPublished: 1, pageType: 1 });

export type PageSettingsDocument = InferSchemaType<typeof pageSettingsSchema>;
export const PageSettingsModel = model('PageSettings', pageSettingsSchema);
