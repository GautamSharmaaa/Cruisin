// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sessionId: { type: String, index: true },
    items: { type: [cartItemSchema], default: [] },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

cartSchema.index({ user: 1, sessionId: 1 });

export type CartDocument = InferSchemaType<typeof cartSchema>;
export const CartModel = model('Cart', cartSchema);
