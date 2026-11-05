import { z } from "zod";
const id = z.string().regex(/^[a-f\d]{24}$/i);
export const receiveUnitsSchema = z
  .object({
    variant: id,
    quantity: z.number().int().min(1).max(500),
    location: z.string().trim().min(1).max(100),
    idempotencyKey: z.string().min(8).max(150),
  })
  .strict();
const work = {
  sop: id,
  completed: z.array(z.string().max(60)).max(100),
  evidence: z.array(id).max(20),
  version: z.number().int().min(0),
};
export const unitQcSchema = z
  .object({
    ...work,
    scannedCode: z.string().max(200).optional(),
    result: z.enum(["PASSED", "FAILED", "REVIEW_REQUIRED"]),
    measurements: z
      .record(z.string().max(100), z.number().finite())
      .default({}),
    defectCategory: z.string().trim().min(2).max(100).optional(),
    reason: z.string().max(2000).optional(),
  })
  .strict();
export const unitPackagingSchema = z
  .object({ ...work, scannedCode: z.string().min(1).max(200) })
  .strict();
export const unitPickSchema = z.object({ order: id }).strict();
export const unitReturnSchema = z
  .object({
    returnRequest: id,
    disposition: z.enum([
      "REPACKAGE",
      "QUARANTINE",
      "DAMAGED",
      "RETURN_TO_VENDOR",
    ]),
    reason: z.string().min(5).max(2000),
    version: z.number().int().min(0),
  })
  .strict();
export const exceptionSchema = z
  .object({
    type: z.string().min(2).max(80),
    severity: z.enum(["low", "medium", "high"]).default("medium"),
    entity: z.string().min(1).max(200),
    reason: z.string().min(5).max(2000),
    evidence: z.array(id).max(20).default([]),
  })
  .strict();
export const unitDispositionSchema = z
  .object({
    version: z.number().int().min(0),
    state: z.enum(["QUARANTINED", "DAMAGED", "RETURNED_TO_VENDOR"]),
    reason: z.string().trim().min(5).max(2000),
    evidence: z.array(id).min(1).max(20),
  })
  .strict();
