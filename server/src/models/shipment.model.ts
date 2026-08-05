// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';
import { shipmentStatuses, shipmentTypes } from '../types/logistics.types.js';

const documentSchema = new Schema({
  status: { type: String, enum: ['pending', 'ready', 'failed'], required: true, default: 'pending' },
  url: { type: String },
  generatedAt: { type: Date },
  expiresAt: { type: Date },
  operationId: { type: String, trim: true },
  providerReference: { type: String, trim: true },
  lastError: { type: String, trim: true, maxlength: 500 }
}, { _id: false });

const trackingScanSchema = new Schema({
  fingerprint: { type: String, required: true },
  status: { type: String, enum: shipmentStatuses, required: true },
  rawStatus: { type: String, required: true, trim: true },
  providerStatusId: { type: Number },
  message: { type: String, required: true, trim: true },
  location: { type: String, trim: true },
  timestamp: { type: Date, required: true }
}, { _id: false });

const ndrActionSchema = new Schema({
  action: { type: String, required: true, enum: ['reattempt', 'correct_address', 'confirm_availability', 'update_phone', 'contacted', 'escalate', 'accept_rto', 'note'] },
  note: { type: String, trim: true },
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  providerReference: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const shipmentSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  shipmentType: { type: String, enum: shipmentTypes, required: true, default: 'forward', index: true },
  provider: { type: String, enum: ['shiprocket'], required: true, default: 'shiprocket', index: true },
  sourceOrderId: { type: String, required: true, trim: true, index: true },
  providerOrderId: { type: String, trim: true },
  providerShipmentId: { type: String, trim: true },
  awb: { type: String, trim: true },
  courierId: { type: Number },
  courierName: { type: String, trim: true, index: true },
  shippingMode: { type: String, enum: ['surface', 'air', 'unknown'], default: 'unknown', index: true },
  shipmentStatus: { type: String, enum: shipmentStatuses, default: 'draft', required: true, index: true },
  rawProviderStatus: { type: String, trim: true },
  providerStatusId: { type: Number },
  pickupLocation: { type: String, required: true, trim: true, index: true },
  package: {
    productWeightKg: { type: Number, required: true, min: 0 },
    packagingWeightKg: { type: Number, required: true, min: 0 },
    deadWeightKg: { type: Number, required: true, min: 0 },
    chargedWeightKg: { type: Number, min: 0 },
    lengthCm: { type: Number, required: true, min: 0 },
    breadthCm: { type: Number, required: true, min: 0 },
    heightCm: { type: Number, required: true, min: 0 },
    packagePreset: { type: String, trim: true },
    measurementConfirmed: { type: Boolean, default: false },
    warnings: { type: [String], default: [] }
  },
  quoteSnapshot: { type: Schema.Types.Mixed },
  shippingChargeCollected: { type: Number, min: 0 },
  providerShippingCost: { type: Number, min: 0 },
  codCharge: { type: Number, min: 0 },
  otherProviderCharges: { type: Number, min: 0 },
  rtoCost: { type: Number, min: 0 },
  returnShippingCost: { type: Number, min: 0 },
  exchangeShippingCost: { type: Number, min: 0 },
  estimatedDelivery: { type: Date },
  pickupDate: { type: Date },
  deliveredDate: { type: Date },
  label: { type: documentSchema },
  invoice: { type: documentSchema },
  manifest: { type: documentSchema },
  trackingScans: { type: [trackingScanSchema], default: [] },
  lastTrackingUpdate: { type: Date },
  lastSyncAt: { type: Date },
  lastProviderError: {
    code: { type: String, trim: true },
    message: { type: String, trim: true },
    retryable: { type: Boolean },
    correlationId: { type: String, trim: true },
    occurredAt: { type: Date }
  },
  ndr: {
    reason: { type: String, trim: true },
    occurredAt: { type: Date },
    attemptCount: { type: Number, min: 0, default: 0 },
    currentAction: { type: String, trim: true },
    reattemptStatus: { type: String, enum: ['not_requested', 'requested', 'accepted', 'rejected'], default: 'not_requested' },
    lastCustomerContactAt: { type: Date },
    rtoRisk: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    nextActionDeadline: { type: Date },
    actionHistory: { type: [ndrActionSchema], default: [] }
  },
  rto: {
    reason: { type: String, trim: true },
    initiatedAt: { type: Date },
    currentLocation: { type: String, trim: true },
    expectedReturnAt: { type: Date },
    status: { type: String, enum: ['not_started', 'initiated', 'in_transit', 'delivered', 'inspection_pending', 'inventory_restored', 'damaged', 'closed'], default: 'not_started' },
    inventoryRecoveryStatus: { type: String, enum: ['not_started', 'warehouse_pending', 'inspection_pending', 'restored', 'damaged'], default: 'not_started' },
    warehouseReceivedAt: { type: Date },
    inspectedAt: { type: Date },
    inventoryRestoredAt: { type: Date }
  },
  returnStatus: { type: String, enum: ['none', 'requested', 'approved', 'reverse_pickup', 'in_transit', 'received', 'quality_check', 'refund_pending', 'refunded', 'rejected', 'closed'], default: 'none', index: true },
  exchangeStatus: { type: String, enum: ['none', 'requested', 'approved', 'inventory_reserved', 'reverse_pickup', 'received', 'quality_check', 'replacement_pending', 'replacement_shipped', 'completed', 'rejected', 'closed'], default: 'none', index: true },
  idempotencyKey: { type: String, required: true, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

shipmentSchema.index(
  { awb: 1 },
  {
    name: 'cruisin_awb_unique_string',
    unique: true,
    partialFilterExpression: { awb: { $type: 'string' } }
  }
);
shipmentSchema.index(
  { provider: 1, providerOrderId: 1 },
  {
    name: 'cruisin_provider_order_unique_string',
    unique: true,
    partialFilterExpression: { providerOrderId: { $type: 'string' } }
  }
);
shipmentSchema.index(
  { provider: 1, providerShipmentId: 1 },
  {
    name: 'cruisin_provider_shipment_unique_string',
    unique: true,
    partialFilterExpression: { providerShipmentId: { $type: 'string' } }
  }
);
shipmentSchema.index({ provider: 1, idempotencyKey: 1 }, { unique: true });
shipmentSchema.index({ order: 1, shipmentType: 1, createdAt: -1 });
shipmentSchema.index({ shipmentStatus: 1, updatedAt: -1 });
shipmentSchema.index({ 'ndr.occurredAt': -1, shipmentStatus: 1 });
shipmentSchema.index({ 'rto.status': 1, updatedAt: -1 });

export type ShipmentDocument = InferSchemaType<typeof shipmentSchema>;
export const ShipmentModel = model('Shipment', shipmentSchema);
