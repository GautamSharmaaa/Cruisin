// Governed by .rules v1.0
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProductPageClient } from '@/components/product/product-page-client';
import { PRODUCTS } from '@/constants/catalog';

export interface ProductPageProps { params: Promise<{ slug: string }>; }
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> { const { slug } = await params; const product = PRODUCTS.find((item) => item.slug === slug); return { title: product?.seo.metaTitle, description: product?.seo.metaDesc, openGraph: { images: product ? [product.seo.ogImage] : [] } }; }
export default async function ProductPage({ params }: ProductPageProps): Promise<ReactNode> { const { slug } = await params; const product = PRODUCTS.find((item) => item.slug === slug) ?? PRODUCTS[0]; return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: product.title, description: product.description, image: product.images.map((image) => image.url), brand: product.brand, offers: { '@type': 'Offer', price: product.basePrice, priceCurrency: 'INR', availability: 'https://schema.org/InStock' } }) }} /><ProductPageClient slug={slug} /></>; }
