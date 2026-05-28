// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { CartService } from '../services/cart.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const CartController = {
  get: asyncHandler(async (req: Request, res: Response): Promise<void> => { const cart = await CartService.get(req.user?.userId, req.sessionId); res.json(new ApiResponse(cart, 'Cart loaded')); }),
  add: asyncHandler(async (req: Request, res: Response): Promise<void> => { const cart = await CartService.add(req.user?.userId, req.sessionId, req.body as { product: string; variant: string; quantity: number }); res.status(201).json(new ApiResponse(cart, 'Item added')); }),
  update: asyncHandler(async (req: Request, res: Response): Promise<void> => { const cart = await CartService.update(req.user?.userId, req.sessionId, req.body as { product: string; variant: string; quantity: number }); res.json(new ApiResponse(cart, 'Cart updated')); }),
  remove: asyncHandler(async (req: Request, res: Response): Promise<void> => { const cart = await CartService.remove(req.user?.userId, req.sessionId, String(req.params.product ?? ''), String(req.params.variant ?? '')); res.json(new ApiResponse(cart, 'Item removed')); }),
  merge: asyncHandler(async (req: Request, res: Response): Promise<void> => { const cart = await CartService.merge(req.user?.userId ?? '', req.sessionId ?? ''); res.json(new ApiResponse(cart, 'Guest cart merged')); })
};
