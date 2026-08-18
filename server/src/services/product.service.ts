import { CategoryModel } from '../models/category.model.js';
import { CollectionModel } from '../models/collection.model.js';
import { ProductModel } from '../models/product.model.js';
import { ApiError } from '../utils/api-error.js';
import type { PaginatedResult } from '../types/api.types.js';
import { CatalogueHistoryService } from './catalogueHistory.service.js';

export interface ProductFilters {
  q?: string;
  category?: string;
  subcategory?: string;
  collection?: string;
  tags?: string | string[];
  gender?: 'men' | 'women' | 'unisex';
  sale?: boolean;
  featured?: boolean;
  bestseller?: boolean;
  latestDrop?: boolean;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  priceMin?: number;
  priceMax?: number;
  availability: 'all' | 'in-stock' | 'out-of-stock';
  sort: 'newest' | 'price-asc' | 'price-desc' | 'best-selling' | 'top-rated';
  page: number;
  limit: number;
}
export interface AdminProductFilters {
  q?: string;
  category?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  limit: number;
  status?: 'all' | 'visible' | 'hidden' | 'draft' | 'archived';
  stock?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  featured?: 'all' | 'yes' | 'no';
  bestseller?: 'all' | 'yes' | 'no';
  newArrival?: 'all' | 'yes' | 'no';
  needsFix?: 'all' | 'yes';
  createdFrom?: string;
  updatedFrom?: string;
  pickupAddress?: string;
  sort: 'updated' | 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'sales-desc' | 'title-asc';
}
export type ProductInput = Record<string, unknown>;
const markCatalogueStale = (): void => { CatalogueHistoryService.markStale().catch(() => undefined); };
const sortMap = { newest: { sortOrder: 1, createdAt: -1 }, 'price-asc': { basePrice: 1 }, 'price-desc': { basePrice: -1 }, 'best-selling': { lifetimeSales: -1, createdAt: -1 }, 'top-rated': { 'ratings.avg': -1 } } as const;
const adminSortMap = { updated: { updatedAt: -1 }, newest: { createdAt: -1 }, oldest: { createdAt: 1 }, 'price-asc': { basePrice: 1 }, 'price-desc': { basePrice: -1 }, 'sales-desc': { lifetimeSales: -1 }, 'title-asc': { title: 1 } } as const;
type AdminDirectSort = keyof typeof adminSortMap;
const publicProductQuery = { isActive: true, isArchived: { $ne: true }, visibility: 'visible', status: 'published' } as const;
const publicProductProjection = '-costPrice -costBreakdown -rawCatalogueAttributes -catalogueSource -lastCatalogueImportId -categoryMappingRaw -collectionMappingRaw';

const categoryFromFilter = async (category?: string, publicOnly = false): Promise<{ _id: unknown } | null | undefined> => {
  if (!category) return undefined;
  const normalized = category.toLowerCase().replace(/^\/+|\/+$/g, '');
  const lastSlug = normalized.split('/').filter(Boolean).at(-1) ?? normalized;
  const categoryQuery = {
    ...(publicOnly ? { isActive: true, isVisible: { $ne: false }, isPublished: { $ne: false } } : {}),
    ...(category.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ slug: category }, { _id: category }] } : { $or: [{ path: normalized }, { slug: lastSlug }] })
  };
  const categoryDoc = await CategoryModel.findOne(categoryQuery).select('_id');
  return categoryDoc ? { _id: categoryDoc._id } : null;
};

const descendantIds = async (id: unknown): Promise<unknown[]> => {
  const ids: unknown[] = [id];
  const children = await CategoryModel.find({ parent: id }).select('_id').lean();
  for (const child of children) {
    ids.push(...await descendantIds(child._id));
  }
  return ids;
};

