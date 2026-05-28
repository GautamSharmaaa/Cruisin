// Governed by .rules v1.0
import { Router } from 'express';
import { CmsController } from '../../controllers/cms.controller.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { bannerBodySchema } from '../../validators/cms.validator.js';

export const cmsRouter = Router();
cmsRouter.get('/home', CmsController.home);
cmsRouter.get('/banners', requireAuth, requireAdmin, CmsController.listBanners);
cmsRouter.post('/banners', requireAuth, requireAdmin, validate({ body: bannerBodySchema }), CmsController.createBanner);
cmsRouter.post('/reorder', requireAuth, requireAdmin, CmsController.reorder);
