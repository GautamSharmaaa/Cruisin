// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const invoiceDownloadStatusSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    downloadCount: { type: Number, required: true, min: 0, default: 0 },
    lastDownloadedAt: { type: Date, required: true },
    lastDownloadedBy: { type: String, trim: true, default: '' },
    lastDownloadKind: { type: String, enum: ['single', 'bulk'], required: true }
  },
  { timestamps: true, autoIndex: false, collection: 'invoice_download_statuses' }
);

export type InvoiceDownloadStatusDocument = InferSchemaType<typeof invoiceDownloadStatusSchema>;
export const InvoiceDownloadStatusModel = model('InvoiceDownloadStatus', invoiceDownloadStatusSchema);
