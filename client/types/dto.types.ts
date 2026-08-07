// Governed by .rules v1.0
import type { Product } from './product.types';
import type { User } from './user.types';

export type UserDto = User;
export type ProductDto = Product;

export interface CategoryDto {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  path?: string;
  parent?: string | null;
  image: string;
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
  breadcrumb: Array<{ name: string; slug: string }>;
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
  isListingHeroMediaEnabled?: boolean;
  isStorefrontNavigationVisible: boolean;
  standardShippingRate: number;
  expressShippingRate: number;
  freeStandardShippingThreshold: number;
  standardShippingCompareAt: number;
  globalFilterSettings?: Record<string, unknown>;
}

export interface CartDto {
  id?: string;
  items: Array<{ product: ProductDto | string; variant: string; quantity: number; price: number }>;
}

export interface CouponDto {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'freeShipping';
  value: number;
  isActive: boolean;
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
  position?: string;
  content?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  products?: ProductDto[];
  categories?: CategoryDto[];
  isActive?: boolean;
  active?: boolean;
  hideOnDesktop?: boolean;
  hideOnMobile?: boolean;
  status?: CmsStatus;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
}

export type CmsSectionType = 'announcement_bar' | 'hero_campaign' | 'video_landing' | 'mobile_media_landing' | 'image_carousel' | 'product_carousel' | 'hot_drop' | 'trending_now' | 'discount_banner' | 'category_editorial_grid' | 'lookbook_story' | 'brand_story' | 'fullscreen_collection_landing' | 'popup_campaign' | 'newsletter' | 'social_proof' | 'marquee_strip' | 'shop_the_look' | 'featured_collection' | 'limited_drop_timer' | 'recently_viewed' | 'best_sellers';
export type CmsStatus = 'draft' | 'published' | 'archived';

export interface CmsPageDto {
  id?: string;
  _id?: string;
  slug: string;
  title: string;
  status: CmsStatus;
  seoTitle?: string;
  seoDescription?: string;
}

export interface CmsExperienceDto {
  page: CmsPageDto | null;
  sections: CmsSectionDto[];
  preview: boolean;
}

export interface AdminOverviewDto {
  revenue: number;
  orders: number;
  users: number;
  products: number;
  conversionRate: number;
}
