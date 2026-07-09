// Governed by .rules v1.0
import { Router } from 'express';
import { AdminController } from '../../controllers/admin.controller.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { UploadController } from '../../controllers/upload.controller.js';
import { uploadLimiter } from '../../middleware/rate-limit.middleware.js';
import { CatalogueController, catalogueCsvUpload } from '../../controllers/catalogue.controller.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
adminRouter.get('/overview', AdminController.overview);
adminRouter.get('/analytics/summary', AdminController.analyticsSummary);
adminRouter.get('/analytics', AdminController.analytics);
adminRouter.get('/uploads/signature', uploadLimiter, UploadController.signature);
adminRouter.get('/catalogues/dashboard', CatalogueController.dashboard);
adminRouter.post('/catalogues/import/upload', catalogueCsvUpload.single('file'), CatalogueController.upload);
adminRouter.post('/catalogues/import/preview', CatalogueController.preview);
adminRouter.post('/catalogues/import/dry-run', CatalogueController.dryRun);
adminRouter.post('/catalogues/import/confirm', CatalogueController.confirm);
adminRouter.get('/catalogues/imports', CatalogueController.imports);
adminRouter.get('/catalogues/imports/:id', CatalogueController.importById);
adminRouter.get('/catalogues/imports/:id/errors.csv', CatalogueController.importErrors);
adminRouter.post('/catalogues/export', CatalogueController.exportCatalogue);
adminRouter.get('/catalogues/exports', CatalogueController.exports);
adminRouter.get('/catalogues/exports/:id/download', CatalogueController.exportDownload);
adminRouter.get('/catalogues/settings', CatalogueController.settings);
adminRouter.patch('/catalogues/settings', CatalogueController.updateSettings);
