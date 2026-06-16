// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

export const addressTypes = ['home', 'office', 'other'] as const;

const addressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: addressTypes, default: 'home', index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'India' },
    state: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    isDefault: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

addressSchema.index({ user: 1, isDefault: 1 });
addressSchema.index({ user: 1, updatedAt: -1 });

export type AddressDocument = InferSchemaType<typeof addressSchema>;
export const AddressModel = model('Address', addressSchema);
