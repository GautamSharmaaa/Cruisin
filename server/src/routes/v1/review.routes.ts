// Governed by .rules v1.0
import { Router } from 'express';
import { ReviewController } from '../../controllers/review.controller.js';
import { requireAdmin, requireRole } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idParamSchema } from '../../validators/common.validator.js';
import { reviewBodySchema, reviewModerationSchema } from '../../validators/review.validator.js';

export const reviewRouter = Router();
reviewRouter.get('/product/:product', ReviewController.list);
reviewRouter.post('/', requireAuth, validate({ body: reviewBodySchema }), ReviewController.create);
reviewRouter.patch('/:id/moderate', requireAuth, requireAdmin, requireRole(['manager', 'admin', 'superadmin']), validate({ params: idParamSchema, body: reviewModerationSchema }), ReviewController.moderate);
