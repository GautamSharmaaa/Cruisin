// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const inventorySchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variant: { type: Schema.Types.ObjectId, required: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    stock: { type: Number, required: true, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    analyticsTestBatchId: { type: String, trim: true, index: true },
    isAnalyticsTestData: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

inventorySchema.index({ product: 1, variant: 1 }, { unique: true });
inventorySchema.index({ stock: 1, lowStockThreshold: 1 });

export type InventoryDocument = InferSchemaType<typeof inventorySchema>;
export const InventoryModel = model('Inventory', inventorySchema);
