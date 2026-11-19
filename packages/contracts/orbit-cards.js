import { z } from 'zod';
import { editorialLinkSchema } from './editorial.js';

export const orbitCardSchema = z.object({
  label: z.string().trim().min(1).max(80),
  image: editorialLinkSchema,
  video: editorialLinkSchema.optional(),
  href: editorialLinkSchema
}).strict();

export const orbitCardsSchema = z.object({
  cards: z.array(orbitCardSchema).min(3).max(12),
  autoplay: z.boolean().default(true),
  mouseControl: z.boolean().default(true),
  cycleSeconds: z.number().min(16).max(120).default(48)
}).strict();

export const DEFAULT_ORBIT_CONTENT = {
  cards: JSON.stringify([
    { label: 'Men / Studio', image: '/images/department/men-studio.jpg', video: '/videos/department/men-studio.mp4', href: '/men' },
    { label: 'Women / City', image: '/images/department/women-city.jpg', video: '/videos/department/women-city.mp4', href: '/women' },
    { label: 'The shirt edit', image: '/images/catalog-demo/83-1.webp', href: '/category/men/shirts' },
    { label: 'After hours', image: '/images/catalog-demo/177-1.webp', href: '/women' },
    { label: 'Studio details', image: '/images/department/men-studio-detail.jpg', href: '/men' },
    { label: 'The city edit', image: '/images/department/women-city-detail.jpg', href: '/women' },
    { label: 'Checks in rotation', image: '/images/catalog-demo/85-1.webp', href: '/category/men/shirts' },
    { label: 'Evening silhouettes', image: '/images/catalog-demo/179-1.webp', href: '/women' }
  ]),
  autoplay: true,
  mouseControl: true,
  cycleSeconds: 48
};

export function readOrbitContent(content) {
  if (typeof content.cards !== 'string') return null;
  try {
    const parsed = orbitCardsSchema.safeParse({
      cards: JSON.parse(content.cards),
      autoplay: content.autoplay,
      mouseControl: content.mouseControl,
      cycleSeconds: content.cycleSeconds
    });
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