const collectionFromFilter = async (collection?: string, publicOnly = false): Promise<{ _id: unknown; slug?: string; productIds?: unknown[] } | null | undefined> => {
  if (!collection) return undefined;
  const query = {
    ...(publicOnly ? { isVisible: true, isPublished: { $ne: false } } : {}),
    ...(collection.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ slug: collection }, { _id: collection }] } : { slug: collection.toLowerCase() })
  };
  const collectionDoc = await CollectionModel.findOne(query).select('_id slug productIds').lean();
  return collectionDoc ? { _id: collectionDoc._id, slug: collectionDoc.slug, productIds: collectionDoc.productIds as unknown[] | undefined } : null;
};

const tagList = (tags?: string | string[]): string[] => {
  if (!tags) return [];
  const values = Array.isArray(tags) ? tags : tags.split(',');
  return values.map((tag) => tag.trim()).filter(Boolean);
};

const tagMatchers = (tags: string[]): RegExp[] => {
  const values = tags.flatMap((tag) => [tag, tag.replace(/[-_]+/g, ' ')]);
  return Array.from(new Set(values.map((tag) => tag.trim()).filter(Boolean))).map(exactCaseInsensitive);
};

const isTrue = (value: unknown): boolean => value === true || value === 'true';
const exactCaseInsensitive = (value: string): RegExp => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
const totalStock = (product: { variants?: Array<{ stock?: number }> }): number => (product.variants ?? []).reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
const sanitizePublicProduct = <TProduct>(product: TProduct): TProduct => {
  if (!product || typeof product !== 'object') return product;
  const record = product as Record<string, unknown>;
  if (!Array.isArray(record.variants)) return product;
  return { ...record, variants: record.variants.filter((variant) => !variant || typeof variant !== 'object' || (variant as { enabled?: boolean }).enabled !== false) } as TProduct;
};
const hasHealthIssues = (product: Record<string, unknown>): boolean => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const images = Array.isArray(product.images) ? product.images : [];
  const seo = product.seo && typeof product.seo === 'object' ? product.seo as Record<string, unknown> : {};
  return images.length === 0 || !product.title || !product.description || !product.category || !product.basePrice || variants.length === 0 || totalStock(product as { variants?: Array<{ stock?: number }> }) === 0 || !product.slug || !seo.metaTitle || !seo.metaDesc;
};
const numberField = (record: ProductInput, key: 'basePrice' | 'comparePrice'): number | undefined => typeof record[key] === 'number' ? record[key] : undefined;
const assertPriceRelationship = (basePrice: number | undefined, comparePrice: number | undefined): void => {
  if (basePrice !== undefined && comparePrice !== undefined && comparePrice > 0 && comparePrice <= basePrice) throw new ApiError(400, 'MRP must be greater than the selling price');
};

