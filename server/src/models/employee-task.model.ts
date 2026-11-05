import { Schema, model } from "mongoose";
import { taskStatuses } from "@cruisin/contracts";
const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "general_operations" },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    creator: { type: String, required: true },
    assignees: { type: [String], required: true, index: true },
    status: {
      type: String,
      enum: taskStatuses,
      default: "ASSIGNED",
      index: true,
    },
    version: { type: Number, default: 0 },
    dueAt: { type: Date, index: true },
    attachments: { type: [String], default: [] },
    sop: { type: Schema.Types.ObjectId, ref: "SopDocument" },
    unit: { type: String, index: true },
    fulfillmentKey: { type: String, unique: true, sparse: true },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    sku: { type: String },
    dependencies: { type: [String], default: [] },
    internalInstructions: { type: String, default: "" },
    requiresApproval: { type: Boolean, default: true },
    checklist: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          checked: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    comments: {
      type: [
        {
          actor: String,
          text: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    history: {
      type: [
        {
          actor: String,
          action: String,
          from: String,
          to: String,
          at: { type: Date, default: Date.now },
          reason: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);
taskSchema.index({ assignees: 1, status: 1, dueAt: 1 });
taskSchema.index({ createdAt: -1 });
export const EmployeeTaskModel = model("EmployeeTask", taskSchema);
