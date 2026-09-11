// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const addressSchema = new Schema({
  fullName: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  line1: { type: String, trim: true, default: '' },
  line2: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  postalCode: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: 'India' }
}, { _id: false });

const sellerSchema = new Schema({
  legalName: { type: String, required: true, trim: true },
  tradeName: { type: String, required: true, trim: true },
  registeredAddress: { type: String, trim: true, default: '' },
  gstin: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  stateCode: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  footer: { type: String, trim: true, default: '' },
  authorizedSignatory: { type: String, trim: true, default: '' },
  signatureAssetUrl: { type: String, trim: true, default: '' }
}, { _id: false });

const invoiceItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, required: true },
  productName: { type: String, required: true, trim: true },
  variant: { type: String, trim: true, default: '' },
  sku: { type: String, required: true, trim: true },
  productCode: { type: String, trim: true, default: '' },
  hsn: { type: String, trim: true, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  mrp: { type: Number, required: true, min: 0 },
  discount: { type: Number, required: true, min: 0, default: 0 },
  taxableValue: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, min: 0, default: 0 },
  cgstRate: { type: Number, required: true, min: 0, default: 0 },
  cgstAmount: { type: Number, required: true, min: 0, default: 0 },
  sgstRate: { type: Number, required: true, min: 0, default: 0 },
  sgstAmount: { type: Number, required: true, min: 0, default: 0 },
  igstRate: { type: Number, required: true, min: 0, default: 0 },
  igstAmount: { type: Number, required: true, min: 0, default: 0 },
  totalTax: { type: Number, required: true, min: 0, default: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const invoiceSchema = new Schema(
  {
    // Reusing the order ObjectId as the invoice ObjectId makes one-invoice-per-order
    // idempotency rely on MongoDB's immutable primary-key index, even before optional
    // invoice indexes are deployed.
    _id: { type: Schema.Types.ObjectId, required: true },
    invoiceNumber: { type: String, required: true, trim: true },
    sequence: { type: Number, required: true, min: 1 },
    orderId: { type: Schema.Types.ObjectId, required: true },
    orderNumber: { type: String, required: true, trim: true },
    invoiceDate: { type: Date, required: true },
    orderDate: { type: Date, required: true },
    financialYear: { type: String, required: true, trim: true },
    seller: { type: sellerSchema, required: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      gstin: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' }
    },
    billingAddress: { type: addressSchema, required: true },
    shippingAddress: { type: addressSchema, required: true },
    placeOfSupply: {
      state: { type: String, trim: true, default: '' },
      stateCode: { type: String, trim: true, default: '' }
    },
    items: { type: [invoiceItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    productDiscount: { type: Number, required: true, min: 0, default: 0 },
    couponDiscount: { type: Number, required: true, min: 0, default: 0 },
    promotionDiscount: { type: Number, required: true, min: 0, default: 0 },
    shippingCharge: { type: Number, required: true, min: 0, default: 0 },
    codFee: { type: Number, required: true, min: 0, default: 0 },
    taxableValue: { type: Number, required: true, min: 0 },
    cgst: { type: Number, required: true, min: 0, default: 0 },
    sgst: { type: Number, required: true, min: 0, default: 0 },
    igst: { type: Number, required: true, min: 0, default: 0 },
    totalTax: { type: Number, required: true, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, trim: true },
    paymentStatus: { type: String, required: true, trim: true },
    orderStatus: { type: String, required: true, trim: true },
    invoiceStatus: { type: String, enum: ['generated', 'void'], default: 'generated' }
  },
  { timestamps: true, autoIndex: false }
);

invoiceSchema.index({ invoiceNumber: 1 }, { unique: true, name: 'invoice_number_unique' });
invoiceSchema.index({ orderId: 1 }, { unique: true, name: 'invoice_order_unique' });
invoiceSchema.index({ invoiceDate: -1 }, { name: 'invoice_date_desc' });
invoiceSchema.index({ orderDate: -1 }, { name: 'invoice_order_date_desc' });
invoiceSchema.index({ invoiceStatus: 1, invoiceDate: -1 }, { name: 'invoice_status_date' });
invoiceSchema.index({ paymentMethod: 1, invoiceDate: -1 }, { name: 'invoice_payment_method_date' });
invoiceSchema.index({ 'customer.state': 1, invoiceDate: -1 }, { name: 'invoice_customer_state_date' });
invoiceSchema.index({ 'customer.email': 1 }, { name: 'invoice_customer_email' });
invoiceSchema.index({ 'customer.phone': 1 }, { name: 'invoice_customer_phone' });
invoiceSchema.index({ grandTotal: 1, invoiceDate: -1 }, { name: 'invoice_total_date' });

const immutableError = (): Error => new Error('Issued invoice snapshots are immutable');
invoiceSchema.pre('save', function preventIssuedInvoiceSave(next): void {
  if (!this.isNew) return next(immutableError());
  next();
});
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'] as const) {
  invoiceSchema.pre(hook, function preventIssuedInvoiceUpdate(next): void { next(immutableError()); });
}
for (const hook of ['deleteOne', 'deleteMany', 'findOneAndDelete'] as const) {
  invoiceSchema.pre(hook, { query: true, document: false }, function preventIssuedInvoiceDelete(next): void { next(immutableError()); });
}

export type InvoiceDocument = InferSchemaType<typeof invoiceSchema>;
export const InvoiceModel = model('Invoice', invoiceSchema);
