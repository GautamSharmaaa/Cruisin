// Governed by .rules v1.0
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { BannerModel } from '../models/banner.model.js';
import { CategoryModel } from '../models/category.model.js';
import { CMSMediaModel, CMSPageModel, CMSSectionModel, CMSVersionModel } from '../models/cms.model.js';
import { ProductModel } from '../models/product.model.js';
import { ApiError } from '../utils/api-error.js';

export interface CmsPageInput {
  slug: string;
  title: string;
  status?: 'draft' | 'published' | 'archived';
  seoTitle?: string;
  seoDescription?: string;
}

export type CmsSectionInput = Record<string, unknown>;

export interface PublicPageOptions {
  previewToken?: string;
  includeInactive?: boolean;
  scheduledAt?: Date;
}

const sectionSort = { sortOrder: 1, createdAt: 1 } as const;
const publicCmsProductQuery = { isActive: true, isArchived: { $ne: true }, status: 'published', visibility: 'visible' } as const;
const publicCmsProductProjection = '-costPrice -rawCatalogueAttributes -catalogueSource -lastCatalogueImportId -categoryMappingRaw -collectionMappingRaw';

const scheduleQuery = (at: Date): Record<string, unknown> => ({
  $and: [
    { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: at } }] },
    { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: at } }] }
  ]
});

const dateValue = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sectionIsLiveFromSnapshot = (section: Record<string, unknown>, at: Date): boolean => {
  if (section.status !== 'published') return false;
  if (section.active !== true) return false;
  const starts = dateValue(section.startDate);
  const ends = dateValue(section.endDate);
  return (!starts || starts <= at) && (!ends || ends >= at);
};

const refIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (item instanceof Types.ObjectId) return item.toString();
    if (item && typeof item === 'object' && '_id' in item) return String((item as { _id: unknown })._id);
    if (item && typeof item === 'object' && 'id' in item) return String((item as { id: unknown }).id);
    return '';
  }).filter((id) => Types.ObjectId.isValid(id));
};

const contentProductIds = (section: Record<string, unknown>): string[] => {
  const content = section.content;
  if (!content || typeof content !== 'object' || !('productIds' in content)) return [];
  const value = (content as { productIds?: unknown }).productIds;
  if (Array.isArray(value)) return refIds(value);
  if (typeof value !== 'string') return [];
  return value.split(',').map((id) => id.trim()).filter((id) => Types.ObjectId.isValid(id));
};

const hydrateSnapshotSections = async (sections: Record<string, unknown>[]): Promise<Record<string, unknown>[]> => {
  const productIds = [...new Set(sections.flatMap((section) => [...refIds(section.products), ...contentProductIds(section)]))];
  const categoryIds = [...new Set(sections.flatMap((section) => refIds(section.categories)))];
  const [products, categories] = await Promise.all([
    productIds.length ? ProductModel.find({ _id: { $in: productIds }, ...publicCmsProductQuery }).select(publicCmsProductProjection).lean() : [],
    categoryIds.length ? CategoryModel.find({ _id: { $in: categoryIds } }).lean() : []
  ]);
  const productById = new Map(products.map((product) => [String(product._id), product]));
  const categoryById = new Map(categories.map((category) => [String(category._id), category]));
  return sections.map((section) => {
    const sectionProductIds = refIds(section.products);
    const productsForSection = (sectionProductIds.length ? sectionProductIds : contentProductIds(section)).flatMap((id) => {
      const product = productById.get(id);
      return product ? [product] : [];
    });
    const categoriesForSection = refIds(section.categories).flatMap((id) => {
      const category = categoryById.get(id);
      return category ? [category] : [];
    });
    return { ...section, products: productsForSection, categories: categoriesForSection };
  });
};

const sourceValue = (section: Record<string, unknown>): string => {
  const content = section.content;
  if (!content || typeof content !== 'object' || !('source' in content)) return '';
  return String((content as { source?: unknown }).source ?? '').toLowerCase();
};

const limitValue = (section: Record<string, unknown>): number => {
  const content = section.content;
  if (!content || typeof content !== 'object' || !('limit' in content)) return 4;
  const limit = Number((content as { limit?: unknown }).limit);
  return Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 12) : 4;
};

