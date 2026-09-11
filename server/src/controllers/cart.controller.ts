// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { CartService } from '../services/cart.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { finishPerformanceFlow } from '../utils/request-performance.js';

export const CartController = {
  get: asyncHandler(async (req: Request, res: Response): Promise<void> => { const cart = await CartService.get(req.user?.userId, req.sessionId); finishPerformanceFlow('cart', res); res.json(new ApiResponse(cart, 'Cart loaded')); }),
  sync: asyncHandler(async (req: Request<Record<string, string>, unknown, { items: Array<{ product: string; variant: string; quantity: number }>; expectedVersion?: number }>, res: Response): Promise<void> => { const cart = await CartService.sync(req.user?.userId, req.sessionId, req.body.items, req.body.expectedVersion); finishPerformanceFlow('cart', res); res.json(new ApiResponse(cart, 'Cart synchronized')); }),
  add: asyncHandler(async (req: Request<Record<string, string>, unknown, { product: string; variant: string; quantity: number; expectedVersion?: number }>, res: Response): Promise<void> => { const cart = await CartService.add(req.user?.userId, req.sessionId, req.body); finishPerformanceFlow('cart', res); res.status(201).json(new ApiResponse(cart, 'Item added')); }),
  update: asyncHandler(async (req: Request<Record<string, string>, unknown, { product: string; variant: string; quantity: number; expectedVersion?: number }>, res: Response): Promise<void> => { const cart = await CartService.update(req.user?.userId, req.sessionId, req.body); finishPerformanceFlow('cart', res); res.json(new ApiResponse(cart, 'Cart updated')); }),
  remove: asyncHandler(async (req: Request, res: Response): Promise<void> => { const expectedVersion = Number(req.query.expectedVersion); const cart = await CartService.remove(req.user?.userId, req.sessionId, String(req.params.product ?? ''), String(req.params.variant ?? ''), Number.isInteger(expectedVersion) && expectedVersion >= 0 ? expectedVersion : undefined); finishPerformanceFlow('cart', res); res.json(new ApiResponse(cart, 'Item removed')); }),
  merge: asyncHandler(async (req: Request, res: Response): Promise<void> => { const cart = await CartService.merge(req.user?.userId ?? '', req.sessionId ?? ''); finishPerformanceFlow('cart', res); res.json(new ApiResponse(cart, 'Guest cart merged')); }),
  applyCoupon: asyncHandler(async (req: Request<Record<string, string>, unknown, { code: string; expectedVersion?: number }>, res: Response): Promise<void> => { const result = await CartService.applyCoupon(req.user?.userId, req.sessionId, req.body.code, req.body.expectedVersion); finishPerformanceFlow('coupon', res); res.json(new ApiResponse(result, 'Coupon applied')); }),
  removeCoupon: asyncHandler(async (req: Request<Record<string, string>, unknown, { expectedVersion?: number }>, res: Response): Promise<void> => { const cart = await CartService.removeCoupon(req.user?.userId, req.sessionId, req.body.expectedVersion); finishPerformanceFlow('coupon', res); res.json(new ApiResponse(cart, 'Coupon removed')); })
};
