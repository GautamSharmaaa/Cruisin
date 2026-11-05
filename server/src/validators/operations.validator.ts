import { patchObject } from "./patch-object.js";
import { z } from "zod";
import { employeeRoles, permissions, taskStatuses } from "@cruisin/contracts";
import { objectIdSchema } from "./common.validator.js";
export const operationIdSchema = z.object({ id: objectIdSchema });
export const operationPageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().max(30).optional(),
  overdue: z.enum(["true", "false"]).optional(),
});
const phone = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Use an international phone number");
export const employeeCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone,
    role: z.enum(employeeRoles),
    grants: z.array(z.enum(permissions)).max(30).default([]),
    denials: z.array(z.enum(permissions)).max(30).default([]),
  })
  .strict();
export const employeeUpdateSchema = patchObject(employeeCreateSchema)
  .extend({ version: z.number().int().min(0), active: z.boolean().optional() })
  .strict();
export const employeeOtpRequestSchema = z.object({ phone }).strict();
export const employeeOtpVerifySchema = z
  .object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) })
  .strict();
export const taskCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(8000).default(""),
    category: z.string().trim().min(2).max(80).default("general_operations"),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    assignees: z.array(objectIdSchema).min(1).max(30),
    dueAt: z.iso.datetime({ offset: true }).optional(),
    attachments: z.array(objectIdSchema).max(20).default([]),
    sop: objectIdSchema.optional(),
    unit: z
      .string()
      .regex(/^CU-[a-f0-9-]{36}$/)
      .optional(),
    order: objectIdSchema.optional(),
    sku: z.string().max(100).optional(),
    dependencies: z.array(objectIdSchema).max(20).default([]),
    internalInstructions: z.string().max(8000).default(""),
    requiresApproval: z.boolean().default(true),
    checklist: z
      .array(
        z.object({
          id: z.string().uuid(),
          label: z.string().min(1).max(200),
          checked: z.boolean().default(false),
        }),
      )
      .max(100)
      .default([]),
  })
  .strict();
export const taskUpdateSchema = patchObject(taskCreateSchema)
  .extend({
    version: z.number().int().min(0),
    comment: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();
export const taskTransitionSchema = z
  .object({
    version: z.number().int().min(0),
    status: z.enum(taskStatuses),
    reason: z.string().trim().max(2000).default(""),
  })
  .strict();
export const approvalReviewSchema = z
  .object({
    version: z.number().int().min(0),
    status: z.enum(["APPROVED", "REJECTED", "REWORK_REQUIRED", "CANCELLED"]),
    notes: z.string().trim().min(2).max(2000),
  })
  .strict();
export const adjustmentSchema = z
  .object({
    product: objectIdSchema,
    variant: objectIdSchema,
    returnReference: objectIdSchema.optional(),
    expectedStock: z.number().int().min(0),
    expectedRevision: z.number().int().min(0),
    newStock: z.number().int().min(0).max(1000000),
    damagedDelta: z.number().int().min(0).max(1000000).default(0),
    reason: z.string().trim().min(5).max(2000),
    evidence: z.array(objectIdSchema).max(20).default([]),
  })
  .strict();
export const scanSchema = z
  .object({ code: z.string().trim().min(1).max(300) })
  .strict();
export const labelSchema = z
  .object({ product: objectIdSchema, variant: objectIdSchema })
  .strict();
export const packingScanSchema = z
  .object({
    task: objectIdSchema,
    code: z.string().trim().min(1).max(300),
    version: z.number().int().min(0),
  })
  .strict();
export const packingCompleteSchema = z
  .object({ task: objectIdSchema, version: z.number().int().min(0) })
  .strict();
export const sopCreateSchema = z
  .object({
    measurements: z
      .array(
        z
          .object({
            key: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
            label: z.string().min(1).max(160),
            unit: z.string().min(1).max(30),
            min: z.number().finite(),
            max: z.number().finite(),
            required: z.boolean(),
          })
          .strict()
          .refine((v) => v.min <= v.max, "Minimum must not exceed maximum"),
      )
      .max(100)
      .refine(
        (a) => new Set(a.map((r) => r.key)).size === a.length,
        "Measurement keys must be unique",
      )
      .default([]),
    kind: z.enum(["GENERAL", "PRODUCT", "PACKAGING"]).default("GENERAL"),
    sections: z
      .array(
        z
          .object({
            title: z.string().min(1).max(160),
            body: z.string().max(10000),
          })
          .strict(),
      )
      .max(50)
      .default([]),
    requirements: z
      .array(
        z
          .object({
            key: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
            label: z.string().min(1).max(500),
            mandatory: z.boolean(),
            photo: z.boolean(),
            scan: z.boolean(),
          })
          .strict(),
      )
      .max(100)
      .refine(
        (a) => new Set(a.map((r) => r.key)).size === a.length,
        "Requirement keys must be unique",
      )
      .default([]),
    title: z.string().trim().min(3).max(160),
    category: z.string().min(2).max(80),
    body: z.string().min(3).max(50000),
    steps: z.array(z.string().min(1).max(2000)).max(100).default([]),
    attachments: z.array(objectIdSchema).max(30).default([]),
    roles: z.array(z.enum(employeeRoles)).max(10).default([]),
    products: z.array(objectIdSchema).max(100).default([]),
  })
  .strict();
export const sopUpdateSchema = patchObject(sopCreateSchema)
  .extend({ version: z.number().int().min(0) })
  .strict();
export const revisionSchema = z
  .object({ version: z.number().int().min(0) })
  .strict();
export const sopSuggestionSchema = z
  .object({
    version: z.number().int().min(0),
    reason: z.string().trim().min(5).max(2000),
    body: z.string().min(3).max(50000),
  })
  .strict();
export type OperationPage = z.infer<typeof operationPageSchema>;

export const generalApprovalSchema = z
  .object({
    kind: z.enum(["inspection", "order_exception"]),
    entity: objectIdSchema,
    reason: z.string().trim().min(5).max(2000),
    evidence: z.array(objectIdSchema).max(20).default([]),
    proposed: z
      .object({
        note: z.string().trim().min(3).max(2000),
        outcome: z.enum(["pass", "fail"]).optional(),
      })
      .strict(),
  })
  .strict();
