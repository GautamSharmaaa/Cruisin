import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/constants/config';
import { serverApi } from '@/lib/server-api';
import type { ApiEnvelope, PaginatedResult } from '@/types/api.types';
import type { CategoryDto, CollectionDto } from '@/types/dto.types';
import type { ApiProduct } from '@/lib/product-mapper';

const publicRoutes = ['/', '/shop', '/men', '/women', '/sale', '/new-featured', '/collections', '/about-us', '/privacy-policy', '/return-policy', '/shipping-policy', '/terms-and-condition'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = publicRoutes.map((path) => ({ url: SITE_CONFIG.url + path, changeFrequency: path === '/' ? 'daily' : 'weekly', priority: path === '/' ? 1 : 0.7 }));
  try {
    const [products, categories, collections] = await Promise.all([
      serverApi.get<ApiEnvelope<PaginatedResult<ApiProduct>>>('/products', { params: { limit: 100 } }),
      serverApi.get<ApiEnvelope<CategoryDto[]>>('/categories'),
      serverApi.get<ApiEnvelope<CollectionDto[]>>('/collections')
    ]);
    entries.push(...products.data.data.items.map((product) => ({ url: `${SITE_CONFIG.url}/product/${product.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })));
    entries.push(...categories.data.data.filter((category) => category.isActive && category.isVisible !== false && category.isPublished !== false).map((category) => ({ url: `${SITE_CONFIG.url}/category/${category.path ?? category.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })));
    entries.push(...collections.data.data.filter((collection) => collection.isVisible && collection.isPublished !== false).map((collection) => ({ url: `${SITE_CONFIG.url}/collections/${collection.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })));
  } catch {
    // A sitemap with stable public routes is preferable to a 500 while the API is unavailable.
  }
  return entries;
}
