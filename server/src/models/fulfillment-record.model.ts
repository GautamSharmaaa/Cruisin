import { Schema, model } from "mongoose";
const fulfillmentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, required: true, unique: true },
    task: { type: Schema.Types.ObjectId, required: true },
    version: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: [
        "PICKING",
        "PACKED",
        "READY_FOR_HANDOVER",
        "HANDED_OVER",
        "SHIPPED",
      ],
      default: "PICKING",
    },
    units: [String],
    employee: String,
    weightKg: Number,
    lengthCm: Number,
    widthCm: Number,
    heightCm: Number,
    volumeCm3: Number,
    volumetricWeightKg: Number,
    chargeableWeightKg: Number,
    courier: String,
    divisor: Number,
    evidence: [String],
    shipment: { type: Schema.Types.ObjectId },
    awb: String,
    labelOperationId: String,
    labelVerifiedAt: Date,
    packedAt: Date,
    handedOverAt: Date,
  },
  { timestamps: true },
);
const policySchema = new Schema(
  {
    courier: { type: String, required: true, unique: true },
    divisor: { type: Number, required: true, min: 1 },
    minWeightKg: { type: Number, default: 0.001 },
    maxWeightKg: { type: Number, required: true, min: 0.001 },
    requireEvidence: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export const FulfillmentRecordModel = model(
  "FulfillmentRecord",
  fulfillmentSchema,
);
export const CourierMeasurementPolicyModel = model(
  "CourierMeasurementPolicy",
  policySchema,
);
