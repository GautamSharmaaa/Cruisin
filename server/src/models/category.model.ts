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
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    image: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    breadcrumb: { type: [breadcrumbSchema], default: [] }
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1, sortOrder: 1 });

export interface CategoryTreeNode extends InferSchemaType<typeof categorySchema> {
  _id: Types.ObjectId;
  children?: CategoryTreeNode[];
}

export const CategoryModel = model('Category', categorySchema);
