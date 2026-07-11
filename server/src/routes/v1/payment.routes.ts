// Governed by .rules v1.0
import { Router } from 'express';
import { PaymentController } from '../../controllers/payment.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { checkoutSchema, paymentVerifySchema } from '../../validators/order.validator.js';
import { OrderController } from '../../controllers/order.controller.js';

export const paymentRouter = Router();
paymentRouter.post('/webhooks/stripe', PaymentController.stripeWebhook);
paymentRouter.post('/webhooks/razorpay', PaymentController.razorpayWebhook);
paymentRouter.get('/config', PaymentController.config);
paymentRouter.post('/razorpay/create-order', requireAuth, validate({ body: checkoutSchema }), OrderController.checkout);
paymentRouter.post('/razorpay/verify', requireAuth, validate({ body: paymentVerifySchema }), OrderController.verify);
paymentRouter.get('/status/:id', requireAuth, OrderController.paymentStatus);