export const ProductService = {
  async list(filters: ProductFilters): Promise<PaginatedResult<unknown>> {
    const query: Record<string, unknown> = { ...publicProductQuery };
    const and: Record<string, unknown>[] = [];
    if (filters.q?.trim()) {
      const expression = new RegExp(filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      and.push({ $or: [{ title: expression }, { slug: expression }, { productCode: expression }, { 'variants.sku': expression }] });
    }
    const categoryFilter = filters.subcategory ?? filters.category;
    if (categoryFilter) {
      const categoryDoc = await categoryFromFilter(categoryFilter, true);
      if (!categoryDoc) return { items: [], total: 0, page: filters.page, pages: 0 };
      const ids = await descendantIds(categoryDoc._id);
      and.push({ $or: [{ category: { $in: ids } }, { categoryIds: { $in: ids } }] });
    }
    if (filters.collection) {
      const collection = await collectionFromFilter(filters.collection, true);
      if (!collection) return { items: [], total: 0, page: filters.page, pages: 0 };
      and.push({ $or: [{ collections: collection._id }, { collectionSlugs: collection.slug }, { _id: { $in: collection.productIds ?? [] } }] });
    }
    const tags = tagList(filters.tags);
    if (tags.length > 0) query.tags = { $in: tagMatchers(tags) };
    if (filters.gender) query.gender = filters.gender === 'unisex' ? 'unisex' : { $in: [filters.gender, 'unisex'] };
    if (isTrue(filters.sale)) and.push({ $or: [{ isSale: true }, { comparePrice: { $gt: 0 } }] });
    if (isTrue(filters.featured)) query.isFeatured = true;
    if (isTrue(filters.bestseller)) query.isBestseller = true;
    if (isTrue(filters.latestDrop)) query.isLatestDrop = true;
    const variantQuery: Record<string, unknown> = { enabled: { $ne: false } };
    if (filters.size) variantQuery.size = exactCaseInsensitive(filters.size);
    if (filters.color) variantQuery.color = exactCaseInsensitive(filters.color);
    if (filters.availability === 'in-stock') variantQuery.stock = { $gt: 0 };
    if (filters.availability === 'out-of-stock' && (filters.size || filters.color)) variantQuery.stock = { $lte: 0 };
    query.variants = { $elemMatch: variantQuery };
    const minPrice = filters.priceMin ?? filters.minPrice;
    const maxPrice = filters.priceMax ?? filters.maxPrice;
    if (minPrice !== undefined || maxPrice !== undefined) query.basePrice = { ...(minPrice !== undefined ? { $gte: minPrice } : {}), ...(maxPrice !== undefined ? { $lte: maxPrice } : {}) };
    if (filters.availability === 'out-of-stock' && !filters.size && !filters.color) and.push({ variants: { $not: { $elemMatch: { enabled: { $ne: false }, stock: { $gt: 0 } } } } });
    if (and.length > 0) query.$and = and;
    const skip = (filters.page - 1) * filters.limit;
      const [items, total] = await Promise.all([ProductModel.find(query).select(publicProductProjection).populate('category').populate('categoryIds').populate('collections').sort(sortMap[filters.sort]).skip(skip).limit(filters.limit).lean(), ProductModel.countDocuments(query)]);
      return { items: items.map(sanitizePublicProduct), total, page: filters.page, pages: Math.ceil(total / filters.limit) };
  },
  async adminList(filters: AdminProductFilters): Promise<PaginatedResult<unknown>> {
    const query: Record<string, unknown> = {};
    if (filters.status === 'visible') query.isActive = true;
    if (filters.status === 'hidden' || filters.status === 'draft') query.isActive = false;
    if (filters.status === 'archived') query.isArchived = true;
    if (filters.status !== 'archived') query.isArchived = { $ne: true };
    if (filters.q) {
      const expression = new RegExp(filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: expression }, { slug: expression }, { productCode: expression }, { 'variants.sku': expression }];
    }
    if (filters.category) {
      const categoryDoc = await categoryFromFilter(filters.category);
      if (!categoryDoc) return { items: [], total: 0, page: filters.page, pages: 0 };
      query.$or = [{ category: categoryDoc._id }, { categoryIds: categoryDoc._id }];
    }
    if (filters.size) query['variants.size'] = filters.size;
    if (filters.color) query['variants.color'] = filters.color;
    if (filters.pickupAddress) query.pickupAddress = new RegExp(filters.pickupAddress.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (filters.featured === 'yes') query.isFeatured = true;
    if (filters.featured === 'no') query.isFeatured = false;
    if (filters.bestseller === 'yes') query.isBestseller = true;
    if (filters.bestseller === 'no') query.isBestseller = false;
    if (filters.newArrival === 'yes') query.isNewArrival = true;
    if (filters.newArrival === 'no') query.isNewArrival = false;
    if (filters.createdFrom) query.createdAt = { $gte: new Date(filters.createdFrom) };
    if (filters.updatedFrom) query.updatedAt = { $gte: new Date(filters.updatedFrom) };
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) query.basePrice = { ...(filters.minPrice !== undefined ? { $gte: filters.minPrice } : {}), ...(filters.maxPrice !== undefined ? { $lte: filters.maxPrice } : {}) };

    const requiresDerivedFilter = filters.stock !== 'all' || filters.needsFix === 'yes' || filters.sort === 'stock-asc' || filters.sort === 'stock-desc';
    if (!requiresDerivedFilter) {
      const skip = (filters.page - 1) * filters.limit;
      const directSort = filters.sort as AdminDirectSort;
      const [items, total] = await Promise.all([ProductModel.find(query).populate('category').populate('categoryIds').populate('collections').sort(adminSortMap[directSort]).skip(skip).limit(filters.limit).lean(), ProductModel.countDocuments(query)]);
      return { items, total, page: filters.page, pages: Math.ceil(total / filters.limit) };
    }

    const allItems = await ProductModel.find(query).populate('category').populate('categoryIds').populate('collections').sort(adminSortMap.updated).lean();
    const filteredItems = allItems.filter((product) => {
      const stock = totalStock(product);
      const threshold = typeof product.lowStockThreshold === 'number' ? product.lowStockThreshold : 10;
      if (filters.stock === 'in-stock' && stock <= 0) return false;
      if (filters.stock === 'low-stock' && (stock <= 0 || stock > threshold)) return false;
      if (filters.stock === 'out-of-stock' && stock !== 0) return false;
      if (filters.needsFix === 'yes' && !hasHealthIssues(product as Record<string, unknown>)) return false;
      return true;
    });
    if (filters.sort === 'stock-asc') filteredItems.sort((a, b) => totalStock(a) - totalStock(b));
    if (filters.sort === 'stock-desc') filteredItems.sort((a, b) => totalStock(b) - totalStock(a));
    const start = (filters.page - 1) * filters.limit;
    const items = filteredItems.slice(start, start + filters.limit);
    return { items, total: filteredItems.length, page: filters.page, pages: Math.ceil(filteredItems.length / filters.limit) };
  },
  async bySlug(slug: string): Promise<unknown> { const product = await ProductModel.findOne({ slug, ...publicProductQuery }).select(publicProductProjection).populate('category').populate('categoryIds').populate('collections').populate('relatedProducts').populate('recommendedProducts').lean(); if (!product) throw new ApiError(404, 'Product not found'); return sanitizePublicProduct(product); },
  async adminById(id: string): Promise<unknown> { const product = await ProductModel.findById(id).lean(); if (!product) throw new ApiError(404, 'Product not found'); return product; },
  async create(input: ProductInput): Promise<unknown> {
    assertPriceRelationship(numberField(input, 'basePrice'), numberField(input, 'comparePrice'));
    const product = await ProductModel.create(input);
    markCatalogueStale();
    return product;
  },
  async update(id: string, input: ProductInput): Promise<unknown> {
    const current = await ProductModel.findById(id).select('basePrice comparePrice').lean();
    if (!current) throw new ApiError(404, 'Product not found');
    const basePrice = numberField(input, 'basePrice') ?? current.basePrice;
    const comparePrice = Object.prototype.hasOwnProperty.call(input, 'comparePrice') ? numberField(input, 'comparePrice') : current.comparePrice ?? undefined;
    assertPriceRelationship(basePrice, comparePrice);
    const product = await ProductModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!product) throw new ApiError(404, 'Product not found');
    markCatalogueStale();
    return product;
  },
  async duplicate(id: string): Promise<unknown> {
    const product = await ProductModel.findById(id).lean();
    if (!product) throw new ApiError(404, 'Product not found');
    const suffix = Date.now().toString(36).toUpperCase();
    const duplicate = {
      ...product,
      _id: undefined,
      title: 'Copy of ' + product.title,
      slug: product.slug + '-copy-' + suffix.toLowerCase(),
      productCode: product.productCode ? product.productCode + '-COPY-' + suffix : undefined,
      variants: (product.variants ?? []).map((variant) => ({ ...variant, _id: undefined, sku: variant.sku + '-COPY-' + suffix, stock: 0 })),
      isActive: false,
      isArchived: false,
      isFeatured: false,
      isBestseller: false,
      isNewArrival: false,
      createdAt: undefined,
      updatedAt: undefined
    };
    const duplicatedProduct = await ProductModel.create(duplicate);
    markCatalogueStale();
    return duplicatedProduct;
  },
  async remove(id: string): Promise<void> { const product = await ProductModel.findByIdAndUpdate(id, { isActive: false, isArchived: true }); if (!product) throw new ApiError(404, 'Product not found'); markCatalogueStale(); }
};
