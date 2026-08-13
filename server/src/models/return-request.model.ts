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
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    size: { type: String },
    color: { type: String },
    quantity: { type: Number, required: true, min: 1 }
  }],
  reason: { type: String, required: true, trim: true },
  details: { type: String, trim: true },
  evidence: [{
    publicId: { type: String, required: true },
    version: { type: Number, required: true },
    format: { type: String, required: true }
  }],
  eligibility: { type: String, enum: ['pending', 'eligible', 'ineligible'], default: 'pending' },
  status: { type: String, enum: ['payment_pending', 'requested', 'more_information', 'approved', 'rejected', 'reverse_pickup', 'in_transit', 'warehouse_received', 'quality_check_passed', 'quality_check_failed', 'refund_window_open', 'refund_pending', 'refunded', 'closed'], default: 'payment_pending', index: true },
  handlingFee: { type: Number, required: true, min: 1 },
  handlingFeePaymentStatus: { type: String, enum: ['initializing', 'pending', 'paid', 'failed'], default: 'pending', index: true },
  handlingFeeProviderOrderId: { type: String },
  handlingFeePaymentReference: { type: String },
  handlingFeePaidAt: { type: Date },
  reverseShipment: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  warehouseReceivedAt: { type: Date },
  qualityCheckedAt: { type: Date },
  refundStatus: { type: String, enum: ['not_started', 'awaiting_destination', 'ready', 'initializing', 'pending', 'processed', 'failed'], default: 'not_started', index: true },
  refundWindowOpenedAt: { type: Date },
  refundWindowOpenedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  refundDestination: {
    method: { type: String, enum: ['original_payment', 'wallet', 'upi', 'bank'] },
    verificationStatus: { type: String, enum: ['not_submitted', 'pending', 'verified', 'failed'], default: 'not_submitted' },
    maskedDetails: { type: String, trim: true, maxlength: 120 },
    registeredName: { type: String, trim: true, maxlength: 120 },
    providerValidationId: { type: String, trim: true },
    providerFundAccountId: { type: String, trim: true },
    encryptedDetails: { type: String, select: false },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    submittedByRole: { type: String, enum: ['customer', 'admin', 'superadmin'] },
    submittedAt: { type: Date },
    verifiedAt: { type: Date }
  },
  productRefundAmount: { type: Number, min: 0 },
  productRefundReference: { type: String },
  manualTransferReference: { type: String, trim: true },
  manualTransferredAt: { type: Date },
  manualTransferRecordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  idempotencyKey: { type: String, required: true, unique: true },
  history: [{
    action: { type: String, required: true },
    note: { type: String, trim: true },
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

returnRequestSchema.index({ order: 1, createdAt: -1 });
returnRequestSchema.index({ handlingFeeProviderOrderId: 1 }, { unique: true, sparse: true });
returnRequestSchema.index({ handlingFeePaymentReference: 1 }, { unique: true, sparse: true });
returnRequestSchema.index({ 'refundDestination.providerValidationId': 1 }, { unique: true, sparse: true });
returnRequestSchema.index({ manualTransferReference: 1 }, { unique: true, sparse: true });

export type ReturnRequestDocument = InferSchemaType<typeof returnRequestSchema>;
export const ReturnRequestModel = model('ReturnRequest', returnRequestSchema);
