// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { OrderService } from '../services/order.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import type { CheckoutPaymentMode, PaymentMethod } from '../types/payment.types.js';

export const OrderController = {
  checkout: asyncHandler(async (req: Request<Record<string, string>, unknown, { shippingAddress: Record<string, unknown>; billingAddress: Record<string, unknown>; paymentMethod: PaymentMethod; paymentMode?: CheckoutPaymentMode; couponCode?: string }>, res: Response): Promise<void> => { const result = await OrderService.checkout(req.user?.userId ?? '', req.body); res.status(201).json(new ApiResponse(result, 'Checkout initialized')); }),
  verify: asyncHandler(async (req: Request<Record<string, string>, unknown, { method: PaymentMethod; payload: Record<string, unknown> }>, res: Response): Promise<void> => { const result = await OrderService.verifyPayment(req.body.method, req.body.payload, req.user?.userId ?? ''); res.json(new ApiResponse(result, 'Payment verified')); }),
  mine: asyncHandler(async (req: Request, res: Response): Promise<void> => { const orders = await OrderService.list(req.user?.userId ?? ''); res.json(new ApiResponse(orders, 'Orders loaded')); }),
  all: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const orders = await OrderService.adminList(); res.json(new ApiResponse(orders, 'Orders loaded')); }),
  adminById: asyncHandler(async (req: Request, res: Response): Promise<void> => { const order = await OrderService.adminById(String(req.params.id ?? '')); res.json(new ApiResponse(order, 'Order loaded')); }),
  byId: asyncHandler(async (req: Request, res: Response): Promise<void> => { const order = await OrderService.byId(String(req.params.id ?? ''), req.user); res.json(new ApiResponse(order, 'Order loaded')); }),
  updateStatus: asyncHandler(async (req: Request<Record<string, string>, unknown, { status: string; note?: string; trackingNumber?: string }>, res: Response): Promise<void> => { const order = await OrderService.updateStatus(String(req.params.id ?? ''), req.body); res.json(new ApiResponse(order, 'Order status updated')); }),
  paymentStatus: asyncHandler(async (req: Request, res: Response): Promise<void> => { const order = await OrderService.byId(String(req.params.id ?? ''), req.user); res.json(new ApiResponse(order, 'Payment status loaded')); }),
  cod: asyncHandler(async (req: Request<Record<string, string>, unknown, { shippingAddress: Record<string, unknown>; billingAddress: Record<string, unknown>; couponCode?: string }>, res: Response): Promise<void> => { const result = await OrderService.createCodOrder(req.user?.userId ?? '', { ...req.body, paymentMethod: 'cod', paymentMode: 'cod' }); res.status(201).json(new ApiResponse(result, 'COD order placed')); }),
  markCodPaid: asyncHandler(async (req: Request, res: Response): Promise<void> => { const order = await OrderService.markCollectionPaid(String(req.params.id ?? ''), req.user?.userId ?? '', false); res.json(new ApiResponse(order, 'COD payment marked paid')); }),
  markPartialPaid: asyncHandler(async (req: Request, res: Response): Promise<void> => { const order = await OrderService.markCollectionPaid(String(req.params.id ?? ''), req.user?.userId ?? '', true); res.json(new ApiResponse(order, 'Remaining balance marked paid')); })
};
