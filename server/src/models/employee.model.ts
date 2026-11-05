import { Schema, model } from "mongoose";
import { employeeRoles, permissions } from "@cruisin/contracts";
const employeeSchema = new Schema(
  {
    employeeId: { type: String, required: true, unique: true, immutable: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    role: { type: String, enum: employeeRoles, required: true },
    grants: { type: [String], enum: permissions, default: [] },
    denials: { type: [String], enum: permissions, default: [] },
    active: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 0 },
    sessionVersion: { type: Number, default: 0 },
    timezone: { type: String, default: "Asia/Kolkata" },
  },
  { timestamps: true },
);
const sessionSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, select: false },
    csrfHash: { type: String, required: true, select: false },
    sessionVersion: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    revokedAt: { type: Date },
    device: { type: String },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);
const otpSchema = new Schema(
  {
    challengeId: { type: String, required: true, unique: true },
    phoneHash: { type: String, required: true, index: true },
    sessionVersion: { type: Number, default: 0 },
    employee: { type: Schema.Types.ObjectId, ref: "Employee" },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0 },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);
export const EmployeeModel = model("Employee", employeeSchema);
export const EmployeeSessionModel = model("EmployeeSession", sessionSchema);
export const EmployeeOtpModel = model("EmployeeOtp", otpSchema);
