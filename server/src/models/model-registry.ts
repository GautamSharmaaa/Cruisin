// Governed by .rules v1.0
import { AddressModel } from './address.model.js';
import { AuthProviderModel } from './auth-provider.model.js';
import { BannerModel } from './banner.model.js';
import { CartModel } from './cart.model.js';
import { CatalogueExportModel } from './catalogue-export.model.js';
import { CatalogueImportModel } from './catalogue-import.model.js';
import { CatalogueSettingsModel } from './catalogue-settings.model.js';
import { CategoryModel } from './category.model.js';
import { CMSMediaModel, CMSPageModel, CMSSectionModel, CMSVersionModel } from './cms.model.js';
import { CollectionModel } from './collection.model.js';
import { CouponModel } from './coupon.model.js';
import { InventoryModel } from './inventory.model.js';
import {
  MegaMenuCollectionCardModel,
  MegaMenuColumnModel,
  MegaMenuLinkModel,
  MegaMenuPromoModel,
  NavigationItemModel
} from './navigation.model.js';
import { NewsletterSubscriberModel } from './newsletter-subscriber.model.js';
import { NotificationModel } from './notification.model.js';
import { OrderModel } from './order.model.js';
import { OtpModel } from './otp.model.js';
import { PageSettingsModel } from './page-settings.model.js';
import { PaymentWebhookEventModel } from './payment-webhook-event.model.js';
import { ProductModel } from './product.model.js';
import { ReviewModel } from './review.model.js';
import { SecurityEventModel } from './security-event.model.js';
import { SiteSettingsModel } from './site-settings.model.js';
import { TagModel } from './tag.model.js';
import { UserPreferenceModel } from './user-preference.model.js';
import { UserSessionModel } from './user-session.model.js';
import { UserModel } from './user.model.js';
import { WishlistModel } from './wishlist.model.js';

export const applicationModels = [
  AddressModel,
  AuthProviderModel,
  BannerModel,
  CartModel,
  CatalogueExportModel,
  CatalogueImportModel,
  CatalogueSettingsModel,
  CategoryModel,
  CMSMediaModel,
  CMSPageModel,
  CMSSectionModel,
  CMSVersionModel,
  CollectionModel,
  CouponModel,
  InventoryModel,
  MegaMenuCollectionCardModel,
  MegaMenuColumnModel,
  MegaMenuLinkModel,
  MegaMenuPromoModel,
  NavigationItemModel,
  NewsletterSubscriberModel,
  NotificationModel,
  OrderModel,
  OtpModel,
  PageSettingsModel,
  PaymentWebhookEventModel,
  ProductModel,
  ReviewModel,
  SecurityEventModel,
  SiteSettingsModel,
  TagModel,
  UserPreferenceModel,
  UserSessionModel,
  UserModel,
  WishlistModel
] as const;
