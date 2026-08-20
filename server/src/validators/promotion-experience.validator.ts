// Governed by .rules v1.0
import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const allowedPlaceholders = new Set(['code', 'discount', 'saving']);
const copySchema = (maximum: number) => z.string().trim().max(maximum).superRefine((value, context) => {
  for (const match of value.matchAll(/{{\s*([^{}]+?)\s*}}/g)) {
    const placeholder = match[1]?.trim() ?? '';
    if (!allowedPlaceholders.has(placeholder)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Unsupported placeholder: {{${placeholder}}}` });
    }
  }
  if (value.replace(/{{\s*[^{}]+?\s*}}/g, '').includes('{{') || value.replace(/{{\s*[^{}]+?\s*}}/g, '').includes('}}')) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Malformed placeholder' });
  }
});

// Keep null first: z.coerce.date() would otherwise coerce null to the Unix epoch.
const optionalDate = z.union([z.null(), z.coerce.date()]).optional();

export const promotionExperienceBodySchema = z.object({
  enabled: z.boolean(),
  promotionId: z.union([objectIdSchema, z.null()]).optional(),
  campaignName: z.string().trim().max(120).default(''),
  campaignKey: z.string().trim().toLowerCase().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only'),
  popupEnabled: z.boolean(),
  bagMarqueeEnabled: z.boolean(),
  checkoutStripEnabled: z.boolean(),
  popupEyebrow: copySchema(80),
  popupHeadline: copySchema(140),
  popupDescription: copySchema(320),
  popupPrimaryCta: copySchema(80),
  popupSecondaryCta: copySchema(80),
  marqueeAvailableText: copySchema(220),
  marqueeAppliedText: copySchema(220),
  checkoutAvailableText: copySchema(220),
  checkoutAppliedText: copySchema(220),
  popupDelayMs: z.number().int().min(0).max(30_000),
  popupFrequency: z.enum(['once_per_session', 'once_per_24_hours', 'always']),
  startsAt: optionalDate,
  endsAt: optionalDate
}).superRefine((value, context) => {
  if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End time must be after start time' });
  }
  if (value.enabled && !value.promotionId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['promotionId'], message: 'Select a linked coupon before enabling the experience' });
  }
});

export type PromotionExperienceInput = z.infer<typeof promotionExperienceBodySchema>;
