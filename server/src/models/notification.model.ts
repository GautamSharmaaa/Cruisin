// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    audience: { type: String, enum: ['customer', 'admin', 'all'], default: 'customer', index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: { type: String, enum: ['order', 'inventory', 'promotion', 'system'], required: true, index: true },
    readAt: { type: Date },
    metadata: { type: Map, of: String, default: {} }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = model('Notification', notificationSchema);
