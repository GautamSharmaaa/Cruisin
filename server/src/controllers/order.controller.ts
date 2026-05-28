// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { OrderService } from '../services/order.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import type { PaymentMethod } from '../types/payment.types.js';

export const OrderController = {
  checkout: asyncHandler(async (req: Request, res: Response): Promise<void> => { const result = await OrderService.checkout(req.user?.userId, req.sessionId, req.body as { shippingAddress: Record<string, unknown>; billingAddress: Record<string, unknown>; paymentMethod: PaymentMethod; couponCode?: string }); res.status(201).json(new ApiResponse(result, 'Checkout initialized')); }),
  verify: asyncHandler(async (req: Request, res: Response): Promise<void> => { const body = req.body as { method: PaymentMethod; payload: Record<string, unknown> }; const result = await OrderService.verifyPayment(body.method, body.payload); res.json(new ApiResponse(result, 'Payment verified')); }),
  mine: asyncHandler(async (req: Request, res: Response): Promise<void> => { const orders = await OrderService.list(req.user?.userId ?? ''); res.json(new ApiResponse(orders, 'Orders loaded')); }),
  all: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const orders = await OrderService.adminList(); res.json(new ApiResponse(orders, 'Orders loaded')); }),
  byId: asyncHandler(async (req: Request, res: Response): Promise<void> => { const order = await OrderService.byId(String(req.params.id ?? ''), req.user ?? { userId: '', role: 'customer' }); res.json(new ApiResponse(order, 'Order loaded')); }),
  updateStatus: asyncHandler(async (req: Request, res: Response): Promise<void> => { const order = await OrderService.updateStatus(String(req.params.id ?? ''), req.body as { status: string; note?: string; trackingNumber?: string }); res.json(new ApiResponse(order, 'Order status updated')); })
};
