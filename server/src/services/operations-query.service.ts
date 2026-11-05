import { EmployeeTaskService } from "./employee-task.service.js";
import { PhysicalUnitModel } from "../models/physical-unit.model.js";
import { ApprovalRequestModel } from "../models/approval-request.model.js";
import { ReturnRequestModel } from "../models/return-request.model.js";
import { ProductModel } from "../models/product.model.js";
import { OrderModel } from "../models/order.model.js";
import { EmployeeTaskModel } from "../models/employee-task.model.js";
import { literalSearch } from "../utils/literal-search.js";
import { randomBytes } from "node:crypto";
import {
  EmployeeModel,
  EmployeeSessionModel,
} from "../models/employee.model.js";
import {
  OperationsAuditModel,
  OperationsNotificationModel,
} from "../models/operations-event.model.js";
import { StockMovementModel } from "../models/stock-movement.model.js";
import { MediaAssetModel } from "../models/media-asset.model.js";
import { sha256 } from "../utils/generate-token.js";
import { audit, permit, type OperationsContext } from "./operations-context.js";
import { ApiError } from "../utils/api-error.js";
import type { OperationPage } from "../validators/operations.validator.js";
import { effectivePermissions } from "./employee-auth.service.js";
import type { EmployeeRole } from "@cruisin/contracts";
export const OperationsQueryService = {
  async summary(ctx: OperationsContext) {
    permit(ctx, "tasks.view");
    const kinds = [
      ...(ctx.actor.permissions.includes("tasks.approve")
        ? ["task", "inspection"]
        : []),
      ...(ctx.actor.permissions.includes("inventory.adjust.approve")
        ? ["inventory", "qc_override"]
        : []),
      ...(ctx.actor.permissions.includes("sop.publish")
        ? ["sop_change", "sop_publication"]
        : []),
    ];
    const [tasks, unreadNotifications, pendingApprovals, unitStates, lowStock] =
      await Promise.all([
        EmployeeTaskService.summary(ctx),
        OperationsNotificationModel.countDocuments({
          recipient: ctx.actor.id,
          readAt: { $exists: false },
        }),
        ApprovalRequestModel.countDocuments({
          status: "PENDING",
          ...(ctx.actor.kind === "admin"
            ? {}
            : { $or: [{ requester: ctx.actor.id }, { kind: { $in: kinds } }] }),
        }),
        ctx.actor.permissions.includes("inventory.view")
          ? PhysicalUnitModel.aggregate([
              { $group: { _id: "$state", count: { $sum: 1 } } },
            ])
          : [],
        ctx.actor.permissions.includes("inventory.view")
          ? ProductModel.aggregate([
              { $unwind: "$variants" },
              {
                $match: {
                  $expr: {
                    $lte: [
                      "$variants.stock",
                      { $ifNull: ["$variants.lowStockThreshold", 10] },
                    ],
                  },
                },
              },
              { $count: "count" },
            ])
          : [],
      ]);
    return {
      tasks,
      unreadNotifications,
      pendingApprovals,
      unitStates,
      lowStockVariants: lowStock[0]?.count ?? 0,
    };
  },

  async inspectedReturns(
    ctx: OperationsContext,
    variant: string,
  ): Promise<unknown> {
    permit(ctx, "inventory.adjust.request");
    const movements = await StockMovementModel.find({
      variant,
      reason: "customer_return",
    })
      .select("idempotencyKey")
      .lean();
    return ReturnRequestModel.find({
      _id: { $nin: movements.map((m) => m.idempotencyKey.split(":")[1]) },
      qualityCheckedAt: { $exists: true },
      status: {
        $in: [
          "quality_check_passed",
          "refund_window_open",
          "refund_pending",
          "refunded",
          "closed",
        ],
      },
      $or: [{ "item.variant": variant }, { "items.variant": variant }],
    })
      .select("_id requestNumber")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  },

  async productOptions(ctx: OperationsContext): Promise<unknown> {
    permit(ctx, "inventory.view");
    return ProductModel.find({ isArchived: { $ne: true } })
      .select("_id title")
      .sort({ title: 1 })
      .limit(500)
      .lean();
  },
  async orderOptions(ctx: OperationsContext): Promise<unknown> {
    permit(ctx, "orders.view");
    const tasks =
      ctx.actor.kind === "employee"
        ? await EmployeeTaskModel.find({
            assignees: ctx.actor.id,
            order: { $exists: true },
            status: { $nin: ["COMPLETED", "CANCELLED"] },
          })
            .select("order")
            .lean()
        : null;
    return OrderModel.find(
      tasks
        ? { _id: { $in: tasks.map((t) => t.order) } }
        : { orderStatus: { $nin: ["cancelled", "delivered"] } },
    )
      .select("_id orderNumber items.title")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
  },

  async employees(
    ctx: OperationsContext,
    page: OperationPage,
  ): Promise<unknown> {
    permit(ctx, "employees.manage");
    const filter = page.q
      ? {
          name: {
            $regex: literalSearch(page.q),
            $options: "i",
          },
        }
      : {};
    const [items, total] = await Promise.all([
      EmployeeModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      EmployeeModel.countDocuments(filter),
    ]);
    return {
      items: items.map((e) => ({
        ...e,
        permissions: effectivePermissions(
          e.role as EmployeeRole,
          e.grants,
          e.denials,
        ),
      })),
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async staffOptions(ctx: OperationsContext): Promise<unknown> {
    permit(ctx, "tasks.assign");
    return EmployeeModel.find({ active: true })
      .select("_id employeeId name")
      .sort({ name: 1 })
      .limit(500)
      .lean();
  },
  async activity(
    ctx: OperationsContext,
    page: OperationPage,
  ): Promise<unknown> {
    if (ctx.actor.kind === "admin") permit(ctx, "employees.manage");
    const filter = ctx.actor.kind === "employee" ? { actor: ctx.actor.id } : {};
    const [items, total] = await Promise.all([
      OperationsAuditModel.find(filter)
        .sort({ at: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      OperationsAuditModel.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async notifications(
    ctx: OperationsContext,
    page: OperationPage,
  ): Promise<unknown> {
    const filter = { recipient: ctx.actor.id };
    const [items, total] = await Promise.all([
      OperationsNotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      OperationsNotificationModel.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async readNotification(ctx: OperationsContext, id: string): Promise<void> {
    await OperationsNotificationModel.updateOne(
      { _id: id, recipient: ctx.actor.id },
      { $set: { readAt: new Date() } },
    );
  },
  async sessions(ctx: OperationsContext): Promise<unknown> {
    return EmployeeSessionModel.find({
      employee: ctx.actor.id,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .select("_id device createdAt expiresAt")
      .lean();
  },
  async me(ctx: OperationsContext, sessionId: string): Promise<unknown> {
    const e = await EmployeeModel.findOne({
      _id: ctx.actor.id,
      active: true,
    }).lean();
    if (!e) throw new ApiError(401, "Employee sign-in required");
    const csrf = randomBytes(32).toString("base64url");
    await EmployeeSessionModel.updateOne(
      { _id: sessionId, employee: e._id },
      { $set: { csrfHash: sha256(csrf) } },
    );
    return {
      employee: { ...e, permissions: ctx.actor.permissions },
      csrf,
      principal: ctx.actor,
    };
  },
  async profile(ctx: OperationsContext, timezone: string): Promise<void> {
    await EmployeeModel.updateOne(
      { _id: ctx.actor.id },
      { $set: { timezone } },
    );
    await audit(
      ctx,
      "employee.profile_updated",
      ctx.actor.id,
      "Timezone preference updated",
    );
  },
  async ledger(
    ctx: OperationsContext,
    variant: string,
    page: OperationPage,
  ): Promise<unknown> {
    permit(ctx, "inventory.view");
    const filter = { variant };
    const [items, total] = await Promise.all([
      StockMovementModel.find(filter)
        .sort({ at: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      StockMovementModel.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async media(ctx: OperationsContext, page: OperationPage): Promise<unknown> {
    const filter = {
      deletedAt: { $exists: false },
      ...(ctx.actor.permissions.includes("media.manage")
        ? {}
        : { owner: ctx.actor.id }),
    };
    const [items, total] = await Promise.all([
      MediaAssetModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      MediaAssetModel.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
};
