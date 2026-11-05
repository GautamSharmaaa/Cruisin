import { Schema, model } from "mongoose";
const auditSchema = new Schema(
  {
    actor: { type: String, required: true, index: true },
    actorKind: {
      type: String,
      enum: ["admin", "employee", "anonymous"],
      required: true,
    },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    result: {
      type: String,
      enum: ["success", "denied", "failure"],
      required: true,
    },
    summary: { type: String, required: true },
    correlationId: { type: String, required: true },
    at: { type: Date, default: Date.now, immutable: true, index: true },
  },
  { versionKey: false },
);
auditSchema.index({ actor: 1, at: -1 });
auditSchema.pre("save", function () {
  if (!this.isNew) throw new Error("Operational audit events are append-only");
});
for (const hook of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const)
  auditSchema.pre(hook, function () {
    throw new Error("Operational audit events are append-only");
  });
const notificationSchema = new Schema(
  {
    recipient: { type: String, required: true, index: true },
    event: { type: String, required: true },
    entity: { type: String, required: true },
    message: { type: String, required: true },
    dedupeKey: { type: String, required: true, unique: true },
    readAt: { type: Date },
  },
  { timestamps: true },
);
notificationSchema.index({ recipient: 1, createdAt: -1 });
export const OperationsAuditModel = model("OperationsAudit", auditSchema);
export const OperationsNotificationModel = model(
  "OperationsNotification",
  notificationSchema,
);
