// Governed by .rules v1.0
import { Router } from 'express';
import { WishlistController } from '../../controllers/wishlist.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);
wishlistRouter.get('/', WishlistController.get);
wishlistRouter.post('/:product', WishlistController.toggle);
