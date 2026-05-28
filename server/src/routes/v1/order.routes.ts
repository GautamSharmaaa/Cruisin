// Governed by .rules v1.0
import { Router } from 'express';
import { OrderController } from '../../controllers/order.controller.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { optionalSession, requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idParamSchema } from '../../validators/common.validator.js';
import { checkoutSchema, orderStatusSchema, paymentVerifySchema } from '../../validators/order.validator.js';

export const orderRouter = Router();
orderRouter.use(optionalSession);
orderRouter.post('/checkout', validate({ body: checkoutSchema }), OrderController.checkout);
orderRouter.post('/verify-payment', validate({ body: paymentVerifySchema }), OrderController.verify);
orderRouter.get('/mine', requireAuth, OrderController.mine);
orderRouter.get('/', requireAuth, requireAdmin, OrderController.all);
orderRouter.get('/:id', requireAuth, validate({ params: idParamSchema }), OrderController.byId);
orderRouter.patch('/:id/status', requireAuth, requireAdmin, validate({ params: idParamSchema, body: orderStatusSchema }), OrderController.updateStatus);
