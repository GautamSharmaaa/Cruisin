// Governed by .rules v1.0
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { BannerModel } from '../models/banner.model.js';
import { CMSMediaModel, CMSPageModel, CMSSectionModel, CMSVersionModel } from '../models/cms.model.js';
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

const scheduleQuery = (at: Date): Record<string, unknown> => ({
  $and: [
    { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: at } }] },
    { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: at } }] }
  ]
});

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
    const version = await CMSVersionModel.create({ pageId, sectionsSnapshot: sections, status: 'published', label: `Published ${new Date().toISOString()}`, createdBy: userId });
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
    const query: Record<string, unknown> = { pageId: page._id, status: isPreview ? { $ne: 'archived' } : 'published' };
    if (!isPreview || !options.includeInactive) query.active = true;
    if (!isPreview) Object.assign(query, scheduleQuery(at));
    const sections = await CMSSectionModel.find(query).sort(sectionSort).populate('products').populate('categories').lean();
    return { page, sections, preview: isPreview };
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
