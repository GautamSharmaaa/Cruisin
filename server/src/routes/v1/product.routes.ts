// Governed by .rules v1.0
import { Router } from 'express';
import { ProductController } from '../../controllers/product.controller.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idParamSchema, slugParamSchema } from '../../validators/common.validator.js';
import { adminProductQuerySchema, productBodySchema, productQuerySchema } from '../../validators/product.validator.js';

export const productRouter = Router();
productRouter.get('/', validate({ query: productQuerySchema }), ProductController.list);
productRouter.get('/admin/catalogue', requireAuth, requireAdmin, validate({ query: adminProductQuerySchema }), ProductController.adminList);
productRouter.get('/admin/:id', requireAuth, requireAdmin, validate({ params: idParamSchema }), ProductController.adminById);
productRouter.get('/:slug', validate({ params: slugParamSchema }), ProductController.bySlug);
productRouter.post('/', requireAuth, requireAdmin, validate({ body: productBodySchema }), ProductController.create);
productRouter.post('/:id/duplicate', requireAuth, requireAdmin, validate({ params: idParamSchema }), ProductController.duplicate);
productRouter.put('/:id', requireAuth, requireAdmin, validate({ params: idParamSchema, body: productBodySchema.partial() }), ProductController.update);
productRouter.delete('/:id', requireAuth, requireAdmin, validate({ params: idParamSchema }), ProductController.remove);