const fallbackProductsForSection = async (section: Record<string, unknown>): Promise<Record<string, unknown>[]> => {
  const source = sourceValue(section);
  const limit = limitValue(section);
  const type = String(section.type ?? '');
  const match: Record<string, unknown> = { ...publicCmsProductQuery };
  const sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (source.includes('best') || type === 'best_sellers') {
    match.$or = [{ isBestseller: true }, { lifetimeSales: { $gt: 0 } }, { isFeatured: true }];
    Object.assign(sort, { isBestseller: -1, lifetimeSales: -1 });
  } else if (source.includes('sale')) {
    match.isSale = true;
  } else if (source.includes('new') || source.includes('drop')) {
    match.$or = [{ isNewArrival: true }, { isLatestDrop: true }, { isFeatured: true }];
    Object.assign(sort, { isNewArrival: -1, isLatestDrop: -1 });
  }
  let products = await ProductModel.find(match).select(publicCmsProductProjection).sort(sort).limit(limit).lean();
  if (products.length < limit) {
    const selectedIds = products.map((product) => product._id);
    const fillers = await ProductModel.find({ ...publicCmsProductQuery, _id: { $nin: selectedIds } }).select(publicCmsProductProjection).sort({ createdAt: -1 }).limit(limit - products.length).lean();
    products = [...products, ...fillers];
  }
  return products;
};

const hydrateEmptyProductRails = async (sections: Record<string, unknown>[]): Promise<Record<string, unknown>[]> => {
  return Promise.all(sections.map(async (section) => {
    const type = String(section.type ?? '');
    if (!['product_carousel', 'trending_now', 'hot_drop', 'featured_collection', 'recently_viewed', 'best_sellers'].includes(type)) return section;
    if (Array.isArray(section.products) && section.products.length > 0) return section;
    return { ...section, products: await fallbackProductsForSection(section) };
  }));
};

const sanitizePublicPage = (page: Record<string, unknown>): Record<string, unknown> => {
  const { __v, previewToken, publishedVersionId, createdAt, updatedAt, ...safePage } = page;
  void __v; void previewToken; void publishedVersionId; void createdAt; void updatedAt;
  return safePage;
};

const sanitizePublicSection = (section: Record<string, unknown>): Record<string, unknown> => {
  const { __v, pageId, createdAt, updatedAt, ...safeSection } = section;
  void __v; void pageId; void createdAt; void updatedAt;
  return safeSection;
};

const loadPublishedSections = async (pageId: unknown, at: Date): Promise<Record<string, unknown>[]> => {
  return CMSSectionModel.find({ pageId, status: 'published', active: true, ...scheduleQuery(at) }).sort(sectionSort).populate({ path: 'products', match: publicCmsProductQuery, select: publicCmsProductProjection }).populate('categories').lean();
};

const stripSectionForRestore = (section: Record<string, unknown>, pageId: Types.ObjectId, index: number): Record<string, unknown> => {
  const { _id, id, createdAt, updatedAt, __v, ...rest } = section;
  void _id; void id; void createdAt; void updatedAt; void __v;
  return { ...rest, pageId, sortOrder: index, status: 'draft' };
};

