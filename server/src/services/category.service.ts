// Governed by .rules v1.0
import { CategoryModel } from '../models/category.model.js';
import { ApiError } from '../utils/api-error.js';
import { CatalogueHistoryService } from './catalogueHistory.service.js';

export type CategoryInput = Record<string, unknown>;
const markCatalogueStale = (): void => { CatalogueHistoryService.markStale().catch(() => undefined); };

const categoryId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) return String((value as { _id?: unknown })._id);
  return undefined;
};

const buildCategoryPath = async (input: CategoryInput, fallback?: { slug?: unknown; parent?: unknown }): Promise<{ path: string; breadcrumb: Array<{ name: string; slug: string }> }> => {
  const slug = String(input.slug ?? fallback?.slug ?? '').toLowerCase();
  const name = String(input.name ?? slug);
  const parent = input.parent !== undefined ? input.parent : fallback?.parent;
  const parentId = categoryId(parent);
  if (!parentId) return { path: slug, breadcrumb: [{ name, slug }] };
  const parentDoc = await CategoryModel.findById(parentId).lean();
  if (!parentDoc) throw new ApiError(400, 'Parent category not found');
  const parentPath = String(parentDoc.path ?? parentDoc.slug);
  const parentBreadcrumb = Array.isArray(parentDoc.breadcrumb) ? parentDoc.breadcrumb : [{ name: parentDoc.name, slug: parentDoc.slug }];
  return { path: parentPath + '/' + slug, breadcrumb: [...parentBreadcrumb, { name, slug }] };
};

export const CategoryService = {
  async list(): Promise<unknown[]> {
    return CategoryModel.find().sort({ parent: 1, sortOrder: 1, name: 1 }).lean();
  },

  async active(): Promise<unknown[]> {
    return CategoryModel.find({ isActive: true, isVisible: { $ne: false }, isPublished: { $ne: false } }).sort({ parent: 1, sortOrder: 1, name: 1 }).lean();
  },

  async byPath(path: string): Promise<unknown> {
    const normalizedPath = path.toLowerCase().replace(/^\/+|\/+$/g, '');
    const slugs = normalizedPath.split('/').filter(Boolean);
    const category = await CategoryModel.findOne({
      isActive: true,
      isVisible: { $ne: false },
      isPublished: { $ne: false },
      $or: [{ path: normalizedPath }, { slug: slugs.at(-1) ?? normalizedPath }]
    }).lean();
    if (!category) throw new ApiError(404, 'Category not found');
    return category;
  },

  async descendantIds(id: string): Promise<string[]> {
    const ids = [id];
    const children = await CategoryModel.find({ parent: id }).select('_id').lean();
    for (const child of children) {
      ids.push(...await this.descendantIds(String(child._id)));
    }
    return ids;
  },

  async create(input: CategoryInput): Promise<unknown> {
    const normalized = await buildCategoryPath(input);
    const category = await CategoryModel.create({ ...input, ...normalized });
    markCatalogueStale();
    return category;
  },

  async update(id: string, input: CategoryInput): Promise<unknown> {
    const existing = await CategoryModel.findById(id).lean();
    if (!existing) {
      throw new ApiError(404, 'Category not found');
    }
    const needsPathUpdate = input.slug !== undefined || input.name !== undefined || input.parent !== undefined;
    const normalized = needsPathUpdate ? await buildCategoryPath(input, existing) : {};
    const category = await CategoryModel.findByIdAndUpdate(id, { ...input, ...normalized }, { new: true, runValidators: true });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    markCatalogueStale();
    return category;
  },

  async remove(id: string): Promise<void> {
    const category = await CategoryModel.findByIdAndUpdate(id, { isActive: false });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    markCatalogueStale();
  },

  async reorder(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id, index) => CategoryModel.findByIdAndUpdate(id, { sortOrder: index })));
    markCatalogueStale();
  }
};
