import { Schema, model } from 'mongoose';

const preferences = new Schema({
  _id: String,
  recipients: { type: [String], default: [] },
  enabledSince: { type: Date },
  cursors: { type: Map, of: new Schema({ at: Date, id: Schema.Types.ObjectId }, { _id: false }) },
}, { versionKey: false });

const delivery = new Schema({
  _id: String,
  recipient: { type: String, required: true },
  category: { type: String, required: true },
  reference: { type: String, required: true },
  status: { type: String, enum: ['queued', 'sending', 'submitted', 'failed', 'skipped'], default: 'queued' },
  nextAttempt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  providerSid: String,
}, { timestamps: true, versionKey: false });
delivery.index({ status: 1, nextAttempt: 1 });

export const AdminAlertPreferencesModel = model('AdminAlertPreferences', preferences);
export const AdminAlertDeliveryModel = model('AdminAlertDelivery', delivery);
