import { Schema, model } from "mongoose";
const assetSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["local", "r2", "cloudinary"],
      required: true,
    },
    key: { type: String, required: true },
    owner: { type: String, required: true, index: true },
    ownerKind: {
      type: String,
      enum: ["admin", "employee", "customer"],
      required: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    contentType: { type: String, required: true },
    bytes: { type: Number, required: true },
    sha256: { type: String, required: true, index: true },
    legacyUrl: { type: String },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);
assetSchema.index({ key: 1, provider: 1 }, { unique: true });
const migrationSchema = new Schema(
  {
    source: { type: String, required: true, unique: true },
    asset: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
    },
    sourceSha256: { type: String },
    bytes: { type: Number },
    failure: { type: String },
    associations: { type: [String], default: [] },
  },
  { timestamps: true },
);
const grantSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    asset: { type: Schema.Types.ObjectId, required: true },
    owner: { type: String, required: true },
    ownerKind: { type: String, required: true },
    session: { type: Schema.Types.ObjectId },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);
export const MediaAssetModel = model("MediaAsset", assetSchema);
export const MediaMigrationModel = model("MediaMigration", migrationSchema);
export const MediaAccessGrantModel = model("MediaAccessGrant", grantSchema);
