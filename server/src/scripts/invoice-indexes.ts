// Governed by .rules v1.0
import { MongoClient, type IndexDescription } from 'mongodb';
import { env } from '../config/env.js';

const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes('--confirm=CREATE_INVOICE_INDEXES');
if (apply && !confirmed) throw new Error('Refusing index creation without --confirm=CREATE_INVOICE_INDEXES');

const invoiceIndexes: IndexDescription[] = [
  { key: { invoiceNumber: 1 }, name: 'invoice_number_unique', unique: true },
  { key: { orderId: 1 }, name: 'invoice_order_unique', unique: true },
  { key: { invoiceDate: -1 }, name: 'invoice_date_desc' },
  { key: { orderDate: -1 }, name: 'invoice_order_date_desc' },
  { key: { invoiceStatus: 1, invoiceDate: -1 }, name: 'invoice_status_date' },
  { key: { paymentMethod: 1, invoiceDate: -1 }, name: 'invoice_payment_method_date' },
  { key: { 'customer.state': 1, invoiceDate: -1 }, name: 'invoice_customer_state_date' },
  { key: { 'customer.email': 1 }, name: 'invoice_customer_email' },
  { key: { 'customer.phone': 1 }, name: 'invoice_customer_phone' },
  { key: { grandTotal: 1, invoiceDate: -1 }, name: 'invoice_total_date' }
];

const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
try {
  await client.connect();
  const collection = client.db().collection('invoices');
  const existing = await collection.listIndexes().toArray().catch(() => []);
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', collection: 'invoices', existing: existing.map((index) => ({ name: index.name, key: index.key, unique: Boolean(index.unique) })), planned: invoiceIndexes }, null, 2));
  if (apply) {
    const names = await collection.createIndexes(invoiceIndexes);
    console.log(JSON.stringify({ createdOrConfirmed: names }, null, 2));
  } else {
    console.log('DRY RUN ONLY. No indexes were created.');
  }
} finally {
  await client.close();
}
