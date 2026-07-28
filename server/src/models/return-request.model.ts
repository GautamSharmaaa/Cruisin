// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const returnRequestSchema = new Schema({
  requestNumber: { type: String, required: true, unique: true, index: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  item: {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  reason: { type: String, required: true, trim: true },
  details: { type: String, trim: true },
  eligibility: { type: String, enum: ['pending', 'eligible', 'ineligible'], default: 'pending' },
  status: { type: String, enum: ['requested', 'more_information', 'approved', 'rejected', 'reverse_pickup', 'in_transit', 'warehouse_received', 'quality_check_passed', 'quality_check_failed', 'refund_pending', 'refunded', 'closed'], default: 'requested', index: true },
  reverseShipment: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  warehouseReceivedAt: { type: Date },
  qualityCheckedAt: { type: Date },
  refundStatus: { type: String, enum: ['not_started', 'pending', 'processed', 'failed'], default: 'not_started', index: true },
  idempotencyKey: { type: String, required: true, unique: true },
  history: [{
    action: { type: String, required: true },
    note: { type: String, trim: true },
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

returnRequestSchema.index({ order: 1, createdAt: -1 });

export type ReturnRequestDocument = InferSchemaType<typeof returnRequestSchema>;
export const ReturnRequestModel = model('ReturnRequest', returnRequestSchema);
