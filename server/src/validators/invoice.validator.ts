// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional();
const optionalMoney = z.coerce.number().min(0).max(100_000_000).optional();
const optionalFilter = z.string().trim().max(100).optional();

const invoiceListQueryBaseSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  orderStartDate: optionalDate,
  orderEndDate: optionalDate,
  paymentMethod: z.enum(['razorpay', 'stripe', 'cod']).optional(),
  paymentStatus: optionalFilter,
  orderStatus: optionalFilter,
  invoiceStatus: z.enum(['generated', 'void']).optional(),
  state: optionalFilter,
  minAmount: optionalMoney,
  maxAmount: optionalMoney,
  sort: z.enum(['newest', 'oldest', 'total-asc', 'total-desc']).default('newest')
});

export const invoiceListQuerySchema = invoiceListQueryBaseSchema.superRefine((value, context) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Invoice end date must be on or after start date' });
  if (value.orderStartDate && value.orderEndDate && value.orderStartDate > value.orderEndDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ['orderEndDate'], message: 'Order end date must be on or after start date' });
  if (value.minAmount !== undefined && value.maxAmount !== undefined && value.minAmount > value.maxAmount) context.addIssue({ code: z.ZodIssueCode.custom, path: ['maxAmount'], message: 'Maximum amount must be at least the minimum amount' });
});

export const bulkInvoicePdfSchema = z.object({
  invoiceIds: z.array(objectIdSchema).max(250).optional(),
  selectAll: z.boolean().default(false),
  filters: invoiceListQueryBaseSchema.omit({ page: true, limit: true }).optional()
}).superRefine((value, context) => {
  if (!value.selectAll && (!value.invoiceIds || value.invoiceIds.length === 0)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['invoiceIds'], message: 'Select at least one invoice' });
  if (value.selectAll && value.invoiceIds?.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['invoiceIds'], message: 'Use either selected invoice ids or all filtered results' });
  if (value.invoiceIds && new Set(value.invoiceIds).size !== value.invoiceIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['invoiceIds'], message: 'Invoice selection contains duplicates' });
});

export const invoiceSettingsSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  tradeName: z.string().trim().min(2).max(80),
  invoicePrefix: z.string().trim().regex(/^[A-Za-z0-9-]{1,12}$/, 'Use letters, numbers, or hyphens only').transform((value) => value.toUpperCase()),
  registeredAddress: z.string().trim().max(500),
  gstin: z.string().trim().regex(/^$|^[0-9]{2}[A-Z0-9]{13}$/, 'Enter a valid 15-character GSTIN').transform((value) => value.toUpperCase()),
  state: z.string().trim().max(80),
  stateCode: z.string().trim().regex(/^$|^[0-9]{2}$/, 'State code must contain two digits'),
  phone: z.string().trim().max(20),
  email: z.string().trim().email().or(z.literal('')),
  footer: z.string().trim().max(300),
  authorizedSignatory: z.string().trim().max(120),
  signatureAssetUrl: z.string().trim().url().or(z.literal('')),
  bulkPdfLimit: z.coerce.number().int().min(1).max(250)
});
