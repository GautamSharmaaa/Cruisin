// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const wishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product', index: true }]
  },
  { timestamps: true }
);

export type WishlistDocument = InferSchemaType<typeof wishlistSchema>;
export const WishlistModel = model('Wishlist', wishlistSchema);
