// Governed by .rules v1.0
import { Router } from 'express';
import { PaymentController } from '../../controllers/payment.controller.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { refundSchema } from '../../validators/order.validator.js';

export const paymentRouter = Router();
paymentRouter.post('/webhooks/stripe', PaymentController.stripeWebhook);
paymentRouter.post('/webhooks/razorpay', PaymentController.razorpayWebhook);
paymentRouter.post('/refunds', requireAuth, requireAdmin, validate({ body: refundSchema }), PaymentController.refund);
