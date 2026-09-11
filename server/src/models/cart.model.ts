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
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: String },
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, uppercase: true, trim: true },
    couponDiscount: { type: Number, default: 0, min: 0 },
    couponFreeShipping: { type: Boolean, default: false },
    couponEligibleSubtotal: { type: Number, default: 0, min: 0 },
    version: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    analyticsTestBatchId: { type: String, trim: true, index: true },
    isAnalyticsTestData: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

cartSchema.index(
  { user: 1 },
  { name: 'cruisin_cart_user_unique', unique: true, partialFilterExpression: { user: { $type: 'objectId' } } }
);
cartSchema.index(
  { sessionId: 1 },
  { name: 'cruisin_cart_session_unique', unique: true, partialFilterExpression: { sessionId: { $type: 'string' } } }
);

export type CartDocument = InferSchemaType<typeof cartSchema>;
export const CartModel = model('Cart', cartSchema);
