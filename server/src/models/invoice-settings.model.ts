// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const invoiceSettingsSchema = new Schema(
  {
    _id: { type: String, default: 'global' },
    legalName: { type: String, trim: true, default: 'Cruisin' },
    tradeName: { type: String, trim: true, default: 'CRUISIN' },
    invoicePrefix: { type: String, trim: true, uppercase: true, default: 'CR', maxlength: 12 },
    registeredAddress: { type: String, trim: true, default: 'KV APPAREL 992/1, Gali No. 2, Kapashera Extention, Kapashera, New Delhi 110037, Near Mahadeep Public School, South West Delhi, Delhi, India' },
    gstin: { type: String, trim: true, uppercase: true, default: '07BZXPV5435K1ZB' },
    state: { type: String, trim: true, default: 'Delhi' },
    stateCode: { type: String, trim: true, default: '07' },
    phone: { type: String, trim: true, default: '8287846203' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    footer: { type: String, trim: true, default: 'Thank you for shopping with Cruisin.' },
    authorizedSignatory: { type: String, trim: true, default: '' },
    signatureAssetUrl: { type: String, trim: true, default: '' },
    bulkPdfLimit: { type: Number, min: 1, max: 250, default: 100 }
  },
  { timestamps: true, autoIndex: false }
);

export type InvoiceSettingsDocument = InferSchemaType<typeof invoiceSettingsSchema>;
export const InvoiceSettingsModel = model('InvoiceSettings', invoiceSettingsSchema);
