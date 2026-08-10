// Governed by .rules v1.0
import { z } from "zod";
import { objectIdSchema } from "./common.validator.js";

export const logisticsQuoteSchema = z
  .object({
    deliveryPostcode: z.string().regex(/^[1-9]\d{5}$/),
    paymentMode: z.enum(["prepaid", "cod"]),
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
    shipment_id: z.union([z.string(), z.number()]).optional(),
    current_status: z.string().trim().min(1).max(120).optional(),
    status: z.string().trim().min(1).max(120).optional(),
    status_id: z.coerce.number().optional(),
    etd: providerTimestampSchema.optional(),
    scans: z
      .array(
        z
          .object({
            date: providerTimestampSchema,
            status: z.string().trim().min(1).max(120),
            activity: z.string().trim().max(500).optional(),
            location: z.string().trim().max(200).optional(),
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
      !value.shipment_id
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Webhook requires a shipment identifier",
      });
    }
    if (!value.current_status && !value.status) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Webhook requires a shipment status",
      });
    }
  });

export const returnRequestSchema = z
  .object({
    orderId: objectIdSchema,
    variantId: objectIdSchema,
    quantity: z.number().int().positive().max(100),
    reason: z.string().trim().min(3).max(200),
    details: z.string().trim().max(1_000).optional(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

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
  })
  .strict();
