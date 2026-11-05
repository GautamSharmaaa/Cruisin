import {ReturnRequestModel} from "../../models/return-request.model.js";
import {UnitInspectionModel,OperationsExceptionModel} from "../../models/physical-unit.model.js";
import { PhysicalUnitModel } from "../../models/physical-unit.model.js";
import { FulfillmentRecordModel } from "../../models/fulfillment-record.model.js";
import { ApprovalRequestModel } from "../../models/approval-request.model.js";
import { publishedSopPipeline } from "../sop-access.service.js";
import {
  createHash,
  createHmac,
  timingSafeEqual,
  randomBytes,
  randomUUID,
} from "node:crypto";
import type { ClientSession } from "mongoose";
import { env } from "../../config/env.js";
import {
  MediaAssetModel,
  MediaAccessGrantModel,
} from "../../models/media-asset.model.js";
import { EmployeeTaskModel } from "../../models/employee-task.model.js";
import {
  SopDocumentModel,
  SopVersionModel,
} from "../../models/sop-document.model.js";
import {
  EmployeeModel,
  EmployeeSessionModel,
} from "../../models/employee.model.js";
import { UserModel } from "../../models/user.model.js";
import { ApiError } from "../../utils/api-error.js";
import { sha256 } from "../../utils/generate-token.js";
import {
  audit,
  permit,
  type OperationsContext,
} from "../operations-context.js";
import {
  LocalStorageProvider,
  R2StorageProvider,
  type StorageProvider,
} from "./storage-provider.js";
const localProvider = new LocalStorageProvider();
export const mediaProvider = (): StorageProvider => {
  if ((process.env.MEDIA_PROVIDER ?? "local") === "local") return localProvider;
  if (process.env.MEDIA_PROVIDER !== "r2")
    throw new ApiError(503, "Unsupported media provider");
  return new R2StorageProvider({
    endpoint: process.env.R2_ENDPOINT ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    publicBucket: process.env.R2_PUBLIC_BUCKET ?? "",
    privateBucket: process.env.R2_PRIVATE_BUCKET ?? "",
    approved: process.env.CRUISIN_R2_REMOTE_APPROVED === "true",
  });
};
export const validateMediaFile = (body: Buffer, contentType: string): void => {
  if (body.length === 0 || body.length > 16 * 1024 * 1024)
    throw new ApiError(400, "File must be between 1 byte and 16 MB");
  const signatures: Record<string, () => boolean> = {
    "image/png": () =>
      body
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/jpeg": () => body[0] === 255 && body[1] === 216 && body[2] === 255,
    "image/webp": () =>
      body.toString("ascii", 0, 4) === "RIFF" &&
      body.toString("ascii", 8, 12) === "WEBP",
    "application/pdf": () => body.toString("ascii", 0, 5) === "%PDF-",
    "video/mp4": () => body.toString("ascii", 4, 8) === "ftyp",
  };
  if (!signatures[contentType]?.())
    throw new ApiError(400, "File type or signature is unsupported");
};
const ownedOrVisible = async (ctx: OperationsContext, id: string) => {
  const asset = await MediaAssetModel.findOne({
    _id: id,
    deletedAt: { $exists: false },
  });
  if (!asset) throw new ApiError(404, "Media not found");
  if (
    asset.visibility === "public" ||
    asset.owner === ctx.actor.id ||
    ctx.actor.permissions.includes("media.manage")
  )
    return asset;
  if (ctx.actor.kind === "employee") {
    const reviewKinds = [
      ...(ctx.actor.permissions.includes("inventory.adjust.approve")
        ? ["inventory"]
        : []),
      ...(ctx.actor.permissions.includes("tasks.approve")
        ? ["task", "inspection"]
        : []),
      ...(ctx.actor.permissions.includes("sop.publish") ? ["sop_change"] : []),
      ...(ctx.actor.permissions.includes("orders.update")
        ? ["order_exception"]
        : []),
    ];
    if (
      await ApprovalRequestModel.exists({
        kind: { $in: reviewKinds },
        $or: [{ evidence: id }, { "proposed.attachments": id }],
      })
    )
      return asset;
    const employee = await EmployeeModel.findById(ctx.actor.id);
    const task = await EmployeeTaskModel.exists({
      assignees: ctx.actor.id,
      attachments: id,
    });
    const sop = employee
      ? await SopVersionModel.aggregate([
          ...publishedSopPipeline(employee.role),
          { $match: { attachments: id } },
          { $limit: 1 },
        ])
      : [];
    if (task || sop.length) return asset;
    const assigned = await EmployeeTaskModel.find({
      assignees: ctx.actor.id,
      status: { $ne: "CANCELLED" },
    })
      .select("unit order")
      .lean();
    const unitEvidence = await PhysicalUnitModel.exists({
      $or: [{ "qc.evidence": id }, { "packaging.evidence": id }],
      $and: [
        {
          $or: [
            { unitId: { $in: assigned.map((t) => t.unit) } },
            { order: { $in: assigned.map((t) => t.order) } },
          ],
        },
      ],
    });
    const parcelEvidence = await FulfillmentRecordModel.exists({
      order: { $in: assigned.map((t) => t.order) },
      evidence: id,
    });
    const historical=await UnitInspectionModel.exists({unitId:{$in:assigned.map(t=>t.unit).filter(Boolean)},"snapshot.evidence":id});
    if (unitEvidence || parcelEvidence||historical) return asset;
  }
  throw new ApiError(404, "Media not found");
};
export const authorizeAttachments = async (
  ctx: OperationsContext,
  ids: string[],
  session?: ClientSession,
): Promise<void> => {
  if (!ids.length) return;
  const found = await MediaAssetModel.countDocuments({
    _id: { $in: ids },
    deletedAt: { $exists: false },
    ...(ctx.actor.permissions.includes("media.manage")
      ? {}
      : { $or: [{ owner: ctx.actor.id }, { visibility: "public" }] }),
  }).session(session ?? null);
  if (found !== new Set(ids).size)
    throw new ApiError(403, "Attachment access denied");
};
export const transformedMediaUrl = (
  base: string,
  key: string,
  width: number,
): string => {
  if (![320, 640, 960, 1280, 1920].includes(width))
    throw new ApiError(400, "Unsupported image width");
  const url = new URL(base);
  if (url.protocol !== "https:")
    throw new ApiError(400, "Image delivery requires HTTPS");
  return `${url.origin}/cdn-cgi/image/width=${width},fit=scale-down,format=auto/${key.split("/").map(encodeURIComponent).join("/")}`;
};
export const returnEvidenceMediaUrl = (id: string): string => {
  const expires = Date.now() + 300000;
  const signature = createHmac("sha256", env.JWT_REFRESH_SECRET)
    .update(`return-media:${id}:${expires}`)
    .digest("hex");
  const origin =
    process.env.PUBLIC_API_ORIGIN ??
    (env.APP_ENV === "development" ? `http://127.0.0.1:${env.PORT}` : "");
  if (!origin) throw new ApiError(503, "Public API origin required");
  return `${origin}/api/v1/media/${id}/return-evidence?expires=${expires}&signature=${signature}`;
};
export const MediaService = {
  async uploadCustomerEvidence(
    file: Express.Multer.File,
    customerId: string,
  ): Promise<{ id: string }> {
    validateMediaFile(file.buffer, file.mimetype);
    if (!file.mimetype.startsWith("image/"))
      throw new ApiError(400, "Return evidence must be an image");
    const provider = mediaProvider();
    const hash = createHash("sha256").update(file.buffer).digest("hex");
    const key = `${randomUUID()}/${hash}`;
    await provider.put(
      key,
      file.buffer,
      { bytes: file.buffer.length, sha256: hash, contentType: file.mimetype },
      "private",
    );
    const stored = await provider.get(key, "private");
    if (createHash("sha256").update(stored).digest("hex") !== hash)
      throw new ApiError(502, "Evidence verification failed");
    const asset = await MediaAssetModel.create({
      provider: provider.name,
      key,
      owner: customerId,
      ownerKind: "customer",
      visibility: "private",
      name: "return-evidence",
      contentType: file.mimetype,
      bytes: file.buffer.length,
      sha256: hash,
    });
    return { id: asset.id };
  },
  async returnEvidenceContent(
    id: string,
    expires: number,
    signature: string,
  ): Promise<{ body: Buffer; contentType: string }> {
    const expected = createHmac("sha256", env.JWT_REFRESH_SECRET)
      .update(`return-media:${id}:${expires}`)
      .digest("hex");
    if (
      expires < Date.now() ||
      expires > Date.now() + 300000 ||
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      throw new ApiError(404, "Evidence authorization expired");
    const asset = await MediaAssetModel.findOne({
      _id: id,
      visibility: "private",
      ownerKind: "customer",
      deletedAt: { $exists: false },
    });
    if (
      !asset ||
      !(await UserModel.exists({
        _id: asset.owner,
        isActive: true,
        status: "active",
      }))
    )
      throw new ApiError(404, "Evidence not found");
    const provider =
      asset.provider === "local" ? localProvider : mediaProvider();
    return {
      body: await provider.get(asset.key, "private"),
      contentType: asset.contentType,
    };
  },
  async upload(
    ctx: OperationsContext,
    input: {
      name: string;
      contentType: string;
      body: Buffer;
      visibility: "public" | "private";
    },
  ): Promise<unknown> {
    if (input.visibility === "public") permit(ctx, "media.manage");
    else if (
      !ctx.actor.permissions.some((p) =>
        [
          "tasks.update",
          "sop.create",
          "inventory.adjust.request",
          "media.manage",
        ].includes(p),
      )
    )
      throw new ApiError(403, "Upload permission required");
    validateMediaFile(input.body, input.contentType);
    const provider = mediaProvider();
    const hash = createHash("sha256").update(input.body).digest("hex");
    const key = `${randomUUID()}/${hash}`;
    await provider.put(
      key,
      input.body,
      {
        bytes: input.body.length,
        sha256: hash,
        contentType: input.contentType,
      },
      input.visibility,
    );
    const check = await provider.head(key, input.visibility);
    if (
      check.bytes !== input.body.length ||
      createHash("sha256")
        .update(await provider.get(key, input.visibility))
        .digest("hex") !== hash
    )
      throw new ApiError(502, "Uploaded object verification failed");
    const asset = await MediaAssetModel.create({
      provider: provider.name,
      key,
      owner: ctx.actor.id,
      ownerKind: ctx.actor.kind,
      visibility: input.visibility,
      name: input.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120),
      contentType: input.contentType,
      bytes: input.body.length,
      sha256: hash,
    });
    await audit(
      ctx,
      "media.uploaded",
      asset.id,
      `${input.visibility} media uploaded and checksum verified`,
    );
    return asset;
  },
  async metadata(ctx: OperationsContext, id: string): Promise<unknown> {
    return ownedOrVisible(ctx, id);
  },
  async content(
    id: string,
    ctx?: OperationsContext,
  ): Promise<{ body: Buffer; contentType: string; visibility: string }> {
    const asset = ctx
      ? await ownedOrVisible(ctx, id)
      : await MediaAssetModel.findOne({
          _id: id,
          visibility: "public",
          deletedAt: { $exists: false },
        });
    if (!asset || asset.provider === "cloudinary")
      throw new ApiError(404, "Media not found");
    const provider =
      asset.provider === "local" ? localProvider : mediaProvider();
    if (provider.name !== asset.provider)
      throw new ApiError(503, "Media provider not configured");
    return {
      body: await provider.get(asset.key, asset.visibility),
      contentType: asset.contentType,
      visibility: asset.visibility,
    };
  },
  async signedAccess(
    ctx: OperationsContext,
    id: string,
    sessionId?: string,
  ): Promise<{ token: string; expiresIn: number }> {
    await ownedOrVisible(ctx, id);
    const token = randomBytes(32).toString("base64url");
    await MediaAccessGrantModel.create({
      tokenHash: sha256(token),
      asset: id,
      owner: ctx.actor.id,
      ownerKind: ctx.actor.kind,
      session: sessionId,
      expiresAt: new Date(Date.now() + 60000),
    });
    return { token, expiresIn: 60 };
  },
  async signedContent(
    id: string,
    token: string,
  ): Promise<{ body: Buffer; contentType: string; visibility: string }> {
    const grant = await MediaAccessGrantModel.findOne({
      asset: id,
      tokenHash: sha256(token),
      expiresAt: { $gt: new Date() },
    });
    if (!grant) throw new ApiError(404, "Media authorization expired");
    if (grant.ownerKind === "employee") {
      const employee = await EmployeeModel.findOne({
        _id: grant.owner,
        active: true,
      });
      const session = await EmployeeSessionModel.exists({
        _id: grant.session,
        employee: grant.owner,
        sessionVersion: employee?.sessionVersion,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      });
      if (!employee || !session)
        throw new ApiError(404, "Media authorization expired");
    } else if (
      !(await UserModel.exists({
        _id: grant.owner,
        isActive: true,
        status: "active",
      }))
    )
      throw new ApiError(404, "Media authorization expired");
    const asset = await MediaAssetModel.findById(id);
    if (!asset) throw new ApiError(404, "Media not found");
    return this.content(id, {
      actor: {
        id: grant.owner,
        kind: grant.ownerKind as "admin" | "employee",
        name: "",
        permissions: grant.ownerKind === "admin" ? ["media.manage"] : [],
      },
      correlationId: randomUUID(),
    });
  },
  async remove(ctx: OperationsContext, id: string): Promise<void> {
    const asset = await ownedOrVisible(ctx, id);
    if (
      !ctx.actor.permissions.includes("media.manage") &&
      asset.owner !== ctx.actor.id
    )
      throw new ApiError(403, "Media deletion denied");
    if (asset.provider === "cloudinary")
      throw new ApiError(403, "Legacy Cloudinary media is read-only");
    if (
      (await PhysicalUnitModel.exists({$or:[{'qc.evidence':id},{'packaging.evidence':id}]}))||
      (await UnitInspectionModel.exists({'snapshot.evidence':id}))||
      (await FulfillmentRecordModel.exists({evidence:id}))||
      (await OperationsExceptionModel.exists({evidence:id}))||
      (await ReturnRequestModel.exists({'evidence.publicId':{$regex:`/media_${asset.id}$`}}))||
      (await EmployeeTaskModel.exists({ attachments: id })) ||
      (await SopDocumentModel.exists({ attachments: id })) ||
      (await SopVersionModel.exists({ "snapshot.attachments": id })) ||
      (await ApprovalRequestModel.exists({
        $or: [{ evidence: id }, { "proposed.attachments": id }],
      }))
    )
      throw new ApiError(409, "Referenced evidence cannot be deleted");
    await MediaAssetModel.updateOne(
      { _id: id },
      { $set: { deletedAt: new Date() } },
    );
    await audit(
      ctx,
      "media.deleted",
      id,
      "Media soft deleted; retained for recovery",
    );
  },
};
