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
  enabled?: boolean;
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
  shortDescription?: string;
  richDescription: string;
  brand: string;
  category: string | { slug?: string; name?: string };
  categoryIds?: Array<string | { slug?: string; name?: string }>;
  collections?: Array<string | { slug?: string; title?: string }>;
  images: ApiProductImage[];
  hoverImage?: ApiProductImage | null;
  videoUrl?: string;
  mobileVideoUrl?: string;
  videoPosterImage?: string;
  imageAltText?: string;
  basePrice: number;
  comparePrice?: number;
  variants: ApiProductVariant[];
  tags: string[];
  gender?: 'men' | 'women' | 'unisex';
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'visible' | 'hidden';
  isActive?: boolean;
  isArchived?: boolean;
  isSale?: boolean;
  isFeatured: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isLatestDrop?: boolean;
  materialCare?: string;
  fitDetails?: string;
  shippingReturns?: string;
  sizeGuide?: string;
  productHighlights?: string[];
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
  enabled: variant.enabled !== false,
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
  shortDescription: product.shortDescription,
  richDescription: product.richDescription,
  brand: product.brand,
  category: typeof product.category === 'string' ? product.category : product.category.slug ?? product.category.name ?? '',
  categoryIds: (product.categoryIds ?? []).map((category) => typeof category === 'string' ? category : category.slug ?? category.name ?? '').filter(Boolean),
  collections: (product.collections ?? []).map((collection) => typeof collection === 'string' ? collection : collection.slug ?? collection.title ?? '').filter(Boolean),
  images: product.images.map(mapImage),
  hoverImage: product.hoverImage ? mapImage(product.hoverImage) : null,
  videoUrl: product.videoUrl,
  mobileVideoUrl: product.mobileVideoUrl,
  videoPosterImage: product.videoPosterImage,
  imageAltText: product.imageAltText,
  basePrice: product.basePrice,
  comparePrice: product.comparePrice,
  variants: product.variants.map(mapVariant),
  tags: product.tags,
  gender: product.gender,
  status: product.status,
  visibility: product.visibility,
  isActive: product.isActive,
  isArchived: product.isArchived,
  isSale: product.isSale,
  isFeatured: product.isFeatured,
  isBestseller: product.isBestseller,
  isNewArrival: product.isNewArrival,
  isLatestDrop: product.isLatestDrop,
  materialCare: product.materialCare,
  fitDetails: product.fitDetails,
  shippingReturns: product.shippingReturns,
  sizeGuide: product.sizeGuide,
  productHighlights: product.productHighlights,
  ratings: { avg: product.ratings?.avg ?? 0, count: product.ratings?.count ?? 0 },
  seo: {
    metaTitle: product.seo?.metaTitle ?? product.title,
    metaDesc: product.seo?.metaDesc ?? product.description,
    ogImage: product.seo?.ogImage ?? product.images[0]?.url ?? ''
  },
  reviews: (product.reviews ?? []).map(mapReview)
});
