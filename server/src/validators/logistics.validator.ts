// Governed by .rules v1.0
import { z } from "zod";
import { objectIdSchema } from "./common.validator.js";

export const logisticsQuoteSchema = z
  .object({
    deliveryPostcode: z.string().regex(/^[1-9]\d{5}$/),
    paymentMode: z.enum(["prepaid", "cod"]),
    expectedCartVersion: z.number().int().min(0).optional(),
  })
  .strict();

export const shipmentIdParamSchema = z.object({ shipmentId: objectIdSchema });
export const documentParamSchema = z.object({
  shipmentId: objectIdSchema,
  kind: z.enum(["label", "invoice", "manifest"]),
});
export const orderIdParamSchema = z.object({ orderId: objectIdSchema });

export const logisticsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  orderId: objectIdSchema.optional(),
  status: z.string().trim().max(80).optional(),
  type: z.enum(["forward", "return", "exchange_replacement"]).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const logisticsAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const packageConfirmationSchema = z
  .object({
    productWeightKg: z.number().positive().max(100),
    packagingWeightKg: z.number().positive().max(25),
    deadWeightKg: z.number().positive().max(100),
    chargedWeightKg: z.number().positive().max(100).optional(),
    lengthCm: z.number().positive().max(300),
    breadthCm: z.number().positive().max(300),
    heightCm: z.number().positive().max(300),
    packagePreset: z.string().trim().max(80).optional(),
    measurementConfirmed: z.literal(true).default(true),
    warnings: z.array(z.string().max(200)).max(20).default([]),
  })
  .superRefine((value, context) => {
    if (
      Math.abs(
        value.deadWeightKg - (value.productWeightKg + value.packagingWeightKg),
      ) > 0.01
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deadWeightKg"],
        message: "Dead weight must equal product plus packaging weight",
      });
    }
  });

export const courierSelectionSchema = z
  .object({ courierId: z.number().int().positive().optional() })
  .strict();
export const ndrActionSchema = z
  .object({
    action: z.enum([
      "reattempt",
      "correct_address",
      "confirm_availability",
      "update_phone",
      "contacted",
      "escalate",
      "accept_rto",
      "note",
    ]),
    note: z.string().trim().max(500).optional(),
  })
  .strict();
export const rtoWarehouseSchema = z
  .object({
    action: z.enum(["received", "inspection_passed", "inspection_failed"]),
  })
  .strict();

const providerTimestampSchema = z
  .string()
  .trim()
  .max(80)
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Invalid provider timestamp",
  );

export const logisticsWebhookSchema = z
  .object({
    awb: z.union([z.string(), z.number()]).optional(),
    awb_code: z.union([z.string(), z.number()]).optional(),
    order_id: z.union([z.string(), z.number()]).optional(),
    sr_order_id: z.union([z.string(), z.number()]).optional(),
    channel_order_id: z.union([z.string(), z.number()]).optional(),
    source_order_id: z.union([z.string(), z.number()]).optional(),
    shipment_id: z.union([z.string(), z.number()]).optional(),
    current_status: z.string().trim().min(1).max(120).optional(),
    shipment_status: z.string().trim().min(1).max(120).optional(),
    status: z.string().trim().min(1).max(120).optional(),
    status_id: z.coerce.number().optional(),
    current_status_id: z.coerce.number().optional(),
    shipment_status_id: z.coerce.number().optional(),
    courier_name: z.string().trim().max(160).optional(),
    courier_id: z.coerce.number().optional(),
    pickup_status: z.string().trim().max(120).optional(),
    pickup_scheduled_date: providerTimestampSchema.optional(),
    etd: providerTimestampSchema.optional(),
    scans: z
      .array(
        z
          .object({
            date: providerTimestampSchema,
            status: z.string().trim().min(1).max(120),
            activity: z.string().trim().max(500).optional(),
            location: z.string().trim().max(200).optional(),
            status_id: z.coerce.number().optional(),
            'sr-status': z.coerce.number().optional(),
          })
          .passthrough(),
      )
      .max(100)
      .optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    if (
      !value.awb &&
      !value.awb_code &&
      !value.order_id &&
      !value.sr_order_id &&
      !value.channel_order_id &&
      !value.source_order_id &&
      !value.shipment_id
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Webhook requires a shipment identifier",
      });
    }
    if (!value.current_status && !value.shipment_status && !value.status) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Webhook requires a shipment status",
      });
    }
  });

export const returnRequestSchema = z
  .object({
    orderId: objectIdSchema,
    items: z.array(z.object({ variantId: objectIdSchema, quantity: z.number().int().positive().max(100) }).strict()).min(1).max(20),
    reason: z.enum(['wrong_size_fit', 'damaged_product', 'defective_product', 'wrong_item_received', 'different_from_expectation', 'quality_issue', 'missing_item_part', 'other']),
    details: z.string().trim().max(1_000).optional().default(''),
    evidence: z.array(z.object({
      publicId: z.string().trim().min(10).max(500),
      version: z.number().int().positive(),
      format: z.enum(['jpg', 'jpeg', 'png', 'webp']),
      token: z.string().regex(/^[a-f0-9]{64}$/)
    }).strict()).min(1, 'Upload at least one photo').max(5),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const returnPaymentVerifySchema = z.object({
  requestId: objectIdSchema,
  payload: z.record(z.unknown())
}).strict();

export const refundDestinationSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('original_payment') }).strict(),
  z.object({ method: z.literal('wallet') }).strict(),
  z.object({ method: z.literal('upi'), upiId: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{1,254}@[a-z][a-z0-9.-]{1,63}$/i, 'Enter a valid UPI ID') }).strict(),
  z.object({
    method: z.literal('bank'),
    accountHolderName: z.string().trim().min(2).max(100),
    accountNumber: z.string().trim().regex(/^\d{6,18}$/, 'Enter a valid bank account number'),
    confirmAccountNumber: z.string().trim().regex(/^\d{6,18}$/),
    ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC')
  }).strict()
]).superRefine((value, context) => {
  if (value.method === 'bank' && value.accountNumber !== value.confirmAccountNumber) context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmAccountNumber'], message: 'Bank account numbers do not match' });
});

export const adminRefundDestinationSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('wallet') }).strict(),
  z.object({ method: z.literal('upi'), upiId: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{1,254}@[a-z][a-z0-9.-]{1,63}$/i, 'Enter a valid UPI ID') }).strict()
]);

export const exchangeRequestSchema = z
  .object({
    orderId: objectIdSchema,
    variantId: objectIdSchema,
    requestedVariantId: objectIdSchema,
    quantity: z.number().int().positive().max(100),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const workflowActionSchema = z
  .object({
    action: z.string().trim().min(2).max(80),
    note: z.string().trim().max(1_000).optional(),
    upiId: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{1,254}@[a-z][a-z0-9.-]{1,63}$/i).optional(),
    transactionReference: z.string().trim().regex(/^[A-Za-z0-9._\/-]{4,80}$/).optional(),
    transferredAt: z.string().datetime().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === 'record_manual_upi_refund') {
      if (!value.upiId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['upiId'], message: 'UPI ID is required' });
      if (!value.transactionReference) context.addIssue({ code: z.ZodIssueCode.custom, path: ['transactionReference'], message: 'UPI transaction reference is required' });
    }
  });
