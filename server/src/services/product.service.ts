// Governed by .rules v1.0
import { ProductModel } from '../models/product.model.js';
import { ApiError } from '../utils/api-error.js';
import type { PaginatedResult } from '../types/api.types.js';

export interface ProductFilters { q?: string; category?: string; size?: string; color?: string; minPrice?: number; maxPrice?: number; sort: 'newest' | 'price-asc' | 'price-desc' | 'best-selling' | 'top-rated'; page: number; limit: number; }
export type ProductInput = Record<string, unknown>;
const sortMap = { newest: { createdAt: -1 }, 'price-asc': { basePrice: 1 }, 'price-desc': { basePrice: -1 }, 'best-selling': { createdAt: -1 }, 'top-rated': { 'ratings.avg': -1 } } as const;

export const ProductService = {
  async list(filters: ProductFilters): Promise<PaginatedResult<unknown>> {
    const query: Record<string, unknown> = { isActive: true };
    if (filters.q) query.$text = { $search: filters.q };
    if (filters.category) query.category = filters.category;
    if (filters.size) query['variants.size'] = filters.size;
    if (filters.color) query['variants.color'] = filters.color;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) query.basePrice = { ...(filters.minPrice !== undefined ? { $gte: filters.minPrice } : {}), ...(filters.maxPrice !== undefined ? { $lte: filters.maxPrice } : {}) };
    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([ProductModel.find(query).sort(sortMap[filters.sort]).skip(skip).limit(filters.limit).lean(), ProductModel.countDocuments(query)]);
    return { items, total, page: filters.page, pages: Math.ceil(total / filters.limit) };
  },
  async bySlug(slug: string): Promise<unknown> { const product = await ProductModel.findOne({ slug, isActive: true }).populate('category').lean(); if (!product) throw new ApiError(404, 'Product not found'); return product; },
  async adminById(id: string): Promise<unknown> { const product = await ProductModel.findById(id).lean(); if (!product) throw new ApiError(404, 'Product not found'); return product; },
  async create(input: ProductInput): Promise<unknown> { return ProductModel.create(input); },
  async update(id: string, input: ProductInput): Promise<unknown> { const product = await ProductModel.findByIdAndUpdate(id, input, { new: true, runValidators: true }); if (!product) throw new ApiError(404, 'Product not found'); return product; },
  async remove(id: string): Promise<void> { const product = await ProductModel.findByIdAndUpdate(id, { isActive: false }); if (!product) throw new ApiError(404, 'Product not found'); }
};
