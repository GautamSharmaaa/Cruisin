// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const collectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, default: '' },
    heroTitle: { type: String, trim: true, default: '' },
    heroSubtitle: { type: String, trim: true, default: '' },
    heroImage: { type: String, trim: true, default: '' },
    mobileHeroImage: { type: String, trim: true, default: '' },
    cardImage: { type: String, trim: true, default: '' },
    thumbnailImage: { type: String, trim: true, default: '' },
    bannerImage: { type: String, trim: true, default: '' },
    mobileBannerImage: { type: String, trim: true, default: '' },
    mobileImage: { type: String, trim: true, default: '' },
    collectionVideo: { type: String, trim: true, default: '' },
    mobileCollectionVideo: { type: String, trim: true, default: '' },
    backgroundVideo: { type: String, trim: true, default: '' },
    videoPosterImage: { type: String, trim: true, default: '' },
    imageAltText: { type: String, trim: true, default: '' },
    isBannerVisible: { type: Boolean, default: false },
    productIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [], index: true },
    categoryIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [], index: true },
    tags: { type: [String], default: [], index: true },
    productSortOrder: { type: Schema.Types.Mixed, default: {} },
    sortOrder: { type: Number, default: 0, index: true },
    isVisible: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    showInMenu: { type: Boolean, default: true, index: true },
    menuCardImage: { type: String, trim: true, default: '' },
    mobileMenuCardImage: { type: String, trim: true, default: '' },
    menuCardTitleOverride: { type: String, trim: true, default: '' },
    menuCardOrder: { type: Number, default: 0, index: true },
    defaultSort: { type: String, default: 'newest' },
    defaultGridView: { type: Number, enum: [1, 2, 4], default: 4 },
    areFiltersVisible: { type: Boolean, default: true },
    isAdvancedFilterEnabled: { type: Boolean, default: true },
    isFlashlightEnabled: { type: Boolean, default: true },
    seoTitle: { type: String, trim: true, default: '' },
    seoDescription: { type: String, trim: true, default: '' },
    ogImage: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

collectionSchema.index({ isVisible: 1, isPublished: 1, sortOrder: 1 });
collectionSchema.index({ isFeatured: 1, sortOrder: 1 });

export type CollectionDocument = InferSchemaType<typeof collectionSchema>;
export const CollectionModel = model('Collection', collectionSchema);
