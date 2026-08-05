// Governed by .rules v1.0
import { Router } from 'express';
import { LogisticsWebhookController } from '../../controllers/logistics-webhook.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { logisticsWebhookSchema } from '../../validators/logistics.validator.js';

export const logisticsWebhookRouter = Router();
logisticsWebhookRouter.post('/logistics-events', validate({ body: logisticsWebhookSchema }), LogisticsWebhookController.receive);
