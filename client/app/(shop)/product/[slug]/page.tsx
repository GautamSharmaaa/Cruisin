// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductPageClient } from '@/components/product/product-page-client';
import { BRAND_CONFIG } from '@/constants/config';
import { serverApi } from '@/lib/server-api';
import type { ApiProduct } from '@/lib/product-mapper';
import type { ApiEnvelope } from '@/types/api.types';

export interface ProductPageProps { params: Promise<{ slug: string }>; }

const loadProduct = async (slug: string): Promise<ApiProduct | null> => {
  try {
    const response = await serverApi.get<ApiEnvelope<ApiProduct>>('/products/' + slug);
    return response.data.data;
  } catch {
    return null;
  }
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  return {
    title: product?.seo?.metaTitle ?? BRAND_CONFIG.name,
    description: product?.seo?.metaDesc ?? BRAND_CONFIG.tagline,
    openGraph: { images: product?.seo?.ogImage ? [product.seo.ogImage] : [] }
  };
}

export default async function ProductPage({ params }: ProductPageProps): Promise<ReactNode> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  const jsonLd = product ? { '@context': 'https://schema.org', '@type': 'Product', name: product.title, description: product.description, image: product.images.map((image) => image.url), brand: product.brand, offers: { '@type': 'Offer', price: product.basePrice, priceCurrency: BRAND_CONFIG.currency, availability: 'https://schema.org/InStock' } } : null;
  return <>{jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}<ProductPageClient slug={slug} /></>;
}
