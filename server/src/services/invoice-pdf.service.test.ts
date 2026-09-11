// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { renderInvoicePdf } from './invoice-pdf.service.js';

const invoice = (number: string): Record<string, unknown> => ({
  invoiceNumber: number, invoiceDate: '2026-09-10T06:30:00.000Z', orderNumber: `ORDER-${number}`, orderDate: '2026-09-09T06:30:00.000Z',
  seller: { legalName: 'Cruisin', tradeName: 'CRUISIN', registeredAddress: 'KV APPAREL 992/1, Gali No. 2, Kapashera Extention, Kapashera, New Delhi 110037, Near Mahadeep Public School, South West Delhi, Delhi, India', gstin: '07BZXPV5435K1ZB', state: 'Delhi', stateCode: '07', phone: '8287846203', email: '', footer: 'Thank you for shopping with Cruisin.' },
  customer: { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '8888888888' },
  billingAddress: { fullName: 'Rahul Sharma', line1: '10 Fashion Street', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
  shippingAddress: { fullName: 'Rahul Sharma', line1: '10 Fashion Street', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' }, placeOfSupply: { state: 'Karnataka', stateCode: '29' },
  items: [{ productName: 'Performance Tee', variant: 'Black / M', sku: 'TEE-BLK-M', hsn: '6109', quantity: 1, unitPrice: 899, discount: 0, taxableValue: 856.19, gstRate: 5, cgstAmount: 21.41, sgstAmount: 21.4, igstAmount: 0, lineTotal: 899 }],
  subtotal: 899, productDiscount: 0, couponDiscount: 0, promotionDiscount: 0, shippingCharge: 90, codFee: 0, taxableValue: 856.19, cgst: 21.41, sgst: 21.4, igst: 0, totalTax: 42.81, grandTotal: 989, paymentMethod: 'razorpay', paymentStatus: 'paid'
});

describe('invoice PDF renderer', () => {
  it('renders a single PDF from only the immutable invoice snapshot', async () => {
    const pdf = await renderInvoicePdf([invoice('CR/26-27/000001')]);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(2_000);
  });

  it('merges selected invoices into one PDF and starts each invoice on a new page', async () => {
    const pdf = await renderInvoicePdf([invoice('CR/26-27/000001'), invoice('CR/26-27/000002'), invoice('CR/26-27/000003')]);
    const source = pdf.toString('latin1');
    expect((source.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('renders safely when the customer has no email or phone', async () => {
    const withoutContact = invoice('CR/26-27/000004');
    withoutContact.customer = { name: 'Rahul Sharma', email: '', phone: '' };
    withoutContact.billingAddress = { fullName: 'Rahul Sharma', line1: '10 Fashion Street', city: 'Delhi', state: 'Delhi', postalCode: '110037', country: 'India', phone: '' };
    withoutContact.shippingAddress = { fullName: 'Rahul Sharma', line1: '10 Fashion Street', city: 'Delhi', state: 'Delhi', postalCode: '110037', country: 'India', phone: '' };
    const pdf = await renderInvoicePdf([withoutContact]);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
