// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { CouponService } from '../services/coupon.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const CouponController = {
  list: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const coupons = await CouponService.list();
    res.json(new ApiResponse(coupons, 'Coupons loaded'));
  }),
  create: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const coupon = await CouponService.create(req.body as Record<string, unknown>);
    res.status(201).json(new ApiResponse(coupon, 'Coupon created'));
  }),
  update: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const coupon = await CouponService.update(String(req.params.id ?? ''), req.body as Record<string, unknown>);
    res.json(new ApiResponse(coupon, 'Coupon updated'));
  }),
  remove: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await CouponService.remove(String(req.params.id ?? ''));
    res.json(new ApiResponse(null, 'Coupon archived'));
  })
};
