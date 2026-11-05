import { publishedSop, publishedSopPipeline } from "./sop-access.service.js";
import { literalSearch } from "../utils/literal-search.js";
import { authorizeAttachments } from "./media/media.service.js";
import { z } from "zod";
import type { ClientSession } from "mongoose";
import { EmployeeModel } from "../models/employee.model.js";
import {
  SopDocumentModel,
  SopVersionModel,
  SopAcknowledgmentModel,
} from "../models/sop-document.model.js";
import { ApprovalRequestModel } from "../models/approval-request.model.js";
import { ApiError } from "../utils/api-error.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import {
  sopCreateSchema,
  sopUpdateSchema,
  type OperationPage,
} from "../validators/operations.validator.js";
import { audit, permit, type OperationsContext } from "./operations-context.js";
const readable = async (
  ctx: OperationsContext,
  id: string,
  session?: ClientSession,
) => {
  permit(ctx, "sop.view");
  const sop = await SopDocumentModel.findById(id).session(session ?? null);
  if (!sop) throw new ApiError(404, "SOP not found");
  if (ctx.actor.kind === "employee") {
    const employee = await EmployeeModel.findById(ctx.actor.id).session(
      session ?? null,
    );
    if (!employee) throw new ApiError(404, "SOP not found");
    const publication = await publishedSop(id, employee.role, session);
    if (!publication) throw new ApiError(404, "SOP not found");
    return publication;
  }
  return sop;
};
export const SopService = {
  async list(ctx: OperationsContext, page: OperationPage): Promise<unknown> {
    permit(ctx, "sop.view");
    const employee =
      ctx.actor.kind === "employee"
        ? await EmployeeModel.findById(ctx.actor.id)
        : null;
    const scope = employee
      ? {
          status: "PUBLISHED",
          $or: [{ roles: { $size: 0 } }, { roles: employee.role }],
        }
      : {};
    const q = page.q
      ? {
          title: {
            $regex: literalSearch(page.q),
            $options: "i",
          },
        }
      : {};
    if (employee) {
      const [result] = await SopVersionModel.aggregate([
        ...publishedSopPipeline(employee.role),
        { $match: q },
        { $sort: { updatedAt: -1 } },
        {
          $facet: {
            items: [
              { $skip: (page.page - 1) * page.limit },
              { $limit: page.limit },
            ],
            count: [{ $count: "total" }],
          },
        },
      ]);
      const total = result?.count[0]?.total ?? 0;
      return {
        items: result?.items ?? [],
        total,
        page: page.page,
        pages: Math.ceil(total / page.limit),
      };
    }
    const filter = { ...scope, ...q };
    const [items, total] = await Promise.all([
      SopDocumentModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      SopDocumentModel.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async detail(ctx: OperationsContext, id: string): Promise<unknown> {
    return readable(ctx, id);
  },
  async create(
    ctx: OperationsContext,
    input: z.input<typeof sopCreateSchema>,
  ): Promise<unknown> {
    permit(ctx, "sop.create");
    input = sopCreateSchema.parse(input);
    return withMongoTransaction(async (session) => {
      await authorizeAttachments(ctx, input.attachments ?? [], session);
      const [sop] = await SopDocumentModel.create(
        [{ ...input, creator: ctx.actor.id }],
        { session },
      );
      await audit(ctx, "sop.created", sop.id, "Draft SOP created", session);
      return sop;
    });
  },
  async update(
    ctx: OperationsContext,
    id: string,
    input: z.infer<typeof sopUpdateSchema>,
  ): Promise<unknown> {
    permit(ctx, "sop.create");
    return withMongoTransaction(async (session) => {
      const { version, ...changes } = input;
      if (changes.attachments)
        await authorizeAttachments(ctx, changes.attachments, session);
      const sop = await SopDocumentModel.findOneAndUpdate(
        { _id: id, version },
        { $set: { ...changes, status: "DRAFT" }, $inc: { version: 1 } },
        { new: true, session },
      );
      if (!sop) throw new ApiError(409, "SOP changed; reload");
      await audit(
        ctx,
        "sop.revised",
        id,
        "Draft revision saved; publish before employee access",
        session,
      );
      return sop;
    });
  },
  async publish(
    ctx: OperationsContext,
    id: string,
    version: number,
  ): Promise<unknown> {
    permit(ctx, "sop.publish");
    const target = await SopDocumentModel.findById(id);
    if (target?.kind !== "GENERAL")
      throw new ApiError(
        409,
        "Product and packaging SOP publication requires independent approval",
      );
    return withMongoTransaction(async (session) => {
      const sop = await SopDocumentModel.findOneAndUpdate(
        { _id: id, version, status: "DRAFT" },
        {
          $set: { status: "PUBLISHED", publishedVersion: version + 1 },
          $inc: { version: 1 },
        },
        { new: true, session },
      );
      if (!sop) throw new ApiError(409, "SOP changed or is not a draft");
      await SopVersionModel.create(
        [
          {
            document: id,
            version: sop.version,
            snapshot: sop.toObject(),
            publisher: ctx.actor.id,
          },
        ],
        { session },
      );
      await audit(
        ctx,
        "sop.published",
        id,
        `Version ${sop.version} published`,
        session,
      );
      return sop;
    });
  },
  async requestPublication(
    ctx: OperationsContext,
    id: string,
    version: number,
  ): Promise<unknown> {
    permit(ctx, "sop.create");
    return withMongoTransaction(async (session) => {
      const sop = await SopDocumentModel.findOneAndUpdate(
        { _id: id, version, status: "DRAFT" },
        { $set: { status: "REVIEW" }, $inc: { version: 1 } },
        { new: true, session },
      );
      if (!sop) throw new ApiError(409, "Current draft required");
      const [request] = await ApprovalRequestModel.create(
        [
          {
            kind: "sop_publication",
            entity: id,
            requester: ctx.actor.id,
            expectedEntityVersion: sop.version,
            proposed: { title: sop.title },
            existing: { title: sop.title },
            reason: "Review SOP publication",
            evidence: sop.attachments,
          },
        ],
        { session },
      );
      await audit(
        ctx,
        "sop.publication_requested",
        id,
        "Independent publication review requested",
        session,
      );
      return request;
    });
  },
  async archive(
    ctx: OperationsContext,
    id: string,
    version: number,
  ): Promise<void> {
    permit(ctx, "sop.publish");
    await withMongoTransaction(async (session) => {
      const sop = await SopDocumentModel.findOneAndUpdate(
        { _id: id, version },
        { $set: { status: "ARCHIVED" }, $inc: { version: 1 } },
        { session },
      );
      if (!sop) throw new ApiError(409, "SOP changed");
      await audit(ctx, "sop.archived", id, "SOP archived", session);
      return true;
    });
  },
  async acknowledge(
    ctx: OperationsContext,
    id: string,
    version: number,
  ): Promise<void> {
    await withMongoTransaction(async (session) => {
      const sop = await readable(ctx, id, session);
      if (sop.status !== "PUBLISHED" || sop.version !== version)
        throw new ApiError(409, "Read the current published version");
      const current = await SopDocumentModel.updateOne(
        { _id: id, publishedVersion: version, status: { $ne: "ARCHIVED" } },
        { $inc: { ackRevision: 1 } },
        { session },
      );
      if (!current.modifiedCount)
        throw new ApiError(409, "Published SOP changed");
      const result = await SopAcknowledgmentModel.updateOne(
        { document: id, version, employee: ctx.actor.id },
        { $setOnInsert: { acknowledgedAt: new Date() } },
        { upsert: true, session },
      );
      if (result.upsertedCount)
        await audit(
          ctx,
          "sop.acknowledged",
          id,
          `Version ${version} acknowledged`,
          session,
        );
      return true;
    });
  },
  async history(ctx: OperationsContext, id: string): Promise<unknown> {
    await readable(ctx, id);
    const rows = await SopVersionModel.find({ document: id })
      .sort({ version: -1 })
      .lean();
    if (ctx.actor.kind === "employee")
      return rows.map((r) => ({ version: r.version, createdAt: r.createdAt }));
    return rows;
  },
  async suggest(
    ctx: OperationsContext,
    id: string,
    input: { version: number; body: string; reason: string },
  ): Promise<unknown> {
    return withMongoTransaction(async (session) => {
      const sop = await readable(ctx, id, session);
      if (sop.version !== input.version) throw new ApiError(409, "SOP changed");
      const [approval] = await ApprovalRequestModel.create(
        [
          {
            kind: "sop_change",
            entity: id,
            requester: ctx.actor.id,
            expectedEntityVersion: input.version,
            reason: input.reason,
            proposed: { body: input.body },
            existing: { version: sop.version },
          },
        ],
        { session },
      );
      await audit(
        ctx,
        "sop.change_requested",
        id,
        "SOP improvement awaiting review",
        session,
      );
      return approval;
    });
  },
};
