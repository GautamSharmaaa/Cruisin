// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { CmsService } from '../services/cms.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const CmsController = {
  listBanners: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const banners = await CmsService.listBanners(); res.json(new ApiResponse(banners, 'CMS banners loaded')); }),
  home: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const banners = await CmsService.activeHome(); res.json(new ApiResponse(banners, 'Home CMS loaded')); }),
  createBanner: asyncHandler(async (req: Request<Record<string, string>, unknown, Record<string, unknown>>, res: Response): Promise<void> => { const banner = await CmsService.upsertBanner(req.body); res.status(201).json(new ApiResponse(banner, 'Banner created')); }),
  reorder: asyncHandler(async (req: Request<Record<string, string>, unknown, { ids: string[] }>, res: Response): Promise<void> => { await CmsService.reorder(req.body.ids); res.json(new ApiResponse(null, 'CMS order updated')); })
};
