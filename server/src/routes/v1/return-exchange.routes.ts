// Governed by .rules v1.0
import { Router } from 'express';
import { ReturnExchangeController } from '../../controllers/return-exchange.controller.js';
import { requireAdmin, requireRole } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idParamSchema } from '../../validators/common.validator.js';
import { exchangeRequestSchema, returnRequestSchema, workflowActionSchema } from '../../validators/logistics.validator.js';

export const returnExchangeRouter = Router();
returnExchangeRouter.use(requireAuth);
returnExchangeRouter.post('/returns', validate({ body: returnRequestSchema }), ReturnExchangeController.createReturn);
returnExchangeRouter.post('/exchanges', validate({ body: exchangeRequestSchema }), ReturnExchangeController.createExchange);
returnExchangeRouter.get('/mine', ReturnExchangeController.mine);

export const adminReturnRouter = Router();
adminReturnRouter.use(requireAuth, requireAdmin);
adminReturnRouter.get('/', ReturnExchangeController.returns);
adminReturnRouter.post('/:id/action', requireRole(['manager', 'admin', 'superadmin']), validate({ params: idParamSchema, body: workflowActionSchema }), ReturnExchangeController.returnAction);

export const adminExchangeRouter = Router();
adminExchangeRouter.use(requireAuth, requireAdmin);
adminExchangeRouter.get('/', ReturnExchangeController.exchanges);
adminExchangeRouter.post('/:id/action', requireRole(['manager', 'admin', 'superadmin']), validate({ params: idParamSchema, body: workflowActionSchema }), ReturnExchangeController.exchangeAction);
