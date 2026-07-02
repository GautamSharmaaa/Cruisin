// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const tagSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    isVisible: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

tagSchema.index({ isVisible: 1, sortOrder: 1 });

export type TagDocument = InferSchemaType<typeof tagSchema>;
export const TagModel = model('Tag', tagSchema);
