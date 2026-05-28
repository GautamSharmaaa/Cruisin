// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { ReviewService } from '../services/review.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const ReviewController = {
  list: asyncHandler(async (req: Request, res: Response): Promise<void> => { const reviews = await ReviewService.list(String(req.params.product ?? '')); res.json(new ApiResponse(reviews, 'Reviews loaded')); }),
  create: asyncHandler(async (req: Request, res: Response): Promise<void> => { const review = await ReviewService.create(req.user?.userId ?? '', req.body as Record<string, unknown>); res.status(201).json(new ApiResponse(review, 'Review submitted')); }),
  moderate: asyncHandler(async (req: Request, res: Response): Promise<void> => { const review = await ReviewService.moderate(String(req.params.id ?? ''), (req.body as { status: string }).status); res.json(new ApiResponse(review, 'Review moderated')); })
};
