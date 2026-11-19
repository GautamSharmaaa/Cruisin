// Governed by .rules v1.0
import { z } from 'zod';
import { isMetaStorefrontPath, META_COMMERCE_EVENTS, META_CONSENT_VERSION } from '@cruisin/contracts/meta-commerce';

export const metaPixelIdSchema = z.string().regex(/^\d{5,32}$/);
const consentId = z.string().uuid();
const identifier = z.string().max(512).regex(/^fb\.\d{1,3}\.\d{13}\.[A-Za-z0-9_-]+$/);

export const metaAttributionSchema = z.object({
  pixelId: metaPixelIdSchema,
  consentId,
  fbp: identifier.optional(),
  fbc: identifier.optional()
}).strict();

export const metaConsentSchema = z.object({
  pixelId: metaPixelIdSchema,
  consentId,
  version: z.literal(META_CONSENT_VERSION),
  granted: z.boolean(),
  source: z.enum(['default', 'shopper']).optional()
}).strict();

const contentId = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const money = z.number().min(0).max(100_000_000);
const units = z.number().int().min(1).max(10_000);
const base = metaAttributionSchema.extend({
  eventId: z.string().min(12).max(160).regex(/^[A-Za-z0-9:_-]+$/),
  path: z.string().refine(isMetaStorefrontPath, 'Invalid storefront path')
});

export const metaEventSchema = z.discriminatedUnion('name', [
  base.extend({ name: z.literal('PageView') }).strict(),
  base.extend({
    name: z.literal('Search'),
    search: z.object({
      content_ids: z.array(contentId).max(50),
      num_results: z.number().int().min(0).max(100_000)
    }).strict()
  }).strict(),
  base.extend({
    name: z.enum(META_COMMERCE_EVENTS),
    commerce: z.object({
      contents: z.array(z.object({ id: contentId, quantity: units, item_price: money }).strict()).min(1).max(100),
      value: money,
      payment_method: z.enum(['cod', 'online', 'online_partial']).optional()
    }).strict()
  }).strict()
]);

export type MetaConsentInput = z.infer<typeof metaConsentSchema>;
export type MetaEventInput = z.infer<typeof metaEventSchema>;
