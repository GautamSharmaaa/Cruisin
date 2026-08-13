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
import { ExchangeRequestModel } from './exchange-request.model.js';
import { LogisticsAuditModel } from './logistics-audit.model.js';
import { LogisticsJobModel } from './logistics-job.model.js';
import { LogisticsNotificationEventModel } from './logistics-notification-event.model.js';
import { LogisticsQuoteModel } from './logistics-quote.model.js';
import { LogisticsWebhookEventModel } from './logistics-webhook-event.model.js';
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
import { OrderDeleteTombstoneModel } from './order-delete-tombstone.model.js';
import { OtpModel } from './otp.model.js';
import { PageSettingsModel } from './page-settings.model.js';
import { PaymentWebhookEventModel } from './payment-webhook-event.model.js';
import { PackagePresetModel } from './package-preset.model.js';
import { ProductModel } from './product.model.js';
import { ReturnRequestModel } from './return-request.model.js';
import { ReviewModel } from './review.model.js';
import { SecurityEventModel } from './security-event.model.js';
import { SiteSettingsModel } from './site-settings.model.js';
import { ShipmentModel } from './shipment.model.js';
import { TagModel } from './tag.model.js';
import { UserPreferenceModel } from './user-preference.model.js';
import { UserSessionModel } from './user-session.model.js';
import { UserModel } from './user.model.js';
import { WishlistModel } from './wishlist.model.js';
import { WalletModel } from './wallet.model.js';

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
  ExchangeRequestModel,
  InventoryModel,
  LogisticsAuditModel,
  LogisticsJobModel,
  LogisticsNotificationEventModel,
  LogisticsQuoteModel,
  LogisticsWebhookEventModel,
  MegaMenuCollectionCardModel,
  MegaMenuColumnModel,
  MegaMenuLinkModel,
  MegaMenuPromoModel,
  NavigationItemModel,
  NewsletterSubscriberModel,
  NotificationModel,
  OrderModel,
  OrderDeleteTombstoneModel,
  OtpModel,
  PackagePresetModel,
  PageSettingsModel,
  PaymentWebhookEventModel,
  ProductModel,
  ReturnRequestModel,
  ReviewModel,
  SecurityEventModel,
  SiteSettingsModel,
  ShipmentModel,
  TagModel,
  UserPreferenceModel,
  UserSessionModel,
  UserModel,
  WalletModel,
  WishlistModel
] as const;
