// Governed by .rules v1.0
import { Types } from 'mongoose';
import { WishlistModel } from '../models/wishlist.model.js';

export const WishlistService = {
  async get(userId: string): Promise<unknown> { return WishlistModel.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, products: [] } }, { upsert: true, new: true }).populate('products').lean(); },
  async toggle(userId: string, productId: string): Promise<unknown> { const wishlist = await WishlistModel.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, products: [] } }, { upsert: true, new: true }); const exists = wishlist.products.some((product) => String(product) === productId); if (exists) { const remaining = wishlist.products.filter((product) => String(product) !== productId); wishlist.products.splice(0, wishlist.products.length, ...remaining); } else { wishlist.products.push(new Types.ObjectId(productId)); } await wishlist.save(); return wishlist.populate('products'); }
};
