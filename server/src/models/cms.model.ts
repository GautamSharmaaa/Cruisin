// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const jsonSchema = { type: Schema.Types.Mixed, default: {} };

const cmsPageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    seoTitle: { type: String, trim: true, default: '' },
    seoDescription: { type: String, trim: true, default: '' },
    publishedVersionId: { type: Schema.Types.ObjectId, ref: 'CMSVersion' },
    previewToken: { type: String, required: true, unique: true, index: true }
  },
  { timestamps: true }
);

const cmsSectionSchema = new Schema(
  {
    pageId: { type: Schema.Types.ObjectId, ref: 'CMSPage', required: true, index: true },
    pageTarget: { type: String, default: 'home', trim: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'announcement_bar',
        'hero_campaign',
        'video_landing',
        'mobile_media_landing',
        'image_carousel',
        'product_carousel',
        'hot_drop',
        'trending_now',
        'discount_banner',
        'category_editorial_grid',
        'lookbook_story',
        'brand_story',
        'fullscreen_collection_landing',
        'popup_campaign',
        'newsletter',
        'social_proof',
        'marquee_strip',
        'shop_the_look',
        'featured_collection',
        'limited_drop_timer',
        'recently_viewed',
        'best_sellers'
      ],
      index: true
    },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    content: jsonSchema,
    styles: jsonSchema,
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    sortOrder: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true, index: true },
    hideOnDesktop: { type: Boolean, default: false },
    hideOnMobile: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    startDate: { type: Date, index: true },
    endDate: { type: Date, index: true }
  },
  { timestamps: true }
);

cmsSectionSchema.index({ pageId: 1, status: 1, active: 1, sortOrder: 1 });
cmsSectionSchema.index({ pageTarget: 1, status: 1, active: 1, sortOrder: 1 });

const cmsVersionSchema = new Schema(
  {
    pageId: { type: Schema.Types.ObjectId, ref: 'CMSPage', required: true, index: true },
    sectionsSnapshot: { type: [jsonSchema], default: [] },
    status: { type: String, enum: ['draft', 'published', 'restored'], default: 'draft', index: true },
    label: { type: String, trim: true, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const cmsMediaSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    alt: { type: String, trim: true, default: '' },
    desktopUrl: { type: String, trim: true, default: '' },
    mobileUrl: { type: String, trim: true, default: '' },
    posterUrl: { type: String, trim: true, default: '' },
    cropFocus: { type: String, enum: ['center', 'top', 'bottom', 'left', 'right'], default: 'center' },
    lazy: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export type CMSPageDocument = InferSchemaType<typeof cmsPageSchema>;
export type CMSSectionDocument = InferSchemaType<typeof cmsSectionSchema>;
export type CMSVersionDocument = InferSchemaType<typeof cmsVersionSchema>;
export type CMSMediaDocument = InferSchemaType<typeof cmsMediaSchema>;

export const CMSPageModel = model('CMSPage', cmsPageSchema);
export const CMSSectionModel = model('CMSSection', cmsSectionSchema);
export const CMSVersionModel = model('CMSVersion', cmsVersionSchema);
export const CMSMediaModel = model('CMSMedia', cmsMediaSchema);
