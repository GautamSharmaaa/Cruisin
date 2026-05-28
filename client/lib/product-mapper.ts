// Governed by .rules v1.0
import type { Product, ProductImage, ProductVariant, Review } from '@/types/product.types';

interface ApiProductImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

interface ApiProductVariant {
  _id?: string;
  id?: string;
  size: string;
  color: string;
  colorHex: string;
  sku: string;
  price: number;
  stock: number;
  images?: ApiProductImage[];
}

interface ApiReview {
  _id?: string;
  id?: string;
  rating: number;
  title: string;
  body: string;
  author?: string;
  createdAt?: string;
  isVerifiedPurchase?: boolean;
}

export interface ApiProduct {
  _id?: string;
  id?: string;
  title: string;
  slug: string;
  description: string;
  richDescription: string;
  brand: string;
  category: string | { slug?: string; name?: string };
  images: ApiProductImage[];
  basePrice: number;
  comparePrice?: number;
  variants: ApiProductVariant[];
  tags: string[];
  isFeatured: boolean;
  ratings?: { avg?: number; count?: number };
  seo?: { metaTitle?: string; metaDesc?: string; ogImage?: string };
  reviews?: ApiReview[];
}

const mapImage = (image: ApiProductImage): ProductImage => ({
  url: image.url,
  alt: image.alt,
  width: image.width,
  height: image.height
});

const mapVariant = (variant: ApiProductVariant): ProductVariant => ({
  id: variant.id ?? variant._id ?? variant.sku,
  size: variant.size,
  color: variant.color,
  colorHex: variant.colorHex,
  sku: variant.sku,
  price: variant.price,
  stock: variant.stock,
  images: (variant.images ?? []).map(mapImage)
});

const mapReview = (review: ApiReview): Review => ({
  id: review.id ?? review._id ?? review.title,
  rating: review.rating,
  title: review.title,
  body: review.body,
  author: review.author ?? 'Cruisin customer',
  date: review.createdAt ?? '',
  verified: Boolean(review.isVerifiedPurchase)
});

export const mapProduct = (product: ApiProduct): Product => ({
  id: product.id ?? product._id ?? product.slug,
  title: product.title,
  slug: product.slug,
  description: product.description,
  richDescription: product.richDescription,
  brand: product.brand,
  category: typeof product.category === 'string' ? product.category : product.category.slug ?? product.category.name ?? '',
  images: product.images.map(mapImage),
  basePrice: product.basePrice,
  comparePrice: product.comparePrice,
  variants: product.variants.map(mapVariant),
  tags: product.tags,
  isFeatured: product.isFeatured,
  ratings: { avg: product.ratings?.avg ?? 0, count: product.ratings?.count ?? 0 },
  seo: {
    metaTitle: product.seo?.metaTitle ?? product.title,
    metaDesc: product.seo?.metaDesc ?? product.description,
    ogImage: product.seo?.ogImage ?? product.images[0]?.url ?? ''
  },
  reviews: (product.reviews ?? []).map(mapReview)
});
