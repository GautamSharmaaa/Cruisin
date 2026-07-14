import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/constants/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account/', '/cart', '/checkout/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email']
    },
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
    host: SITE_CONFIG.url
  };
}
