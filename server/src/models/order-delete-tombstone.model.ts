// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const orderDeleteTombstoneSchema = new Schema({
  orderNumber: { type: String, required: true, trim: true },
  deletedAt: { type: Date, required: true, default: Date.now },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  wasTestOrder: { type: Boolean, required: true },
  relatedRecordsRemoved: { type: Map, of: Number, required: true, default: {} }
}, { timestamps: true });

export type OrderDeleteTombstoneDocument = InferSchemaType<typeof orderDeleteTombstoneSchema>;
export const OrderDeleteTombstoneModel = model('OrderDeleteTombstone', orderDeleteTombstoneSchema);
