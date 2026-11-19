// Governed by .rules v1.0
import { Schema, model } from 'mongoose';

const storefrontActivitySchema = new Schema({
  _id: { type: String, required: true },
  kind: { type: String, enum: ['visit', 'bag'], required: true },
  device: { type: String, enum: ['mobile', 'desktop'], required: true },
  createdAt: { type: Date, required: true, default: Date.now, expires: '400d' }
});

export const StorefrontActivityModel = model('StorefrontActivity', storefrontActivitySchema);
