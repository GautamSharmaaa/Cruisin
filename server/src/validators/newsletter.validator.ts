// Governed by .rules v1.0
import { z } from 'zod';

export const newsletterSubscribeSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  source: z.string().trim().max(120).optional().default('homepage'),
  consent: z.boolean().optional().default(true)
});
