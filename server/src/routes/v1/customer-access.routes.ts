// Governed by .rules v1.0
import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireRole } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { adminBrowserOrigins } from '../../config/origins.js';
import type { RequestHandler } from 'express';
import { ApiError } from '../../utils/api-error.js';
import { authLimiter } from '../../middleware/rate-limit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { CustomerAccessService } from '../../services/customer-access.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { idParamSchema } from '../../validators/common.validator.js';

const redeemSchema = z.object({ phone: z.string().trim().max(32), code: z.string().trim().regex(/^[a-f0-9]{20}$/i) });
export const customerAccessAdminRouter = Router();
const requireAdminOrigin: RequestHandler = (req, _res, next) => {
  if (!req.headers.origin || !adminBrowserOrigins.includes(req.headers.origin)) {
    next(new ApiError(403, 'Open assisted access from Admin.'));
    return;
  }
  next();
};
const staff = [requireAuth, requireAdmin, requireRole(['admin', 'superadmin']), requireAdminOrigin, authLimiter];

customerAccessAdminRouter.post('/users/:id/customer-access', ...staff, validate({ params: idParamSchema }), asyncHandler(async (req, res) => {
  const grant = await CustomerAccessService.generate(req.user!.userId, String(req.params.id));
  res.set('Cache-Control', 'no-store').json(new ApiResponse(grant, 'Access code generated'));
}));

customerAccessAdminRouter.post('/customer-access/redeem', ...staff, validate({ body: redeemSchema }), asyncHandler(async (req, res) => {
  const session = await CustomerAccessService.redeem(req.user!.userId, req.body);
  res.set('Cache-Control', 'no-store').json(new ApiResponse(session, 'Assisted access started'));
}));

export const customerAccessRouter = Router();
customerAccessRouter.post('/end', requireAuth, asyncHandler(async (req, res) => {
  await CustomerAccessService.end(req.user!);
  res.json(new ApiResponse(null, 'Assisted access ended'));
}));
