// Governed by .rules v1.0
export interface ProductImage { url: string; alt: string; width: number; height: number; }
export interface ProductVariant { id: string; size: string; color: string; colorHex: string; sku: string; price: number; stock: number; images: ProductImage[]; }
export interface Review { id: string; rating: number; title: string; body: string; author: string; date: string; verified: boolean; }
export interface Product { id: string; title: string; slug: string; description: string; richDescription: string; brand: string; category: string; images: ProductImage[]; basePrice: number; comparePrice?: number; variants: ProductVariant[]; tags: string[]; isFeatured: boolean; ratings: { avg: number; count: number }; seo: { metaTitle: string; metaDesc: string; ogImage: string }; reviews: Review[]; }
export interface ProductFilters { category: string[]; size: string[]; color: string[]; price: [number, number]; sort: 'newest' | 'price-asc' | 'price-desc' | 'best-selling' | 'top-rated'; view: 'grid' | 'list'; }
