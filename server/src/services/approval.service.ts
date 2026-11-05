import { applyUnitDisposition } from "./physical-units.service.js";
import { ProductModel } from "../models/product.model.js";
import { OrderModel } from "../models/order.model.js";
import { authorizeAttachments } from "./media/media.service.js";
import { generalApprovalSchema } from "../validators/operations.validator.js";
import { z } from "zod";
import { ApprovalRequestModel } from "../models/approval-request.model.js";
import { EmployeeTaskModel } from "../models/employee-task.model.js";
import { SopVersionModel } from "../models/sop-document.model.js";
import { PhysicalUnitModel } from "../models/physical-unit.model.js";
import { SopDocumentModel } from "../models/sop-document.model.js";
import { ApiError } from "../utils/api-error.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import {
  audit,
  notify,
  permit,
  type OperationsContext,
} from "./operations-context.js";
import { applyStockApproval } from "./inventory-operations.service.js";
import type { OperationPage } from "../validators/operations.validator.js";
export const ApprovalService = {
  async request(
    ctx: OperationsContext,
    input: z.infer<typeof generalApprovalSchema>,
  ): Promise<unknown> {
    permit(
      ctx,
      input.kind === "inspection" ? "inventory.count" : "orders.view",
    );
    return withMongoTransaction(async (session) => {
      await authorizeAttachments(ctx, input.evidence, session);
      let existing: Record<string, unknown>;
      let version: number;
      if (input.kind === "inspection") {
        const p = await ProductModel.findById(input.entity).session(
          session ?? null,
        );
        if (!p) throw new ApiError(404, "Product not found");
        existing = { title: p.title };
        version = p.__v;
      } else {
        if (
          ctx.actor.kind === "employee" &&
          !(await EmployeeTaskModel.exists({
            order: input.entity,
            assignees: ctx.actor.id,
            status: { $nin: ["COMPLETED", "CANCELLED"] },
          }).session(session ?? null))
        )
          throw new ApiError(404, "Assigned order not found");
        const o = await OrderModel.findById(input.entity).session(
          session ?? null,
        );
        if (!o) throw new ApiError(404, "Order not found");
        existing = {
          orderStatus: o.orderStatus,
          fulfillmentStatus: o.fulfillmentStatus,
        };
        version = o.__v;
      }
      const [a] = await ApprovalRequestModel.create(
        [
          {
            ...input,
            requester: ctx.actor.id,
            expectedEntityVersion: version,
            existing,
          },
        ],
        { session },
      );
      await audit(ctx, "approval.submitted", a.id, input.kind, session);
      return a;
    });
  },

  async list(ctx: OperationsContext, page: OperationPage): Promise<unknown> {
    const kinds = [
      ...(ctx.actor.permissions.includes("tasks.approve")
        ? ["task", "inspection"]
        : []),
      ...(ctx.actor.permissions.includes("inventory.adjust.approve")
        ? ["inventory", "qc_override", "unit_disposition"]
        : []),
      ...(ctx.actor.permissions.includes("sop.publish")
        ? ["sop_change", "sop_publication"]
        : []),
      ...(ctx.actor.permissions.includes("orders.update")
        ? ["order_exception"]
        : []),
    ];
    const filter = {
      ...(ctx.actor.kind === "employee"
        ? { $or: [{ requester: ctx.actor.id }, { kind: { $in: kinds } }] }
        : {}),
      ...(page.status ? { status: page.status } : {}),
    };
    if (
      ctx.actor.kind === "admin" &&
      !ctx.actor.permissions.some((p) =>
        ["tasks.approve", "inventory.adjust.approve", "sop.publish"].includes(
          p,
        ),
      )
    )
      throw new ApiError(403, "Review permission required");
    const [items, total] = await Promise.all([
      ApprovalRequestModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      ApprovalRequestModel.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async review(
    ctx: OperationsContext,
    id: string,
    input: {
      version: number;
      status: "APPROVED" | "REJECTED" | "REWORK_REQUIRED" | "CANCELLED";
      notes: string;
    },
  ): Promise<unknown> {
    return withMongoTransaction(async (session) => {
      const request = await ApprovalRequestModel.findOne({
        _id: id,
        version: input.version,
        status: "PENDING",
      }).session(session ?? null);
      if (!request)
        throw new ApiError(409, "Approval already reviewed or changed");
      if (input.status === "CANCELLED") {
        if (ctx.actor.id !== request.requester)
          throw new ApiError(403, "Only requester can cancel");
      } else {
        if (ctx.actor.id === request.requester)
          throw new ApiError(403, "Self-approval is prohibited");
        permit(
          ctx,
          request.kind === "inventory" ||
            request.kind === "qc_override" ||
            request.kind === "unit_disposition"
            ? "inventory.adjust.approve"
            : request.kind === "sop_change" ||
                request.kind === "sop_publication"
              ? "sop.publish"
              : request.kind === "order_exception"
                ? "orders.update"
                : "tasks.approve",
        );
      }
      if (request.kind === "sop_publication") {
        const publication = input.status === "APPROVED";
        const sop = await SopDocumentModel.findOneAndUpdate(
          {
            _id: request.entity,
            version: request.expectedEntityVersion,
            status: "REVIEW",
          },
          {
            $set: {
              status: publication ? "PUBLISHED" : "DRAFT",
              ...(publication
                ? { publishedVersion: request.expectedEntityVersion + 1 }
                : {}),
            },
            $inc: { version: 1 },
          },
          { new: true, session },
        );
        if (!sop) throw new ApiError(409, "SOP review version changed");
        if (publication) {
          await SopVersionModel.create(
            [
              {
                document: sop._id,
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
            sop.id,
            `Independently approved version ${sop.version}`,
            session,
          );
        }
      } else if (
        request.kind === "unit_disposition" &&
        input.status === "APPROVED"
      ) {
        await applyUnitDisposition(
          ctx,
          request.entity,
          request.expectedEntityVersion,
          request.proposed,
          session,
        );
      } else if (
        request.kind === "qc_override" &&
        input.status === "APPROVED"
      ) {
        const u = await PhysicalUnitModel.findOneAndUpdate(
          {
            unitId: request.entity,
            version: request.expectedEntityVersion,
            state: { $in: ["QC_FAILED", "QUARANTINED"] },
          },
          {
            $set: { state: "QC_PENDING" },
            $inc: { version: 1 },
            $push: {
              history: {
                action: "unit.rework_approved",
                to: "QC_PENDING",
                actor: ctx.actor.id,
                at: new Date(),
                reason: input.notes,
              },
            },
          },
          { new: true, session },
        );
        if (!u) throw new ApiError(409, "QC state changed");
        await audit(
          ctx,
          "unit.rework_approved",
          u.unitId,
          "Independent QC rework approved; stock remains unavailable",
          session,
        );
      } else if (request.kind === "task") {
        const destination =
          input.status === "APPROVED" ? "APPROVED" : "REWORK_REQUIRED";
        const task = await EmployeeTaskModel.findOneAndUpdate(
          {
            _id: request.entity,
            status: "SUBMITTED",
            version: request.expectedEntityVersion,
            ...(input.status === "APPROVED"
              ? { assignees: { $ne: ctx.actor.id } }
              : {}),
          },
          {
            $set: { status: destination },
            $inc: { version: 1 },
            $push: {
              history: {
                actor: ctx.actor.id,
                action: "reviewed",
                from: "SUBMITTED",
                to: destination,
                at: new Date(),
                reason: input.notes,
              },
            },
          },
          { new: true, session },
        );
        if (!task)
          throw new ApiError(
            409,
            "Task submission changed or reviewer is assigned",
          );
        await notify(
          task.assignees,
          `task.${input.status.toLowerCase()}`,
          task.id,
          task.version,
          input.notes,
          session,
        );
      } else if (input.status === "APPROVED") {
        if (request.kind === "inventory")
          await applyStockApproval(request.id, ctx, request.proposed, session);
        else if (request.kind === "sop_change") {
          const change = z
            .object({ body: z.string().min(3).max(50000) })
            .parse(request.proposed);
          const result = await SopDocumentModel.updateOne(
            { _id: request.entity, version: request.expectedEntityVersion },
            {
              $set: { body: change.body, status: "DRAFT" },
              $inc: { version: 1 },
            },
            { session },
          );
          if (!result.modifiedCount)
            throw new ApiError(409, "SOP changed; resubmit the suggestion");
        } else if (request.kind === "inspection") {
          if (
            !(await ProductModel.exists({
              _id: request.entity,
              __v: request.expectedEntityVersion,
            }).session(session ?? null))
          )
            throw new ApiError(
              409,
              "Product changed; request a new inspection",
            );
        } else if (request.kind === "order_exception") {
          const old = z
            .object({ orderStatus: z.string(), fulfillmentStatus: z.string() })
            .parse(request.existing);
          const note = z
            .object({ note: z.string().min(3).max(2000) })
            .parse(request.proposed);
          const result = await OrderModel.updateOne(
            { _id: request.entity, ...old },
            {
              $push: {
                timeline: {
                  status: "approved_exception_note",
                  timestamp: new Date(),
                  note: note.note,
                },
              },
            },
            { session },
          );
          if (!result.modifiedCount)
            throw new ApiError(409, "Order changed; resubmit the exception");
        } else throw new ApiError(409, "No authorized mutation handler");
      }
      const reviewed = await ApprovalRequestModel.findOneAndUpdate(
        { _id: id, version: input.version, status: "PENDING" },
        {
          $set: {
            status: input.status,
            reviewer: ctx.actor.id,
            reviewedAt: new Date(),
            notes: input.notes,
          },
          $inc: { version: 1 },
        },
        { new: true, session },
      );
      if (!reviewed) throw new ApiError(409, "Approval changed");
      await audit(
        ctx,
        `approval.${input.status.toLowerCase()}`,
        id,
        input.notes,
        session,
      );
      await notify(
        [request.requester],
        `approval.${input.status.toLowerCase()}`,
        id,
        reviewed.version,
        input.notes,
        session,
      );
      return reviewed;
    });
  },
};
