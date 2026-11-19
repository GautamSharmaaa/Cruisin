import { Schema, model } from "mongoose";
import { employeeRoles } from "@cruisin/contracts";
const sopSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["GENERAL", "PRODUCT", "PACKAGING"],
      default: "GENERAL",
      index: true,
    },
    requirements: {
      type: [
        {
          key: String,
          label: String,
          mandatory: Boolean,
          photo: Boolean,
          scan: Boolean,
        },
      ],
      default: [],
    },
    measurements: {
      type: [
        {
          key: String,
          label: String,
          unit: String,
          min: Number,
          max: Number,
          required: Boolean,
        },
      ],
      default: [],
    },
    sections: { type: [{ title: String, body: String }], default: [] },
    flowLabels: { type: new Schema({ start: String, end: String }, { _id: false }) },
    title: { type: String, required: true },
    category: { type: String, required: true },
    body: { type: String, required: true },
    steps: { type: [String], default: [] },
    attachments: { type: [String], default: [] },
    roles: { type: [String], enum: employeeRoles, default: [] },
    products: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    version: { type: Number, default: 0 },
    ackRevision: { type: Number, default: 0 },
    publishedVersion: { type: Number },
    creator: { type: String, required: true },
  },
  { timestamps: true },
);
const versionSchema = new Schema(
  {
    document: { type: Schema.Types.ObjectId, required: true, index: true },
    version: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    publisher: { type: String, required: true },
  },
  { timestamps: true },
);
versionSchema.index({ document: 1, version: 1 }, { unique: true });
versionSchema.pre("save", function () {
  if (!this.isNew) throw new Error("Published SOP versions are immutable");
});
const ackSchema = new Schema(
  {
    document: { type: Schema.Types.ObjectId, required: true },
    version: { type: Number, required: true },
    employee: { type: String, required: true },
    acknowledgedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
ackSchema.index({ document: 1, version: 1, employee: 1 }, { unique: true });
for (const hook of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const)
  versionSchema.pre(hook, function () {
    throw new Error("Published SOP versions are immutable");
  });
export const SopDocumentModel = model("SopDocument", sopSchema);
export const SopVersionModel = model("SopVersion", versionSchema);
export const SopAcknowledgmentModel = model("SopAcknowledgment", ackSchema);
