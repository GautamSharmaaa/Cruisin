// Governed by .rules v1.0
import { z } from 'zod';

export const bannerBodySchema = z.object({ title: z.string().min(2), subtitle: z.string().min(2), cta: z.object({ text: z.string().min(2), link: z.string().min(1) }), image: z.string().url(), mobileImage: z.string().url(), position: z.string().min(2), isActive: z.boolean().default(true), startDate: z.coerce.date(), endDate: z.coerce.date(), sortOrder: z.number().int().default(0) });
