// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const invoiceCounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, min: 0, default: 0 }
  },
  { timestamps: true, autoIndex: false }
);

export type InvoiceCounterDocument = InferSchemaType<typeof invoiceCounterSchema>;
export const InvoiceCounterModel = model('InvoiceCounter', invoiceCounterSchema);
