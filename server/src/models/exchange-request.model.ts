// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const exchangeRequestSchema = new Schema({
  requestNumber: { type: String, required: true, unique: true, index: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalItem: {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  requestedVariant: { type: Schema.Types.ObjectId, required: true },
  requestedSku: { type: String, required: true },
  status: { type: String, enum: ['payment_pending', 'requested', 'approved', 'rejected', 'inventory_reserved', 'reverse_pickup', 'in_transit', 'warehouse_received', 'quality_check_passed', 'quality_check_failed', 'replacement_pending', 'replacement_shipped', 'completed', 'closed'], default: 'payment_pending', index: true },
  handlingFee: { type: Number, required: true, min: 0, default: 100 },
  handlingFeePaymentStatus: { type: String, enum: ['initializing', 'pending', 'paid', 'failed'], default: 'pending', index: true },
  handlingFeeProviderOrderId: { type: String, index: true, sparse: true },
  handlingFeePaymentReference: { type: String },
  handlingFeePaidAt: { type: Date },
  inventoryReserved: { type: Boolean, default: false },
  reverseShipment: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  replacementShipment: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  replacementOrder: { type: Schema.Types.ObjectId, ref: 'Order' },
  additionalAmount: { type: Number, min: 0, default: 0 },
  refundDifference: { type: Number, min: 0, default: 0 },
  qualityCheckedAt: { type: Date },
  idempotencyKey: { type: String, required: true, unique: true },
  history: [{
    action: { type: String, required: true },
    note: { type: String, trim: true },
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

exchangeRequestSchema.index({ order: 1, createdAt: -1 });

export type ExchangeRequestDocument = InferSchemaType<typeof exchangeRequestSchema>;
export const ExchangeRequestModel = model('ExchangeRequest', exchangeRequestSchema);
