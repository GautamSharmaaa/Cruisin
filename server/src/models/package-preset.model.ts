// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const packagePresetSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  lengthCm: { type: Number, required: true, min: 0.1, max: 300 },
  breadthCm: { type: Number, required: true, min: 0.1, max: 300 },
  heightCm: { type: Number, required: true, min: 0.1, max: 300 },
  packagingWeightKg: { type: Number, required: true, min: 0.001, max: 25 },
  maximumQuantity: { type: Number, required: true, min: 1, max: 1_000 },
  isDefault: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

packagePresetSchema.index({ isActive: 1, name: 1 });

export type PackagePresetDocument = InferSchemaType<typeof packagePresetSchema>;
export const PackagePresetModel = model('PackagePreset', packagePresetSchema);
