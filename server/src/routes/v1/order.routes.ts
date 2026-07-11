// Governed by .rules v1.0
import { Router } from 'express';
import { OrderController } from '../../controllers/order.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idParamSchema } from '../../validators/common.validator.js';
import { checkoutSchema, paymentVerifySchema } from '../../validators/order.validator.js';

export const orderRouter = Router();
orderRouter.post('/checkout', requireAuth, validate({ body: checkoutSchema }), OrderController.checkout);
orderRouter.post('/cod', requireAuth, validate({ body: checkoutSchema }), OrderController.cod);
orderRouter.post('/partial/create', requireAuth, validate({ body: checkoutSchema }), OrderController.checkout);
orderRouter.post('/verify-payment', requireAuth, validate({ body: paymentVerifySchema }), OrderController.verify);
orderRouter.get('/mine', requireAuth, OrderController.mine);
orderRouter.get('/:id', requireAuth, validate({ params: idParamSchema }), OrderController.byId);
orderRouter.get('/:id/payment-status', requireAuth, validate({ params: idParamSchema }), OrderController.paymentStatus);
