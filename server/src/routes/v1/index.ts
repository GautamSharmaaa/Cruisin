// Governed by .rules v1.0
import { Router } from 'express';
import { adminRouter } from './admin.routes.js';
import { authRouter } from './auth.routes.js';
import { cartRouter } from './cart.routes.js';
import { cmsRouter } from './cms.routes.js';
import { orderRouter } from './order.routes.js';
import { productRouter } from './product.routes.js';
import { reviewRouter } from './review.routes.js';
import { wishlistRouter } from './wishlist.routes.js';

export const v1Router = Router();
v1Router.use('/auth', authRouter);
v1Router.use('/products', productRouter);
v1Router.use('/cart', cartRouter);
v1Router.use('/orders', orderRouter);
v1Router.use('/wishlist', wishlistRouter);
v1Router.use('/cms', cmsRouter);
v1Router.use('/reviews', reviewRouter);
v1Router.use('/admin', adminRouter);
