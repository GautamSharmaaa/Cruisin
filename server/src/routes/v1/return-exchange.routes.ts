// Governed by .rules v1.0
import { Router, type RequestHandler } from 'express';
import { ReturnExchangeController } from '../../controllers/return-exchange.controller.js';
import { requireAdmin, requireRole } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import { idParamSchema } from '../../validators/common.validator.js';
import { exchangeRequestSchema, returnRequestSchema, workflowActionSchema } from '../../validators/logistics.validator.js';

const requireAdminForShiprocketActions = (actions: readonly string[]): RequestHandler => (req, _res, next): void => {
  if (actions.includes(String(req.body?.action)) && !['admin', 'superadmin'].includes(String(req.user?.role))) {
    next(new ApiError(403, 'Admin or superadmin permission is required for Shiprocket mutations'));
    return;
  }
  next();
};

export const returnExchangeRouter = Router();
returnExchangeRouter.use(requireAuth);
returnExchangeRouter.post('/returns', validate({ body: returnRequestSchema }), ReturnExchangeController.createReturn);
returnExchangeRouter.post('/exchanges', validate({ body: exchangeRequestSchema }), ReturnExchangeController.createExchange);
returnExchangeRouter.get('/mine', ReturnExchangeController.mine);

export const adminReturnRouter = Router();
adminReturnRouter.use(requireAuth, requireAdmin);
adminReturnRouter.get('/', ReturnExchangeController.returns);
adminReturnRouter.post('/:id/action', requireRole(['manager', 'admin', 'superadmin']), validate({ params: idParamSchema, body: workflowActionSchema }), requireAdminForShiprocketActions(['create_reverse_pickup']), ReturnExchangeController.returnAction);

export const adminExchangeRouter = Router();
adminExchangeRouter.use(requireAuth, requireAdmin);
adminExchangeRouter.get('/', ReturnExchangeController.exchanges);
adminExchangeRouter.post('/:id/action', requireRole(['manager', 'admin', 'superadmin']), validate({ params: idParamSchema, body: workflowActionSchema }), requireAdminForShiprocketActions(['create_reverse_pickup', 'replacement_shipped']), ReturnExchangeController.exchangeAction);
