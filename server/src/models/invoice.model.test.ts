// Governed by .rules v1.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvoiceModel } from './invoice.model.js';
import { InvoiceDownloadStatusModel } from './invoice-download-status.model.js';
import { OrderModel } from './order.model.js';
import { InvoiceService } from '../services/invoice.service.js';

afterEach(() => vi.restoreAllMocks());

describe('invoice persistence contracts', () => {
  it('never auto-deploys invoice indexes against the connected database', () => {
    expect(InvoiceModel.schema.get('autoIndex')).toBe(false);
    expect(InvoiceDownloadStatusModel.schema.get('autoIndex')).toBe(false);
  });

  it('keeps mutable download history outside the immutable invoice snapshot', () => {
    expect(InvoiceDownloadStatusModel.collection.collectionName).toBe('invoice_download_statuses');
    expect(InvoiceModel.schema.path('downloadCount')).toBeUndefined();
    expect(InvoiceModel.schema.path('lastDownloadedAt')).toBeUndefined();
  });

  it('records deduplicated download activity in the separate operational collection', async () => {
    const invoiceId = '66dff3ab1b43b28cb1260a01';
    const bulkWrite = vi.spyOn(InvoiceDownloadStatusModel, 'bulkWrite').mockResolvedValue({} as never);
    await InvoiceService.recordDownloaded([invoiceId, invoiceId], 'admin-id', 'bulk');
    expect(bulkWrite).toHaveBeenCalledTimes(1);
    const operations = bulkWrite.mock.calls[0]?.[0] as unknown as Array<{ updateOne: { update: { $inc: { downloadCount: number }; $set: { lastDownloadedBy: string; lastDownloadKind: string } }; upsert: boolean } }>;
    expect(operations).toHaveLength(1);
    expect(operations[0]?.updateOne.update.$inc.downloadCount).toBe(1);
    expect(operations[0]?.updateOne.update.$set).toEqual(expect.objectContaining({ lastDownloadedBy: 'admin-id', lastDownloadKind: 'bulk' }));
    expect(operations[0]?.updateOne.upsert).toBe(true);
  });

  it('declares unique invoice-number and order relationships for reviewed deployment', () => {
    const indexes = InvoiceModel.schema.indexes();
    expect(indexes).toEqual(expect.arrayContaining([
      [{ invoiceNumber: 1 }, expect.objectContaining({ unique: true })],
      [{ orderId: 1 }, expect.objectContaining({ unique: true })]
    ]));
  });

  it('snapshots product tax identity on new order lines before later catalogue changes', () => {
    const itemPath = OrderModel.schema.path('items');
    expect(itemPath?.constructor.name).toBe('SchemaDocumentArray');
    const schema = (itemPath as unknown as { schema: { path: (name: string) => unknown } }).schema;
    expect(schema.path('hsnCode')).toBeDefined();
    expect(schema.path('gstPercent')).toBeDefined();
    expect(schema.path('productCode')).toBeDefined();
    expect(schema.path('mrp')).toBeDefined();
  });

  it('keeps issued product, HSN, customer address, and seller settings independent of later source changes', () => {
    const product = { title: 'Original Tee', hsnCode: '6109', gstPercent: 18 };
    const customerAddress = { fullName: 'Rahul Sharma', line1: 'Original address', state: 'Karnataka' };
    const settings = { legalName: 'Cruisin Original Pvt Ltd', tradeName: 'Cruisin', registeredAddress: 'Original office' };
    const issued = InvoiceModel.hydrate({
      _id: '66dff3ab1b43b28cb1260a01', invoiceNumber: 'CR/26-27/000001', sequence: 1, orderId: '66dff3ab1b43b28cb1260a01', orderNumber: 'ORDER-1', invoiceDate: new Date(), orderDate: new Date(), financialYear: '26-27',
      seller: settings, customer: { name: customerAddress.fullName, state: customerAddress.state }, billingAddress: customerAddress, shippingAddress: customerAddress, placeOfSupply: { state: customerAddress.state },
      items: [{ productId: '66dff3ab1b43b28cb1260a02', productName: product.title, sku: 'TEE-1', hsn: product.hsnCode, quantity: 1, unitPrice: 1_000, mrp: 1_000, discount: 0, taxableValue: 847.46, gstRate: product.gstPercent, cgstRate: 9, cgstAmount: 76.27, sgstRate: 9, sgstAmount: 76.27, igstRate: 0, igstAmount: 0, totalTax: 152.54, lineTotal: 1_000 }],
      subtotal: 1_000, taxableValue: 847.46, cgst: 76.27, sgst: 76.27, igst: 0, totalTax: 152.54, grandTotal: 1_000, paymentMethod: 'razorpay', paymentStatus: 'paid', orderStatus: 'confirmed'
    });
    product.title = 'Renamed Tee'; product.hsnCode = '9999'; customerAddress.line1 = 'New address'; settings.legalName = 'New legal name';
    expect(issued.items[0]?.productName).toBe('Original Tee');
    expect(issued.items[0]?.hsn).toBe('6109');
    expect(issued.billingAddress.line1).toBe('Original address');
    expect(issued.seller.legalName).toBe('Cruisin Original Pvt Ltd');
  });
});
