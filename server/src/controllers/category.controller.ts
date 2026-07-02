// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { CategoryService } from '../services/category.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const CategoryController = {
  list: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const categories = await CategoryService.active();
    res.json(new ApiResponse(categories, 'Categories loaded'));
  }),
  byPath: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const category = await CategoryService.byPath(String(req.query.path ?? ''));
    res.json(new ApiResponse(category, 'Category loaded'));
  }),
  adminList: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const categories = await CategoryService.list();
    res.json(new ApiResponse(categories, 'Categories loaded'));
  }),
  create: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const category = await CategoryService.create(req.body);
    res.status(201).json(new ApiResponse(category, 'Category created'));
  }),
  update: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => {
    const category = await CategoryService.update(String(req.params.id ?? ''), req.body);
    res.json(new ApiResponse(category, 'Category updated'));
  }),
  remove: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await CategoryService.remove(String(req.params.id ?? ''));
    res.json(new ApiResponse(null, 'Category archived'));
  }),
  reorder: asyncHandler(async (req: Request<Record<string, string>, unknown, { ids: string[] }>, res: Response): Promise<void> => {
    await CategoryService.reorder(req.body.ids);
    res.json(new ApiResponse(null, 'Category order updated'));
  })
};
