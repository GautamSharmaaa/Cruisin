// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { ProfitabilityAnalyticsService } from '../services/profitability-analytics.service.js';
import { ProductCostCsvService } from '../services/product-cost-csv.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';

export const AdminController = {
  overview: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const overview = await AdminService.overview(); res.json(new ApiResponse(overview, 'Overview loaded')); }),
  analytics: asyncHandler(async (req: Request, res: Response): Promise<void> => { const days = Number(req.query.days ?? 14); const analytics = await AdminService.analytics(days); res.json(new ApiResponse(analytics, 'Analytics loaded')); }),
  analyticsSummary: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const includeTestOrders = req.user?.role === 'superadmin' && String(req.query.includeTestOrders) === 'true';
    const analytics = await AdminService.analyticsSummary({ ...req.query, includeTestOrders });
    res.json(new ApiResponse(analytics, 'Analytics summary loaded'));
  }),
  profitabilityAnalytics: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const includeTestOrders = req.user?.role === 'superadmin' && String(req.query.includeTestOrders) === 'true';
    res.json(new ApiResponse(await ProfitabilityAnalyticsService.report(req.query, includeTestOrders), 'Cost analytics loaded'));
  }),
  productCostRows: asyncHandler(async (_req: Request, res: Response): Promise<void> => { res.json(new ApiResponse(await ProductCostCsvService.rows(), 'Product costs loaded')); }),
  importProductCosts: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.file?.buffer) throw new ApiError(400, 'Product cost CSV file is required');
    res.json(new ApiResponse(await ProductCostCsvService.import(req.file.buffer.toString('utf8')), 'Product costs updated'));
  })
};
