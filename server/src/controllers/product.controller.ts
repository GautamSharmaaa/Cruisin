// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { ProductService, type AdminProductFilters, type ProductFilters } from '../services/product.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const ProductController = {
  list: asyncHandler(async (req: Request, res: Response): Promise<void> => { const result = await ProductService.list(req.query as unknown as ProductFilters); res.json(new ApiResponse(result, 'Products loaded')); }),
  adminList: asyncHandler(async (req: Request, res: Response): Promise<void> => { const result = await ProductService.adminList(req.query as unknown as AdminProductFilters); res.json(new ApiResponse(result, 'Admin products loaded')); }),
  adminById: asyncHandler(async (req: Request, res: Response): Promise<void> => { const product = await ProductService.adminById(String(req.params.id ?? '')); res.json(new ApiResponse(product, 'Product loaded')); }),
  bySlug: asyncHandler(async (req: Request, res: Response): Promise<void> => { const product = await ProductService.bySlug(String(req.params.slug ?? '')); res.json(new ApiResponse(product, 'Product loaded')); }),
  create: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const product = await ProductService.create(req.body); res.status(201).json(new ApiResponse(product, 'Product created')); }),
  update: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const product = await ProductService.update(String(req.params.id ?? ''), req.body); res.json(new ApiResponse(product, 'Product updated')); }),
  duplicate: asyncHandler(async (req: Request, res: Response): Promise<void> => { const product = await ProductService.duplicate(String(req.params.id ?? '')); res.status(201).json(new ApiResponse(product, 'Product duplicated')); }),
  remove: asyncHandler(async (req: Request, res: Response): Promise<void> => { await ProductService.remove(String(req.params.id ?? '')); res.json(new ApiResponse(null, 'Product archived')); })
};
