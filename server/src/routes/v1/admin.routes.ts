// Governed by .rules v1.0
import { Router } from 'express';
import { AdminController } from '../../controllers/admin.controller.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { UploadController } from '../../controllers/upload.controller.js';
import { uploadLimiter } from '../../middleware/rate-limit.middleware.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
adminRouter.get('/overview', AdminController.overview);
adminRouter.get('/analytics', AdminController.analytics);
adminRouter.get('/uploads/signature', uploadLimiter, UploadController.signature);
