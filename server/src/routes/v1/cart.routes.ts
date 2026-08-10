// Governed by .rules v1.0
import { Router } from 'express';
import { CartController } from '../../controllers/cart.controller.js';
import { requireAuth, optionalSession } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { addCartItemSchema, syncCartSchema, updateCartItemSchema } from '../../validators/cart.validator.js';
import { couponApplySchema } from '../../validators/cart.validator.js';

export const cartRouter = Router();
cartRouter.use(optionalSession);
cartRouter.get('/', CartController.get);
cartRouter.put('/sync', validate({ body: syncCartSchema }), CartController.sync);
cartRouter.post('/items', validate({ body: addCartItemSchema }), CartController.add);
cartRouter.put('/items', validate({ body: updateCartItemSchema }), CartController.update);
cartRouter.delete('/items/:product/:variant', CartController.remove);
cartRouter.post('/merge', requireAuth, CartController.merge);
cartRouter.post('/coupon', validate({ body: couponApplySchema }), CartController.applyCoupon);
