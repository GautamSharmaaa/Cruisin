import { Schema, model } from "mongoose";
const movementSchema = new Schema(
  {
    unit: { type: String, index: true },
    previousState: String,
    nextState: String,
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variant: { type: Schema.Types.ObjectId, required: true, index: true },
    sku: { type: String, required: true, index: true },
    delta: { type: Number, required: true },
    reason: { type: String, required: true },
    reference: { type: String, required: true },
    actor: { type: String, required: true },
    before: { type: Number, required: true },
    after: { type: Number, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    location: { type: String, default: "default" },
    at: { type: Date, default: Date.now, immutable: true },
  },
  { versionKey: false },
);
movementSchema.pre("save", function () {
  if (!this.isNew) throw new Error("Stock movements are immutable");
});
for (const hook of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const)
  movementSchema.pre(hook, function () {
    throw new Error("Stock movements are immutable");
  });
const labelSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    product: { type: Schema.Types.ObjectId, required: true },
    variant: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const packingSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, required: true, unique: true },
    task: { type: Schema.Types.ObjectId, required: true },
    version: { type: Number, default: 0 },
    items: { type: [{ sku: String, quantity: Number }], default: [] },
    completedAt: { type: Date },
    completedBy: { type: String },
  },
  { timestamps: true },
);
export const StockMovementModel = model("StockMovement", movementSchema);
export const VariantLabelModel = model("VariantLabel", labelSchema);
export const PackingVerificationModel = model(
  "PackingVerification",
  packingSchema,
);
