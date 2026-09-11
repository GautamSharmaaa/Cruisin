// Governed by .rules v1.0
import { Router, type RequestHandler } from 'express';
import { ReturnExchangeController } from '../../controllers/return-exchange.controller.js';
import { requireAdmin, requireRole } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { uploadLimiter } from '../../middleware/rate-limit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import { idParamSchema } from '../../validators/common.validator.js';
import { adminRefundDestinationSchema, exchangeRequestSchema, refundDestinationSchema, returnPaymentVerifySchema, returnRequestSchema, workflowActionSchema } from '../../validators/logistics.validator.js';

const requireAdminForShiprocketActions = (actions: readonly string[]): RequestHandler => (req, _res, next): void => {
  if (actions.includes(String(req.body?.action)) && !['admin', 'superadmin'].includes(String(req.user?.role))) {
    next(new ApiError(403, 'Admin or superadmin permission is required for Shiprocket mutations'));
    return;
  }
  next();
};
const requireAdminForFinancialActions = (actions: readonly string[]): RequestHandler => (req, _res, next): void => {
  if (actions.includes(String(req.body?.action)) && !['admin', 'superadmin'].includes(String(req.user?.role))) {
    next(new ApiError(403, 'Admin or superadmin permission is required for refund actions'));
    return;
  }
  next();
};

export const returnExchangeRouter = Router();
returnExchangeRouter.use(requireAuth);
returnExchangeRouter.post('/returns/evidence', uploadLimiter, upload.single('photo'), ReturnExchangeController.uploadEvidence);
returnExchangeRouter.post('/returns', validate({ body: returnRequestSchema }), ReturnExchangeController.createReturn);
returnExchangeRouter.post('/returns/verify-payment', validate({ body: returnPaymentVerifySchema }), ReturnExchangeController.verifyReturnPayment);
returnExchangeRouter.post('/returns/:id/refund-destination', validate({ params: idParamSchema, body: refundDestinationSchema }), ReturnExchangeController.submitRefundDestination);
returnExchangeRouter.post('/returns/:id/refund-destination/refresh', validate({ params: idParamSchema }), ReturnExchangeController.refreshRefundDestination);
returnExchangeRouter.get('/exchanges/options/:id', validate({ params: idParamSchema }), ReturnExchangeController.exchangeOptions);
returnExchangeRouter.post('/exchanges', validate({ body: exchangeRequestSchema }), ReturnExchangeController.createExchange);
returnExchangeRouter.post('/exchanges/verify-payment', validate({ body: returnPaymentVerifySchema }), ReturnExchangeController.verifyExchangePayment);
returnExchangeRouter.get('/mine', ReturnExchangeController.mine);
returnExchangeRouter.get('/wallet', ReturnExchangeController.wallet);

export const adminReturnRouter = Router();
adminReturnRouter.use(requireAuth, requireAdmin);
adminReturnRouter.get('/', ReturnExchangeController.returns);
adminReturnRouter.post('/:id/refund-destination', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema, body: adminRefundDestinationSchema }), ReturnExchangeController.setRefundDestinationByAdmin);
adminReturnRouter.post('/:id/action', requireRole(['manager', 'admin', 'superadmin']), validate({ params: idParamSchema, body: workflowActionSchema }), requireAdminForShiprocketActions(['create_reverse_pickup']), requireAdminForFinancialActions(['open_refund_window', 'refund_pending', 'refunded', 'record_manual_upi_refund']), ReturnExchangeController.returnAction);

export const adminExchangeRouter = Router();
adminExchangeRouter.use(requireAuth, requireAdmin);
adminExchangeRouter.get('/', ReturnExchangeController.exchanges);
adminExchangeRouter.post('/:id/action', requireRole(['manager', 'admin', 'superadmin']), validate({ params: idParamSchema, body: workflowActionSchema }), requireAdminForShiprocketActions(['create_reverse_pickup', 'replacement_shipped']), ReturnExchangeController.exchangeAction);
