// Governed by .rules v1.0
import type { CmsSectionInput } from '@/hooks/useAdminMutations';
import type { CmsPageDto, CmsSectionDto, CmsSectionType } from '@/types/dto.types';

export interface SectionSuggestion {
  type: CmsSectionType;
  title: string;
  reason: string;
  input?: Partial<CmsSectionInput>;
}

export function sectionSuggestions(page: CmsPageDto | undefined, sections: CmsSectionDto[], refresh: number): SectionSuggestion[] {
  if (!page) return [];
  const department = page.slug === 'men' || page.slug === 'women' ? page.title : '';
  const shop = department ? '/' + page.slug + '#collection' : '/shop';
  const candidates: SectionSuggestion[] = [
    { type: 'product_carousel', title: department ? department + ' · New arrivals' : 'The latest arrivals', reason: 'Show new products in a shoppable row.' },
    { type: 'best_sellers', title: department ? department + ' · Best sellers' : 'Best sellers', reason: 'Help shoppers discover popular pieces.' },
    { type: 'category_editorial_grid', title: 'Shop by category', reason: 'Give shoppers shortcuts to the catalogue.' },
    { type: 'recently_viewed', title: 'Recently viewed', reason: 'Let returning shoppers pick up where they left off.' },
    { type: 'newsletter', title: 'Get drop updates', reason: 'Add an email signup for upcoming releases.', input: { content: { offerText: 'Get emails about new Cruisin drops.' } } },
    { type: 'hero_campaign', title: department ? department + ' · The new edit' : 'The new edit', reason: 'Lead with an image and a shop link.', input: { content: { campaignLabel: 'THE EDIT', ctaText: 'Explore the edit', ctaLink: shop } } },
    { type: 'featured_collection', title: 'In focus', reason: 'Put one collection in the spotlight.', input: { content: { collectionLabel: 'IN FOCUS', ctaText: 'Explore the edit', ctaLink: shop } } },
    { type: 'video_landing', title: 'The campaign film', reason: 'Add a film with a still image for mobile.', input: { content: { ctaText: 'Shop the edit', ctaLink: shop } } },
    { type: 'brand_story', title: 'Behind the collection', reason: 'Add editorial copy and a supporting image.', input: { content: { ctaText: 'Explore the edit', ctaLink: shop } } }
  ];
  const typesOnPage = new Set(sections.map(section => section.type));
  const ordered = [...candidates.filter(item => !typesOnPage.has(item.type)), ...candidates.filter(item => typesOnPage.has(item.type))];
  const start = (refresh * 3) % ordered.length;
  return [...ordered.slice(start), ...ordered.slice(0, start)].slice(0, 3);
}
