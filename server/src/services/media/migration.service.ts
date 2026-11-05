import { env } from "../../config/env.js";
import { readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import {
  MediaAssetModel,
  MediaMigrationModel,
} from "../../models/media-asset.model.js";
import { redis } from "../../config/redis.js";
import { ApiError } from "../../utils/api-error.js";
import {
  permit,
  audit,
  type OperationsContext,
} from "../operations-context.js";
import { MediaService, mediaProvider } from "./media.service.js";
export const migrationEntrySchema = z
  .object({
    source: z
      .string()
      .max(2000)
      .refine(
        (s) =>
          s.startsWith("fixture:") ||
          (() => {
            try {
              return new URL(s).hostname === "res.cloudinary.com";
            } catch {
              return false;
            }
          })(),
      ),
    file: z.string().min(1),
    contentType: z.string().max(100),
    visibility: z.enum(["public", "private"]),
    associations: z.array(z.string().max(500)).default([]),
    synthetic: z.literal(true),
  })
  .strict();
export type MigrationEntry = z.infer<typeof migrationEntrySchema>;
export const MediaMigrationService = {
  async migrate(
    ctx: OperationsContext,
    entry: MigrationEntry,
    allowedRoot: string,
  ): Promise<{
    source: string;
    status: string;
    asset?: string;
    bytes?: number;
    error?: string;
  }> {
    permit(ctx, "media.manage");
    if (
      mediaProvider().name !== "local" &&
      (env.APP_ENV !== "staging" ||
        process.env.CRUISIN_R2_MIGRATION_APPROVED !== "true")
    )
      throw new ApiError(
        403,
        "Remote migration requires a separately approved isolated staging execution",
      );
    const lock = `media:migrate:${createHash("sha256").update(entry.source).digest("hex")}`;
    if (!(await redis.setIfAbsent(lock, "working", 120)))
      throw new ApiError(409, "Migration already in progress");
    try {
      const root = await realpath(allowedRoot);
      const file = await realpath(resolve(root, entry.file));
      if (!file.startsWith(root + "/"))
        throw new ApiError(
          403,
          "Fixture is outside the approved synthetic directory",
        );
      const body = await readFile(file);
      const hash = createHash("sha256").update(body).digest("hex");
      const existing = await MediaMigrationModel.findOne({
        source: entry.source,
      });
      if (existing?.status === "VERIFIED") {
        if (existing.sourceSha256 !== hash)
          throw new ApiError(409, "Source changed since migration");
        const asset = await MediaAssetModel.findById(existing.asset);
        if (!asset) throw new ApiError(409, "Migrated metadata missing");
        const stored = await MediaService.content(asset.id, ctx);
        if (createHash("sha256").update(stored.body).digest("hex") !== hash)
          throw new ApiError(409, "Migrated object checksum mismatch");
        return {
          source: entry.source,
          status: "VERIFIED",
          asset: asset.id,
          bytes: body.length,
        };
      }
      await MediaMigrationModel.updateOne(
        { source: entry.source },
        {
          $set: {
            status: "PENDING",
            sourceSha256: hash,
            bytes: body.length,
            associations: entry.associations,
          },
        },
        { upsert: true },
      );
      const duplicate = await MediaAssetModel.findOne({
        owner: ctx.actor.id,
        sha256: hash,
        visibility: entry.visibility,
        provider: "local",
        deletedAt: { $exists: false },
      });
      const asset =
        duplicate ??
        ((await MediaService.upload(ctx, {
          name: entry.file.split("/").pop() ?? "fixture",
          body,
          contentType: entry.contentType,
          visibility: entry.visibility,
        })) as { _id: Types.ObjectId });
      await MediaMigrationModel.updateOne(
        { source: entry.source },
        {
          $set: {
            status: "VERIFIED",
            asset: asset._id,
            sourceSha256: hash,
            bytes: body.length,
          },
          $unset: { failure: 1 },
        },
      );
      await audit(
        ctx,
        "media.migrated",
        String(asset._id),
        "Synthetic source imported and checksum verified",
      );
      return {
        source: entry.source,
        status: "VERIFIED",
        asset: String(asset._id),
        bytes: body.length,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Migration failed";
      const previous = await MediaMigrationModel.findOne({
        source: entry.source,
      });
      if (previous?.status !== "VERIFIED")
        await MediaMigrationModel.updateOne(
          { source: entry.source },
          { $set: { status: "FAILED", failure: message.slice(0, 300) } },
          { upsert: true },
        );
      return { source: entry.source, status: "FAILED", error: message };
    } finally {
      await redis.del(lock);
    }
  },
};
