// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { bulkInvoicePdfSchema, invoiceListQuerySchema, invoiceSettingsSchema } from './invoice.validator.js';

describe('invoice API validation', () => {
  it('coerces safe pagination and amount filters', () => {
    expect(invoiceListQuerySchema.parse({ page: '2', limit: '25', minAmount: '100', maxAmount: '200' })).toMatchObject({ page: 2, limit: 25, minAmount: 100, maxAmount: 200 });
  });

  it('rejects invalid date ranges, excessive pages, and inverted amounts', () => {
    expect(invoiceListQuerySchema.safeParse({ startDate: '2026-09-10', endDate: '2026-09-01' }).success).toBe(false);
    expect(invoiceListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(invoiceListQuerySchema.safeParse({ minAmount: 500, maxAmount: 100 }).success).toBe(false);
  });

  it('rejects invalid IDs, duplicate selections, and ambiguous select-all requests', () => {
    const id = '66dff3ab1b43b28cb1260a01';
    expect(bulkInvoicePdfSchema.safeParse({ invoiceIds: ['invalid'] }).success).toBe(false);
    expect(bulkInvoicePdfSchema.safeParse({ invoiceIds: [id, id] }).success).toBe(false);
    expect(bulkInvoicePdfSchema.safeParse({ invoiceIds: [id], selectAll: true }).success).toBe(false);
  });

  it('validates configurable seller identity and bulk resource limits', () => {
    const base = { legalName: 'Cruisin', tradeName: 'CRUISIN', invoicePrefix: 'CR', registeredAddress: 'KV APPAREL 992/1, Gali No. 2, Kapashera Extention, Kapashera, New Delhi 110037', gstin: '07BZXPV5435K1ZB', state: 'Delhi', stateCode: '07', phone: '8287846203', email: '', footer: 'Thank you', authorizedSignatory: '', signatureAssetUrl: '', bulkPdfLimit: 100 };
    expect(invoiceSettingsSchema.safeParse(base).success).toBe(true);
    expect(invoiceSettingsSchema.safeParse({ ...base, bulkPdfLimit: 251 }).success).toBe(false);
  });
});
