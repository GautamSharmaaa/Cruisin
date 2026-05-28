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
    stock: { type: Number, required: true, min: 0, index: true },
    images: { type: [imageSchema], default: [] }
  },
  { _id: true }
);

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    richDescription: { type: String, required: true },
    brand: { type: String, required: true, trim: true, default: 'Cruisin' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    images: { type: [imageSchema], default: [] },
    basePrice: { type: Number, required: true, min: 0, index: true },
    comparePrice: { type: Number, min: 0 },
    variants: { type: [variantSchema], default: [] },
    tags: { type: [String], default: [], index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    ratings: {
      avg: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    },
    seo: {
      metaTitle: { type: String, trim: true },
      metaDesc: { type: String, trim: true },
      ogImage: { type: String }
    }
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1, basePrice: 1 });
productSchema.index({ isFeatured: 1, createdAt: -1 });

export type ProductDocument = InferSchemaType<typeof productSchema>;
export const ProductModel = model('Product', productSchema);
