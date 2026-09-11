// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { PromotionExperienceService } from '../services/promotion-experience.service.js';
import type { PromotionExperienceInput } from '../validators/promotion-experience.validator.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const PromotionExperienceController = {
  public: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const promotion = await PromotionExperienceService.active();
    res.set('Cache-Control', 'no-store, max-age=0');
    res.json(new ApiResponse(promotion, promotion ? 'Promotion experience loaded' : 'No active promotion experience'));
  }),
  admin: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const promotion = await PromotionExperienceService.admin();
    res.set('Cache-Control', 'no-store, max-age=0');
    res.json(new ApiResponse(promotion, 'Promotion experience loaded'));
  }),
  update: asyncHandler(async (req: Request<Record<string, string>, unknown, PromotionExperienceInput>, res: Response): Promise<void> => {
    const promotion = await PromotionExperienceService.update(req.body, req.user?.userId);
    res.set('Cache-Control', 'no-store, max-age=0');
    res.json(new ApiResponse(promotion, 'Promotion experience saved'));
  })
};
