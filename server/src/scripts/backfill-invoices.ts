// Governed by .rules v1.0
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { InvoiceModel } from '../models/invoice.model.js';
import { OrderModel } from '../models/order.model.js';
import { InvoiceService } from '../services/invoice.service.js';

const execute = process.argv.includes('--execute');
const confirmed = process.argv.includes('--confirm=CREATE_HISTORICAL_INVOICES');
const limitArgument = process.argv.find((value) => value.startsWith('--limit='));
const limit = Math.min(10_000, Math.max(1, Number(limitArgument?.split('=')[1] ?? 1_000)));
if (execute && !confirmed) throw new Error('Refusing historical invoice creation without --confirm=CREATE_HISTORICAL_INVOICES');

await mongoose.connect(env.MONGODB_URI, { autoIndex: false, maxPoolSize: 2, serverSelectionTimeoutMS: 10_000 });
try {
  const eligible = {
    orderStatus: 'delivered',
    $or: [
      { paymentMethod: { $ne: 'cod' }, paymentStatus: { $in: ['paid', 'partially_refunded', 'refunded'] } },
      { paymentMethod: 'cod', paymentStatus: { $in: ['cod_pending', 'cod_collected', 'paid', 'partially_refunded', 'refunded'] } }
    ]
  };
  const [ordersScanned, eligibleOrders, existingInvoices] = await Promise.all([OrderModel.estimatedDocumentCount(), OrderModel.countDocuments(eligible), InvoiceModel.estimatedDocumentCount()]);
  const candidates = await OrderModel.find(eligible).select('_id orderNumber createdAt').sort({ createdAt: 1, _id: 1 }).limit(limit).lean();
  const existingIds = new Set((await InvoiceModel.find({ _id: { $in: candidates.map((order) => order._id) } }).select('_id').lean()).map((invoice) => String(invoice._id)));
  const missing = candidates.filter((order) => !existingIds.has(String(order._id)));
  console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', limit, ordersScanned, eligibleOrders, existingInvoices, candidatesInspected: candidates.length, invoicesThatWouldBeCreated: missing.length, limited: eligibleOrders > limit, eligibility: 'Only successfully delivered orders are included.', invoiceDating: 'Historical invoices use the original order date and financial year.', orderNumberPolicy: 'The original order number is copied unchanged.', duplicateProtection: 'Invoice _id equals order _id; retries cannot create two invoices for one order.', plannedInvoices: missing.map((order) => ({ orderId: String(order._id), orderNumber: order.orderNumber ?? String(order._id), invoiceDate: order.createdAt })) }, null, 2));
  if (!execute) console.log('DRY RUN ONLY. No invoices or counters were created.');
  else {
    let created = 0;
    let issues = 0;
    for (const order of missing) {
      try { if (await InvoiceService.ensureForOrder(String(order._id), order.createdAt)) created += 1; else issues += 1; }
      catch (error) { issues += 1; console.error(JSON.stringify({ orderId: String(order._id), orderNumber: order.orderNumber, error: error instanceof Error ? error.message : 'Unknown error' })); }
    }
    console.log(JSON.stringify({ created, issues }, null, 2));
  }
} finally {
  await mongoose.disconnect();
}
