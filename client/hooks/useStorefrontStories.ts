// Governed by .rules v1.0
import { useQuery } from '@tanstack/react-query';
import { editorialLinkSchema } from '@cruisin/contracts/editorial';
import { api } from '@/lib/api';
import { CRUISIN_HUB_COPY as C } from '@/constants/cruisin-hub-copy';
import type { ApiEnvelope } from '@/types/api.types';
import type { CmsExperienceDto, CmsSectionDto } from '@/types/dto.types';

export interface StorefrontStory {
  id: string; title: string; subtitle: string; label: string; desktop: string; mobile: string;
  alt: string; href: string; cta: string; hideOnMobile: boolean; hideOnDesktop: boolean;
}
const text = (section: CmsSectionDto, key: string, fallback = ''): string => typeof section.content?.[key] === 'string' ? String(section.content[key]).trim() : fallback;
const imageUrl = (value: string): string => {
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { return new URL(value).protocol === 'https:' ? value : ''; } catch { return ''; }
};
const storyTypes = new Set(['hero_campaign', 'lookbook_story', 'brand_story', 'mobile_media_landing', 'video_landing']);
export function publishedStories(experience: CmsExperienceDto): StorefrontStory[] {
  if (experience.preview || experience.page?.status !== 'published') return [];
  return experience.sections.filter(section => {
    const now = Date.now();
    return storyTypes.has(section.type ?? '') && section.status === 'published' && (section.active ?? section.isActive) &&
      (!section.startDate || Date.parse(section.startDate) <= now) && (!section.endDate || Date.parse(section.endDate) > now);
  }).sort((a, b) => a.sortOrder - b.sortOrder).flatMap(section => {
    const desktop = imageUrl(text(section, 'desktopMedia', text(section, 'posterImage', text(section, 'craftsmanshipImage', text(section, 'imageOne', section.image ?? '')))));
    const mobile = imageUrl(text(section, 'mobileMedia', text(section, 'mobileFallbackImage', section.mobileImage ?? desktop)));
    if (!desktop && !mobile) return [];
    const link = editorialLinkSchema.safeParse(text(section, 'ctaLink', section.cta?.link ?? '/shop'));
    return [{ id: section._id ?? section.id, title: section.title, subtitle: section.subtitle ?? '', label: text(section, 'campaignLabel') || C.brand,
      desktop: desktop || mobile, mobile: mobile || desktop, alt: text(section, 'altText', section.title),
      href: link.success ? link.data : '/shop', cta: text(section, 'ctaText', section.cta?.text ?? C.shop),
      hideOnMobile: section.hideOnMobile ?? false, hideOnDesktop: section.hideOnDesktop ?? false }];
  });
}
export const useStorefrontStories = (enabled: boolean) => useQuery({
  queryKey: ['storefront-stories'], enabled, staleTime: 0, retry: 1,
  queryFn: async (): Promise<StorefrontStory[]> => {
    const response = await api.get<ApiEnvelope<CmsExperienceDto>>('/cms/pages/home/public');
    return publishedStories(response.data.data);
  },
});
