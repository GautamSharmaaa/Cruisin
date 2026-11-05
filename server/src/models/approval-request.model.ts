import { Schema, model } from "mongoose";
const approvalSchema = new Schema(
  {
    kind: {
      type: String,
      enum: [
        "task",
        "inventory",
        "inspection",
        "order_exception",
        "sop_change",
        "sop_publication",
        "qc_override",
        "unit_disposition",
      ],
      required: true,
    },
    entity: { type: String, required: true, index: true },
    requester: { type: String, required: true, index: true },
    reviewer: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "REWORK_REQUIRED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    version: { type: Number, default: 0 },
    expectedEntityVersion: { type: Number, required: true },
    proposed: { type: Schema.Types.Mixed, required: true },
    existing: { type: Schema.Types.Mixed },
    reason: { type: String, required: true },
    evidence: { type: [String], default: [] },
    notes: { type: String, default: "" },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);
approvalSchema.index({ requester: 1, status: 1, createdAt: -1 });
export const ApprovalRequestModel = model("ApprovalRequest", approvalSchema);