export const CmsService = {
  async ensureHomePage(): Promise<unknown> {
    return CMSPageModel.findOneAndUpdate(
      { slug: 'home' },
      { $setOnInsert: { slug: 'home', title: 'Homepage', status: 'draft', previewToken: randomUUID(), seoTitle: 'Cruisin', seoDescription: 'Luxury streetwear campaign homepage.' } },
      { upsert: true, new: true }
    ).lean();
  },

  async listPages(): Promise<unknown[]> {
    await this.ensureHomePage();
    return CMSPageModel.find({ status: { $ne: 'archived' } }).sort({ updatedAt: -1 }).lean();
  },

  async pageBySlug(slug: string): Promise<unknown> {
    const page = await CMSPageModel.findOne({ slug }).lean();
    if (!page) throw new ApiError(404, 'CMS page not found');
    return page;
  },

  async createPage(input: CmsPageInput): Promise<unknown> {
    return CMSPageModel.create({ ...input, previewToken: randomUUID() });
  },

  async listSections(pageId: string): Promise<unknown[]> {
    return CMSSectionModel.find({ pageId, status: { $ne: 'archived' } }).sort(sectionSort).lean();
  },

  async createSection(pageId: string, input: CmsSectionInput): Promise<unknown> {
    const count = await CMSSectionModel.countDocuments({ pageId, status: { $ne: 'archived' } });
    return CMSSectionModel.create({ ...input, pageId, sortOrder: input.sortOrder ?? count, pageTarget: input.pageTarget ?? 'home' });
  },

  async updateSection(id: string, input: CmsSectionInput): Promise<unknown> {
    const section = await CMSSectionModel.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean();
    if (!section) throw new ApiError(404, 'CMS section not found');
    return section;
  },

  async archiveSection(id: string): Promise<void> {
    const section = await CMSSectionModel.findByIdAndUpdate(id, { status: 'archived', active: false });
    if (!section) throw new ApiError(404, 'CMS section not found');
  },

  async reorderSections(pageId: string, ids: string[]): Promise<void> {
    const existing = await CMSSectionModel.find({ pageId, _id: { $in: ids } }).select('_id').lean();
    if (existing.length !== ids.length) throw new ApiError(400, 'Section order contains unknown sections');
    await Promise.all(ids.map((id, index) => CMSSectionModel.findByIdAndUpdate(id, { sortOrder: index })));
  },

  async publishPage(pageId: string, userId?: string): Promise<unknown> {
    const page = await CMSPageModel.findById(pageId);
    if (!page) throw new ApiError(404, 'CMS page not found');
    const sections = await CMSSectionModel.find({ pageId, status: { $ne: 'archived' } }).sort(sectionSort).lean();
    const publishedSections = sections.map((section) => ({ ...section, status: 'published' }));
    const version = await CMSVersionModel.create({
      pageId,
      sectionsSnapshot: publishedSections.filter((section) => section.active === true),
      status: 'published',
      label: `Published ${new Date().toISOString()}`,
      createdBy: userId
    });
    await CMSPageModel.findByIdAndUpdate(pageId, { status: 'published', publishedVersionId: version._id });
    await CMSSectionModel.updateMany({ pageId, status: { $ne: 'archived' } }, { status: 'published' });
    return version.toObject();
  },

  async listVersions(pageId: string): Promise<unknown[]> {
    return CMSVersionModel.find({ pageId }).sort({ createdAt: -1 }).limit(20).lean();
  },

  async restoreVersion(pageId: string, versionId: string): Promise<unknown[]> {
    const version = await CMSVersionModel.findOne({ _id: versionId, pageId }).lean();
    if (!version) throw new ApiError(404, 'CMS version not found');
    await CMSSectionModel.updateMany({ pageId, status: { $ne: 'archived' } }, { status: 'archived', active: false });
    const restored = await CMSSectionModel.insertMany((version.sectionsSnapshot as Record<string, unknown>[]).map((section, index) => stripSectionForRestore(section, new Types.ObjectId(pageId), index)));
    const restoredObjects = restored.map((section) => JSON.parse(JSON.stringify(section)) as Record<string, unknown>);
    await CMSVersionModel.create({ pageId, sectionsSnapshot: restoredObjects, status: 'restored', label: `Restored ${new Date().toISOString()}` });
    return restoredObjects;
  },

  async publicPage(slug: string, options: PublicPageOptions = {}): Promise<unknown> {
    const page = await CMSPageModel.findOne({ slug, status: { $ne: 'archived' } }).lean();
    if (!page) throw new ApiError(404, 'CMS page not found');
    const isPreview = Boolean(options.previewToken && options.previewToken === page.previewToken);
    const at = options.scheduledAt ?? new Date();
    if (!isPreview && page.publishedVersionId) {
      const version = await CMSVersionModel.findById(page.publishedVersionId).lean();
      if (version) {
        const sections = await hydrateEmptyProductRails(await hydrateSnapshotSections((version.sectionsSnapshot as Record<string, unknown>[]).filter((section) => sectionIsLiveFromSnapshot(section, at))));
        if (sections.length > 0) return { page: sanitizePublicPage(page), sections: sections.map(sanitizePublicSection), preview: false };
      }
    }
    if (!isPreview) {
      const sections = await hydrateEmptyProductRails(await loadPublishedSections(page._id, at));
      if (sections.length > 0) return { page: sanitizePublicPage(page), sections: sections.map(sanitizePublicSection), preview: false };
    }
    const query: Record<string, unknown> = { pageId: page._id, status: isPreview ? { $ne: 'archived' } : 'published' };
    if (!isPreview || !options.includeInactive) query.active = true;
    if (!isPreview) Object.assign(query, scheduleQuery(at));
    const sections = await hydrateEmptyProductRails(await CMSSectionModel.find(query).sort(sectionSort).populate('products').populate('categories').lean());
    return { page: sanitizePublicPage(page), sections: sections.map(sanitizePublicSection), preview: isPreview };
  },

  async activeHome(): Promise<unknown> {
    try {
      return await this.publicPage('home');
    } catch (_error: unknown) {
      const now = new Date();
      const banners = await BannerModel.find({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }).sort({ sortOrder: 1 }).lean();
      return { page: null, sections: banners, preview: false };
    }
  },

  async listMedia(): Promise<unknown[]> {
    return CMSMediaModel.find().sort({ createdAt: -1 }).lean();
  },

  async createMedia(input: Record<string, unknown>): Promise<unknown> {
    return CMSMediaModel.create(input);
  },

  async listBanners(): Promise<unknown[]> { return BannerModel.find().sort({ sortOrder: 1, createdAt: -1 }).lean(); },
  async upsertBanner(input: Record<string, unknown>): Promise<unknown> { return BannerModel.create(input); },
  async reorder(ids: string[]): Promise<void> { await Promise.all(ids.map((id, index) => BannerModel.findByIdAndUpdate(id, { sortOrder: index }))); }
};
