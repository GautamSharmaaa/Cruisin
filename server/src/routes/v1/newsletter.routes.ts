// Governed by .rules v1.0
import { Router } from 'express';
import { NewsletterController } from '../../controllers/newsletter.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { generalLimiter } from '../../middleware/rate-limit.middleware.js';
import { newsletterSubscribeSchema } from '../../validators/newsletter.validator.js';

export const newsletterRouter = Router();
newsletterRouter.post('/subscribe', generalLimiter, validate({ body: newsletterSubscribeSchema }), NewsletterController.subscribe);
