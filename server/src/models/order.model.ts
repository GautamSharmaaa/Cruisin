// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const addressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const itemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true }
  },
  { _id: false }
);

const timelineSchema = new Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true }
  },
  { _id: false }
);

const paymentAttemptSchema = new Schema({ providerOrderId: { type: String, index: true }, providerPaymentId: { type: String, index: true }, amount: { type: Number, required: true, min: 0 }, status: { type: String, required: true }, method: { type: String, trim: true }, errorCode: { type: String, trim: true }, errorDescription: { type: String, trim: true }, createdAt: { type: Date, default: Date.now } }, { _id: true });
const refundSchema = new Schema({ providerRefundId: { type: String, index: true }, amount: { type: Number, required: true, min: 0 }, status: { type: String, required: true }, reason: { type: String, trim: true }, requestedBy: { type: Schema.Types.ObjectId, ref: 'User' }, createdAt: { type: Date, default: Date.now } }, { _id: true });

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, index: true },
    items: { type: [itemSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },
    billingAddress: { type: addressSchema, required: true },
    orderNumber: { type: String, unique: true, sparse: true, index: true },
    paymentMethod: { type: String, enum: ['razorpay', 'stripe', 'cod'], required: true },
    paymentMode: { type: String, enum: ['online', 'cod', 'partial'], default: 'online', index: true },
    paymentProvider: { type: String, enum: ['razorpay', 'stripe', 'cod', 'manual'], default: 'razorpay' },
    paymentStatus: { type: String, enum: ['pending', 'authorized', 'paid', 'failed', 'partially_paid', 'cod_pending', 'refunded', 'partially_refunded', 'cancelled'], default: 'pending', index: true },
    orderStatus: { type: String, enum: ['pending', 'placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'], default: 'pending', index: true },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    codFee: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    amountDue: { type: Number, required: true, min: 0, default: 0 },
    stockReserved: { type: Boolean, default: false },
    couponCode: { type: String, uppercase: true, trim: true, index: true },
    refundAmount: { type: Number, min: 0, default: 0 },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    stripePaymentIntentId: { type: String, index: true },
    trackingNumber: { type: String, trim: true, index: true },
    notes: { type: String, trim: true },
    adminNotes: { type: String, trim: true },
    paymentAttempts: { type: [paymentAttemptSchema], default: [] },
    refunds: { type: [refundSchema], default: [] },
    timeline: { type: [timelineSchema], default: [] },
    analyticsTestBatchId: { type: String, trim: true, index: true },
    isAnalyticsTestData: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1, orderStatus: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1, paymentStatus: 1, orderStatus: 1 });

export type OrderDocument = InferSchemaType<typeof orderSchema>;
export const OrderModel = model('Order', orderSchema);
