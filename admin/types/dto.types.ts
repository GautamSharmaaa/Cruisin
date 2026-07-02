// Governed by .rules v1.0
export interface UserDto {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'superadmin' | 'manager' | 'viewer';
  isVerified: boolean;
  isActive: boolean;
}

export interface ProductDto {
  id: string;
  _id?: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  richDescription?: string;
  category?: string | CategoryDto;
  categoryIds?: Array<string | CategoryDto>;
  collections?: Array<string | CollectionDto>;
  collectionSlugs?: string[];
  images?: Array<{ url: string; alt: string; width: number; height: number }>;
  hoverImage?: { url: string; alt: string; width: number; height: number } | null;
  videoUrl?: string;
  mobileVideoUrl?: string;
  videoPosterImage?: string;
  imageAltText?: string;
  basePrice: number;
  comparePrice?: number;
  tags?: string[];
  productCode?: string;
  pickupAddress?: string;
  lowStockThreshold?: number;
  lifetimeSales?: number;
  variants?: Array<{ _id?: string; id?: string; sku: string; size: string; color: string; colorHex: string; price: number; priceOverride?: number; stock: number; enabled?: boolean; lowStockThreshold?: number; images?: Array<{ url: string; alt: string; width: number; height: number }> }>;
  gender?: 'men' | 'women' | 'unisex';
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'visible' | 'hidden';
  isSale?: boolean;
  isActive: boolean;
  isArchived?: boolean;
  isFeatured: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isLatestDrop?: boolean;
  materialCare?: string;
  fitDetails?: string;
  shippingReturns?: string;
  sizeGuide?: string;
  productHighlights?: string[];
  sortOrder?: number;
  ratings?: { avg: number; count: number };
  seo?: { metaTitle?: string; metaDesc?: string; ogImage?: string };
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryDto {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  path?: string;
  parent?: string | null;
  image?: string;
  description?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
  mobileHeroImage?: string;
  bannerImage?: string;
  mobileBannerImage?: string;
  thumbnailImage?: string;
  categoryCardImage?: string;
  categoryVideo?: string;
  mobileCategoryVideo?: string;
  backgroundVideo?: string;
  videoPosterImage?: string;
  imageAltText?: string;
  videoAutoplay?: boolean;
  videoMuted?: boolean;
  videoLoop?: boolean;
  isActive: boolean;
  isVisible?: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  showInHeader?: boolean;
  showInMenu?: boolean;
  showInFilters?: boolean;
  showOnHomepage?: boolean;
  showOnCollectionPages?: boolean;
  showInFooter?: boolean;
  sortOrder: number;
  bannerTitle?: string;
  bannerSubtitle?: string;
  defaultSort?: string;
  defaultGridView?: 1 | 2 | 4;
  areFiltersVisible?: boolean;
  isAdvancedFilterEnabled?: boolean;
  isFlashlightEnabled?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  canonicalSlug?: string;
  breadcrumb?: Array<{ name: string; slug: string }>;
  createdAt?: string;
}

export interface MegaMenuLinkDto {
  id?: string;
  _id?: string;
  columnId: string;
  label: string;
  href: string;
  linkedType: 'category' | 'subcategory' | 'collection' | 'product_listing' | 'static_page' | 'custom_url';
  linkedId?: string | null;
  sortOrder: number;
  isVisible: boolean;
  isHighlighted: boolean;
  showArrow?: boolean;
}

export interface MegaMenuColumnDto {
  id?: string;
  _id?: string;
  navItemId: string;
  title: string;
  sortOrder: number;
  isVisible: boolean;
  links: MegaMenuLinkDto[];
}

export interface NavigationItemDto {
  id?: string;
  _id?: string;
  label: string;
  slug: string;
  href: string;
  type: 'simple_link' | 'mega_menu' | 'collection_link' | 'category_link' | 'custom_url';
  menuLayoutType?: 'text-columns' | 'collection-grid' | 'custom-link';
  sortOrder: number;
  isVisible: boolean;
  isMegaMenuEnabled: boolean;
  isDefaultActive?: boolean;
  columns: MegaMenuColumnDto[];
  collectionCards?: MegaMenuCollectionCardDto[];
  promo?: MegaMenuPromoDto | null;
}

export interface CollectionDto {
  id?: string;
  _id?: string;
  title: string;
  slug: string;
  description?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
  mobileHeroImage?: string;
  cardImage?: string;
  thumbnailImage?: string;
  bannerImage?: string;
  mobileBannerImage?: string;
  mobileImage?: string;
  collectionVideo?: string;
  mobileCollectionVideo?: string;
  backgroundVideo?: string;
  videoPosterImage?: string;
  imageAltText?: string;
  isBannerVisible?: boolean;
  productIds?: Array<string | ProductDto>;
  categoryIds?: Array<string | CategoryDto>;
  tags?: string[];
  productSortOrder?: Record<string, unknown>;
  sortOrder: number;
  isVisible: boolean;
  isPublished?: boolean;
  isFeatured: boolean;
  showInMenu?: boolean;
  menuCardImage?: string;
  mobileMenuCardImage?: string;
  menuCardTitleOverride?: string;
  menuCardOrder?: number;
  defaultSort?: 'newest' | 'price-asc' | 'price-desc' | 'best-selling' | 'top-rated';
  defaultGridView?: 1 | 2 | 4;
  areFiltersVisible?: boolean;
  isAdvancedFilterEnabled?: boolean;
  isFlashlightEnabled?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
}

export interface MegaMenuCollectionCardDto {
  id?: string;
  _id?: string;
  navItemId: string;
  collectionId?: string | CollectionDto | null;
  titleOverride?: string;
  slugOverride?: string;
  imageOverride?: string;
  mobileImageOverride?: string;
  sortOrder: number;
  isVisible: boolean;
}

export interface MegaMenuPromoDto {
  id?: string;
  _id?: string;
  navItemId: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  mobileImage?: string;
  buttonLabel?: string;
  buttonHref?: string;
  overlayOpacity?: number;
  showOnDesktop?: boolean;
  showOnMobile?: boolean;
  isVisible: boolean;
}

export interface TagDto {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  isVisible: boolean;
  sortOrder: number;
}

export interface PageSettingsDto {
  id?: string;
  _id?: string;
  pageType: string;
  pageSlug: string;
  title: string;
  subtitle?: string;
  heroImage?: string;
  mobileHeroImage?: string;
  heroVideo?: string;
  mobileHeroVideo?: string;
  bannerImage?: string;
  mobileBannerImage?: string;
  bannerVideo?: string;
  mobileBannerVideo?: string;
  videoPosterImage?: string;
  ctaText?: string;
  ctaLink?: string;
  isBannerVisible?: boolean;
  defaultSort?: 'newest' | 'price-asc' | 'price-desc' | 'best-selling' | 'top-rated';
  defaultGridView?: 1 | 2 | 4;
  areFiltersVisible?: boolean;
  isAdvancedFilterEnabled?: boolean;
  isFlashlightEnabled?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  isPublished?: boolean;
  sectionVisibility?: Record<string, unknown>;
}

export interface SiteSettingsDto {
  id?: string;
  _id?: string;
  defaultGridView: 1 | 2 | 4;
  isFlashlightEnabled: boolean;
  isCollectionCarouselEnabled: boolean;
  isAdvancedFilterEnabled: boolean;
  isStorefrontNavigationVisible: boolean;
  globalFilterSettings?: Record<string, unknown>;
}

export interface CouponDto {
  id: string;
  _id?: string;
  code: string;
  type: 'percentage' | 'fixed' | 'freeShipping';
  value: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export interface OrderDto {
  id: string;
  _id?: string;
  user?: string;
  sessionId?: string;
  items?: Array<{ title: string; sku: string; quantity: number; price: number; image?: string }>;
  shippingAddress?: { fullName?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  billingAddress?: { fullName?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  paymentMethod?: 'razorpay' | 'stripe';
  paymentStatus: string;
  orderStatus: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total: number;
  createdAt?: string;
  trackingNumber?: string;
  timeline?: Array<{ status: string; timestamp: string; note?: string }>;
}

export interface CmsSectionDto {
  id: string;
  _id?: string;
  pageId?: string;
  pageTarget?: string;
  type?: CmsSectionType;
  title: string;
  subtitle?: string;
  description?: string;
  cta?: { text: string; link: string };
  image?: string;
  mobileImage?: string;
  position: string;
  content?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  products?: ProductDto[] | string[];
  categories?: CategoryDto[] | string[];
  isActive: boolean;
  active?: boolean;
  hideOnDesktop?: boolean;
  hideOnMobile?: boolean;
  status?: CmsStatus;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CmsSectionType = 'announcement_bar' | 'hero_campaign' | 'video_landing' | 'image_carousel' | 'product_carousel' | 'hot_drop' | 'trending_now' | 'discount_banner' | 'category_editorial_grid' | 'lookbook_story' | 'brand_story' | 'fullscreen_collection_landing' | 'popup_campaign' | 'newsletter' | 'social_proof' | 'marquee_strip' | 'shop_the_look' | 'featured_collection' | 'limited_drop_timer' | 'recently_viewed' | 'best_sellers';
export type CmsStatus = 'draft' | 'published' | 'archived';

export interface CmsPageDto {
  id?: string;
  _id?: string;
  slug: string;
  title: string;
  status: CmsStatus;
  seoTitle?: string;
  seoDescription?: string;
  publishedVersionId?: string;
  previewToken?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CmsVersionDto {
  id?: string;
  _id?: string;
  pageId: string;
  sectionsSnapshot: CmsSectionDto[];
  status: 'draft' | 'published' | 'restored';
  label?: string;
  createdAt?: string;
}

export interface CmsMediaDto {
  id?: string;
  _id?: string;
  url: string;
  type: 'image' | 'video';
  alt?: string;
  desktopUrl?: string;
  mobileUrl?: string;
  posterUrl?: string;
  cropFocus?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  lazy?: boolean;
}

export interface AdminOverviewDto {
  revenue: number;
  orders: number;
  users: number;
  products: number;
  conversionRate: number;
}

export interface AdminAnalyticsPointDto {
  day: string;
  revenue: number;
  orders: number;
}
