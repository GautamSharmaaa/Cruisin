// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const bannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    cta: {
      text: { type: String, required: true, trim: true },
      link: { type: String, required: true, trim: true }
    },
    image: { type: String, required: true },
    mobileImage: { type: String, required: true },
    position: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    sortOrder: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

bannerSchema.index({ position: 1, isActive: 1, sortOrder: 1 });

export type BannerDocument = InferSchemaType<typeof bannerSchema>;
export const BannerModel = model('Banner', bannerSchema);
