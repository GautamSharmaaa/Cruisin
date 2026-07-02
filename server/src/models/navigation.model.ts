// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const menuLayoutTypes = ['text-columns', 'collection-grid', 'custom-link'] as const;
const menuLinkedTypes = ['category', 'subcategory', 'collection', 'product_listing', 'static_page', 'custom_url'] as const;

const navigationItemSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    href: { type: String, required: true, trim: true },
    type: { type: String, enum: ['simple_link', 'mega_menu', 'collection_link', 'category_link', 'custom_url'], default: 'mega_menu', index: true },
    menuLayoutType: { type: String, enum: menuLayoutTypes, default: 'text-columns', index: true },
    sortOrder: { type: Number, default: 0, index: true },
    isVisible: { type: Boolean, default: true, index: true },
    isMegaMenuEnabled: { type: Boolean, default: true, index: true },
    isDefaultActive: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const megaMenuColumnSchema = new Schema(
  {
    navItemId: { type: Schema.Types.ObjectId, ref: 'NavigationItem', required: true, index: true },
    title: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0, index: true },
    isVisible: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

const megaMenuLinkSchema = new Schema(
  {
    columnId: { type: Schema.Types.ObjectId, ref: 'MegaMenuColumn', required: true, index: true },
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
    linkedType: { type: String, enum: menuLinkedTypes, default: 'custom_url', index: true },
    linkedId: { type: Schema.Types.ObjectId, refPath: 'linkedModel', default: null },
    linkedModel: { type: String, enum: ['Category', 'Collection'], default: null },
    sortOrder: { type: Number, default: 0, index: true },
    isVisible: { type: Boolean, default: true, index: true },
    isHighlighted: { type: Boolean, default: false, index: true },
    showArrow: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const megaMenuCollectionCardSchema = new Schema(
  {
    navItemId: { type: Schema.Types.ObjectId, ref: 'NavigationItem', required: true, index: true },
    collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', default: null, index: true },
    titleOverride: { type: String, trim: true, default: '' },
    slugOverride: { type: String, trim: true, default: '' },
    imageOverride: { type: String, trim: true, default: '' },
    mobileImageOverride: { type: String, trim: true, default: '' },
    sortOrder: { type: Number, default: 0, index: true },
    isVisible: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

const megaMenuPromoSchema = new Schema(
  {
    navItemId: { type: Schema.Types.ObjectId, ref: 'NavigationItem', required: true, unique: true, index: true },
    eyebrow: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
    image: { type: String, trim: true, default: '' },
    mobileImage: { type: String, trim: true, default: '' },
    buttonLabel: { type: String, trim: true, default: '' },
    buttonHref: { type: String, trim: true, default: '' },
    overlayOpacity: { type: Number, min: 0, max: 0.9, default: 0.45 },
    showOnDesktop: { type: Boolean, default: true, index: true },
    showOnMobile: { type: Boolean, default: true, index: true },
    isVisible: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

navigationItemSchema.index({ isVisible: 1, sortOrder: 1 });
megaMenuColumnSchema.index({ navItemId: 1, isVisible: 1, sortOrder: 1 });
megaMenuLinkSchema.index({ columnId: 1, isVisible: 1, sortOrder: 1 });
megaMenuCollectionCardSchema.index({ navItemId: 1, isVisible: 1, sortOrder: 1 });
megaMenuPromoSchema.index({ navItemId: 1, isVisible: 1 });

export type NavigationItemDocument = InferSchemaType<typeof navigationItemSchema>;
export type MegaMenuColumnDocument = InferSchemaType<typeof megaMenuColumnSchema>;
export type MegaMenuLinkDocument = InferSchemaType<typeof megaMenuLinkSchema>;
export type MegaMenuCollectionCardDocument = InferSchemaType<typeof megaMenuCollectionCardSchema>;
export type MegaMenuPromoDocument = InferSchemaType<typeof megaMenuPromoSchema>;

export const NavigationItemModel = model('NavigationItem', navigationItemSchema);
export const MegaMenuColumnModel = model('MegaMenuColumn', megaMenuColumnSchema);
export const MegaMenuLinkModel = model('MegaMenuLink', megaMenuLinkSchema);
export const MegaMenuCollectionCardModel = model('MegaMenuCollectionCard', megaMenuCollectionCardSchema);
export const MegaMenuPromoModel = model('MegaMenuPromo', megaMenuPromoSchema);
