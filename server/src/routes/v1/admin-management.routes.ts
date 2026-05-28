// Governed by .rules v1.0
import { Router } from 'express';
import { CategoryController } from '../../controllers/category.controller.js';
import { CouponController } from '../../controllers/coupon.controller.js';
import { UserController } from '../../controllers/user.controller.js';
import { requireRole } from '../../middleware/admin.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { categoryBodySchema, categorySortSchema } from '../../validators/category.validator.js';
import { couponBodySchema } from '../../validators/coupon.validator.js';
import { idParamSchema } from '../../validators/common.validator.js';
import { userAdminUpdateSchema, userQuerySchema } from '../../validators/user.validator.js';

export const adminManagementRouter = Router();

adminManagementRouter.get('/categories', CategoryController.adminList);
adminManagementRouter.post('/categories', requireRole(['admin', 'superadmin', 'manager']), validate({ body: categoryBodySchema }), CategoryController.create);
adminManagementRouter.put('/categories/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: categoryBodySchema.partial() }), CategoryController.update);
adminManagementRouter.delete('/categories/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema }), CategoryController.remove);
adminManagementRouter.post('/categories/reorder', requireRole(['admin', 'superadmin', 'manager']), validate({ body: categorySortSchema }), CategoryController.reorder);

adminManagementRouter.get('/coupons', requireRole(['admin', 'superadmin', 'manager']), CouponController.list);
adminManagementRouter.post('/coupons', requireRole(['admin', 'superadmin', 'manager']), validate({ body: couponBodySchema }), CouponController.create);
adminManagementRouter.put('/coupons/:id', requireRole(['admin', 'superadmin', 'manager']), validate({ params: idParamSchema, body: couponBodySchema.partial() }), CouponController.update);
adminManagementRouter.delete('/coupons/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema }), CouponController.remove);

adminManagementRouter.get('/users', requireRole(['admin', 'superadmin']), validate({ query: userQuerySchema }), UserController.list);
adminManagementRouter.patch('/users/:id', requireRole(['admin', 'superadmin']), validate({ params: idParamSchema, body: userAdminUpdateSchema }), UserController.update);
