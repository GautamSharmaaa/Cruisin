// Governed by .rules v1.0
import { Router } from 'express';
import { PromotionExperienceController } from '../../controllers/promotion-experience.controller.js';
import { requireAdmin, requireRole } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { promotionExperienceBodySchema } from '../../validators/promotion-experience.validator.js';

export const promotionExperienceRouter = Router();
promotionExperienceRouter.get('/', PromotionExperienceController.public);

export const promotionExperienceAdminRouter = Router();
promotionExperienceAdminRouter.use(requireAuth, requireAdmin);
promotionExperienceAdminRouter.get('/', PromotionExperienceController.admin);
promotionExperienceAdminRouter.put('/', requireRole(['manager', 'admin', 'superadmin']), validate({ body: promotionExperienceBodySchema }), PromotionExperienceController.update);
