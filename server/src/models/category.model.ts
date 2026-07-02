// Governed by .rules v1.0
import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const breadcrumbSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    path: { type: String, lowercase: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    image: { type: String, required: true },
    description: { type: String, trim: true, default: '' },
    heroTitle: { type: String, trim: true, default: '' },
    heroSubtitle: { type: String, trim: true, default: '' },
    heroImage: { type: String, trim: true, default: '' },
    mobileHeroImage: { type: String, trim: true, default: '' },
    bannerImage: { type: String, trim: true, default: '' },
    mobileBannerImage: { type: String, trim: true, default: '' },
    thumbnailImage: { type: String, trim: true, default: '' },
    categoryCardImage: { type: String, trim: true, default: '' },
    categoryVideo: { type: String, trim: true, default: '' },
    mobileCategoryVideo: { type: String, trim: true, default: '' },
    backgroundVideo: { type: String, trim: true, default: '' },
    videoPosterImage: { type: String, trim: true, default: '' },
    imageAltText: { type: String, trim: true, default: '' },
    videoAutoplay: { type: Boolean, default: true },
    videoMuted: { type: Boolean, default: true },
    videoLoop: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    isVisible: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    showInHeader: { type: Boolean, default: true, index: true },
    showInMenu: { type: Boolean, default: true, index: true },
    showInFilters: { type: Boolean, default: true, index: true },
    showOnHomepage: { type: Boolean, default: false, index: true },
    showOnCollectionPages: { type: Boolean, default: true, index: true },
    showInFooter: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    bannerTitle: { type: String, trim: true, default: '' },
    bannerSubtitle: { type: String, trim: true, default: '' },
    defaultSort: { type: String, default: 'newest' },
    defaultGridView: { type: Number, enum: [1, 2, 4], default: 4 },
    areFiltersVisible: { type: Boolean, default: true },
    isAdvancedFilterEnabled: { type: Boolean, default: true },
    isFlashlightEnabled: { type: Boolean, default: true },
    seoTitle: { type: String, trim: true, default: '' },
    seoDescription: { type: String, trim: true, default: '' },
    ogImage: { type: String, trim: true, default: '' },
    canonicalSlug: { type: String, lowercase: true, trim: true, default: '' },
    customContent: { type: Schema.Types.Mixed, default: null },
    breadcrumb: { type: [breadcrumbSchema], default: [] }
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ path: 1 }, { unique: true, sparse: true });
categorySchema.index({ path: 1, isActive: 1 });

export interface CategoryTreeNode extends InferSchemaType<typeof categorySchema> {
  _id: Types.ObjectId;
  children?: CategoryTreeNode[];
}

export const CategoryModel = model('Category', categorySchema);
