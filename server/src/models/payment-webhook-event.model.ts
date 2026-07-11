import { Schema, model } from 'mongoose';

const paymentWebhookEventSchema = new Schema({ provider: { type: String, required: true, index: true }, eventId: { type: String, required: true }, eventType: { type: String, required: true }, order: { type: Schema.Types.ObjectId, ref: 'Order', index: true }, payload: { type: Schema.Types.Mixed, required: true }, processedAt: { type: Date, default: Date.now } }, { timestamps: true });
paymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
export const PaymentWebhookEventModel = model('PaymentWebhookEvent', paymentWebhookEventSchema);
