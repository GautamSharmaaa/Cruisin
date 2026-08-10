// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    publicId: { type: String }
  },
  { _id: false }
);

const variantSchema = new Schema(
  {
    size: { type: String, required: true, trim: true, index: true },
    color: { type: String, required: true, trim: true, index: true },
    colorHex: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    priceOverride: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, index: true },
    enabled: { type: Boolean, default: true, index: true },
    lowStockThreshold: { type: Number, min: 0 },
    weight: { type: Number, min: 0, max: 100 },
    dimensions: {
      length: { type: Number, min: 0, max: 300 },
      width: { type: Number, min: 0, max: 300 },
      height: { type: Number, min: 0, max: 300 }
    },
    images: { type: [imageSchema], default: [] }
  },
  { _id: true }
);

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    shortDescription: { type: String, trim: true, default: '' },
    richDescription: { type: String, required: true },
    brand: { type: String, required: true, trim: true, default: 'Cruisin' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    categoryIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [], index: true },
    collections: { type: [{ type: Schema.Types.ObjectId, ref: 'Collection' }], default: [], index: true },
    collectionSlugs: { type: [String], default: [], index: true },
    images: { type: [imageSchema], default: [] },
    hoverImage: { type: imageSchema, default: null },
    videoUrl: { type: String, trim: true },
    mobileVideoUrl: { type: String, trim: true, default: '' },
    videoPosterImage: { type: String, trim: true, default: '' },
    imageAltText: { type: String, trim: true, default: '' },
    basePrice: { type: Number, required: true, min: 0, index: true },
    comparePrice: { type: Number, min: 0 },
    variants: { type: [variantSchema], default: [] },
    tags: { type: [String], default: [], index: true },
    productCode: { type: String, trim: true, uppercase: true, index: true },
    amazonAsin: { type: String, trim: true, default: '' },
    costPrice: { type: Number, min: 0 },
    costBreakdown: {
      manufacturing: { type: Number, min: 0, default: 0 },
      packaging: { type: Number, min: 0, default: 0 },
      marketing: { type: Number, min: 0, default: 0 },
      handling: { type: Number, min: 0, default: 0 },
      other: { type: Number, min: 0, default: 0 }
    },
    gstPercent: { type: Number, min: 0 },
    hsnCode: { type: String, trim: true, default: '' },
    returnExchangeCondition: { type: String, trim: true, default: '' },
    catalogueSource: { type: String, trim: true, default: '' },
    lastCatalogueImportId: { type: Schema.Types.ObjectId, ref: 'CatalogueImport', default: null },
    rawCatalogueAttributes: { type: Schema.Types.Mixed, default: {} },
    normalizedAttributes: { type: Schema.Types.Mixed, default: {} },
    productTypeRaw: { type: String, trim: true, default: '' },
    categoryMappingRaw: { type: String, trim: true, default: '' },
    collectionMappingRaw: { type: String, trim: true, default: '' },
    pickupAddress: { type: String, trim: true },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    lifetimeSales: { type: Number, default: 0, min: 0, index: true },
    gender: { type: String, enum: ['men', 'women', 'unisex'], default: 'unisex', index: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published', index: true },
    visibility: { type: String, enum: ['visible', 'hidden'], default: 'visible', index: true },
    isSale: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isBestseller: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false, index: true },
    isLatestDrop: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    materialCare: { type: String, trim: true, default: '' },
    fitDetails: { type: String, trim: true, default: '' },
    shippingReturns: { type: String, trim: true, default: '' },
    sizeGuide: { type: String, trim: true, default: '' },
    productHighlights: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0, index: true },
    relatedProducts: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    recommendedProducts: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    weight: { type: Number, min: 0, max: 100, default: 0.2 },
    dimensions: {
      length: { type: Number, min: 0, max: 300, default: 30.48 },
      width: { type: Number, min: 0, max: 300, default: 25.4 },
      height: { type: Number, min: 0, max: 300, default: 2 }
    },
    packagingWeight: { type: Number, min: 0 },
    defaultPackagePreset: { type: String, trim: true },
    maximumQuantityPerPackage: { type: Number, min: 1, default: 10 },
    ratings: {
      avg: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    },
    seo: {
      metaTitle: { type: String, trim: true },
      metaDesc: { type: String, trim: true },
      ogImage: { type: String }
    },
    analyticsTestBatchId: { type: String, trim: true, index: true },
    isAnalyticsTestData: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1, basePrice: 1 });
productSchema.index({ categoryIds: 1, isActive: 1, sortOrder: 1 });
productSchema.index({ collections: 1, isActive: 1, sortOrder: 1 });
productSchema.index({ gender: 1, isActive: 1, createdAt: -1 });
productSchema.index({ isFeatured: 1, createdAt: -1 });
productSchema.index({ isSale: 1, createdAt: -1 });
productSchema.index({ isLatestDrop: 1, createdAt: -1 });
productSchema.index({ isArchived: 1, updatedAt: -1 });

export type ProductDocument = InferSchemaType<typeof productSchema>;
export const ProductModel = model('Product', productSchema);
