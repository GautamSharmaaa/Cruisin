import mongoose, { Types } from "mongoose";
import {
  MediaMigrationModel,
  MediaAssetModel,
} from "../../models/media-asset.model.js";
import { env } from "../../config/env.js";
const mediaFields = new Set([
  "url",
  "image",
  "images",
  "heroImage",
  "mobileHeroImage",
  "bannerImage",
  "mobileBannerImage",
  "videoUrl",
  "mobileVideoUrl",
  "videoPosterImage",
  "mobileVideoPosterImage",
  "ogImage",
  "imageUrl",
  "backgroundVideo","bannerVideo","cardImage","categoryCardImage","categoryVideo","collectionVideo","heroVideo","imageOverride","menuCardImage","mobileBannerVideo","mobileCategoryVideo","mobileCollectionVideo","mobileHeroVideo","mobileImage","mobileImageOverride","mobileMenuCardImage","posterUrl","thumbnailImage",
]);
const sourceUrl = (value: string): boolean => {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      u.hostname === "res.cloudinary.com" &&
      !/\/(authenticated|private)\//.test(u.pathname)
    );
  } catch {
    return false;
  }
};
export const publicMediaUrl = (
  id: string,
  key?: string,
  provider?: string,
): string => {
  if (provider === "r2" && process.env.R2_PUBLIC_DELIVERY_ORIGIN) {
    const u = new URL(process.env.R2_PUBLIC_DELIVERY_ORIGIN);
    if (u.protocol !== "https:")
      throw new Error("R2 public delivery requires HTTPS");
    return `${u.origin}/${key?.split("/").map(encodeURIComponent).join("/")}`;
  }
  const origin =
    process.env.PUBLIC_API_ORIGIN ??
    (env.APP_ENV === "development" ? `http://127.0.0.1:${env.PORT}` : "");
  return `${origin}/api/v1/media/${id}/content`;
};
export const resolvePublicMedia = async (input: unknown): Promise<unknown> => {
  if (process.env.NODE_ENV === "test" && mongoose.connection.readyState !== 1)
    return input;
  const refs = new Set<string>();
  const visit = (
    value: unknown,
    key = "",
    mapping?: Map<string, string>,
  ): unknown => {
    if (typeof value === "string") {
      if (mediaFields.has(key) && sourceUrl(value)) {
        refs.add(value);
        return mapping?.get(value) ?? value;
      }
      return value;
    }
    if (Array.isArray(value)) return value.map((v) => visit(v, key, mapping));
    if (
      value instanceof Types.ObjectId ||
      value instanceof Date ||
      Buffer.isBuffer(value)
    )
      return value;
    if (value instanceof mongoose.Document)
      return visit(value.toObject(), key, mapping);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, visit(v, k, mapping)]),
      );
    return value;
  };
  const normalized = visit(input);
  if (!refs.size) return input;
  const migrations = await MediaMigrationModel.find({
    source: { $in: [...refs] },
    status: "VERIFIED",
  }).lean();
  const assets = await MediaAssetModel.find({
    _id: { $in: migrations.map((m) => m.asset) },
    visibility: "public",
    deletedAt: { $exists: false },
  }).lean();
  const byId = new Map(assets.map((a) => [String(a._id), a]));
  const mapping = new Map<string, string>();
  for (const migration of migrations) {
    const asset = byId.get(String(migration.asset));
    if (asset)
      mapping.set(
        migration.source,
        publicMediaUrl(String(asset._id), asset.key, asset.provider),
      );
  }
  return mapping.size ? visit(normalized, "", mapping) : input;
};
