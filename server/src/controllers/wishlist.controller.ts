// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { WishlistService } from '../services/wishlist.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const WishlistController = {
  get: asyncHandler(async (req: Request, res: Response): Promise<void> => { const wishlist = await WishlistService.get(req.user?.userId ?? ''); res.json(new ApiResponse(wishlist, 'Wishlist loaded')); }),
  toggle: asyncHandler(async (req: Request, res: Response): Promise<void> => { const wishlist = await WishlistService.toggle(req.user?.userId ?? '', String(req.params.product ?? '')); res.json(new ApiResponse(wishlist, 'Wishlist updated')); })
};
