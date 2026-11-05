import { literalSearch } from "../utils/literal-search.js";
import { stockActor } from "./stock-actor-context.js";
import { authorizeAttachments } from "./media/media.service.js";
import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { z } from "zod";
import QRCode from "qrcode";
import { ReturnRequestModel } from "../models/return-request.model.js";
import { ProductModel } from "../models/product.model.js";
import { OrderModel } from "../models/order.model.js";
import { EmployeeTaskModel } from "../models/employee-task.model.js";
import { ApprovalRequestModel } from "../models/approval-request.model.js";
import {
  StockMovementModel,
  VariantLabelModel,
  PackingVerificationModel,
} from "../models/stock-movement.model.js";
import { ApiError } from "../utils/api-error.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import {
  audit,
  notify,
  permit,
  type OperationsContext,
} from "./operations-context.js";
import {
  adjustmentSchema,
  type OperationPage,
} from "../validators/operations.validator.js";
export const recordOrderStockMovement = async (
  items: Array<{
    product: unknown;
    variant: unknown;
    quantity: number;
    sku?: string;
  }>,
  deltaSign: 1 | -1,
  reason: string,
  reference: string,
  session?: ClientSession,
): Promise<void> => {
  if (process.env.NODE_ENV === "test" && mongoose.connection.readyState !== 1)
    return;
  for (const item of items) {
    const product = await ProductModel.findOne({
      _id: item.product,
      "variants._id": item.variant,
    }).session(session ?? null);
    const variant = product?.variants.find(
      (v) => String(v._id) === String(item.variant),
    );
    if (!product || !variant)
      throw new ApiError(409, "Stock variant disappeared");
    const delta = deltaSign * item.quantity;
    await StockMovementModel.create(
      [
        {
          product: item.product,
          variant: item.variant,
          sku: variant.sku,
          delta,
          reason,
          reference,
          actor: stockActor(),
          before: variant.stock - delta,
          after: variant.stock,
          idempotencyKey: `${reference}:${reason}:${String(item.variant)}:${randomUUID()}`,
        },
      ],
      { session },
    );
  }
};
export const applyStockApproval = async (
  id: string,
  ctx: OperationsContext,
  proposed: unknown,
  session?: ClientSession,
): Promise<void> => {
  const data = adjustmentSchema.parse(proposed);
  const tracked = await ProductModel.findOne({
    _id: data.product,
    variants: { $elemMatch: { _id: data.variant, unitTracked: true } },
  }).session(session ?? null);
  if (tracked)
    throw new ApiError(
      409,
      "Tracked variants require physical unit disposition; quantity-only corrections are prohibited",
    );
  if (data.returnReference) {
    const returned = await ReturnRequestModel.findOne({
      _id: data.returnReference,
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
    }).session(session ?? null);
    const quantity = returned?.items.length
      ? returned.items
          .filter((i) => String(i.variant) === data.variant)
          .reduce((n, i) => n + i.quantity, 0)
      : String(returned?.item?.variant) === data.variant
        ? (returned?.item?.quantity ?? 0)
        : 0;
    if (
      !quantity ||
      data.newStock - data.expectedStock !== quantity ||
      data.damagedDelta
    )
      throw new ApiError(
        409,
        "Return must be inspected and restored exactly once for its received quantity",
      );
    if (
      await StockMovementModel.exists({
        idempotencyKey: `return:${data.returnReference}:${data.variant}`,
      }).session(session ?? null)
    )
      throw new ApiError(409, "Return already restocked");
  }
  const revision =
    data.expectedRevision === 0 ? { $in: [0, null] } : data.expectedRevision;
  const updated = await ProductModel.findOneAndUpdate(
    {
      _id: data.product,
      variants: {
        $elemMatch: {
          _id: new Types.ObjectId(data.variant),
          stock: data.expectedStock,
          stockRevision: revision,
        },
      },
    },
    {
      $set: { "variants.$.stock": data.newStock },
      $inc: {
        "variants.$.stockRevision": 1,
        "variants.$.damagedStock": data.damagedDelta,
      },
    },
    { new: true, session },
  );
  if (!updated)
    throw new ApiError(
      409,
      "Stock changed since request; submit a fresh count",
    );
  const variant = updated.variants.id(data.variant);
  if (!variant) throw new ApiError(409, "Variant not found");
  await StockMovementModel.create(
    [
      {
        product: data.product,
        variant: data.variant,
        sku: variant.sku,
        delta: data.newStock - data.expectedStock,
        reason: data.returnReference
          ? "customer_return"
          : data.damagedDelta
            ? "damaged_product"
            : "approved_manual_adjustment",
        reference: id,
        actor: ctx.actor.id,
        before: data.expectedStock,
        after: data.newStock,
        idempotencyKey: data.returnReference
          ? `return:${data.returnReference}:${data.variant}`
          : `approval:${id}`,
      },
    ],
    { session },
  );
  await audit(
    ctx,
    "inventory.adjusted",
    data.variant,
    "Approved stock correction applied",
    session,
  );
};
const packingAccess = async (
  ctx: OperationsContext,
  orderId: string,
  taskId: string,
  session?: ClientSession,
) => {
  permit(ctx, "orders.pack");
  const task = await EmployeeTaskModel.findOne({
    _id: taskId,
    order: orderId,
    category: "order_packaging",
    ...(ctx.actor.kind === "employee" ? { assignees: ctx.actor.id } : {}),
  }).session(session ?? null);
  if (
    !task ||
    !["ASSIGNED", "IN_PROGRESS", "REWORK_REQUIRED"].includes(task.status)
  )
    throw new ApiError(404, "Active assigned packaging task not found");
  const order = await OrderModel.findOne({
    _id: orderId,
    orderStatus: { $nin: ["cancelled", "delivered", "refunded"] },
  }).session(session ?? null);
  if (!order) throw new ApiError(409, "Order cannot be packed");
  return order;
};
const resolveCode = async (code: string, session?: ClientSession) => {
  const label = await VariantLabelModel.findOne({ code, active: true }).session(
    session ?? null,
  );
  const product = await ProductModel.findOne(
    label
      ? { _id: label.product, "variants._id": label.variant }
      : { "variants.sku": code.toUpperCase() },
  ).session(session ?? null);
  const variant = product?.variants.find((v) =>
    label
      ? String(v._id) === String(label.variant)
      : v.sku === code.toUpperCase(),
  );
  if (!product || !variant || variant.enabled === false)
    throw new ApiError(404, "Active SKU not found");
  return { product, variant };
};
export const InventoryOperationsService = {
  async list(ctx: OperationsContext, page: OperationPage): Promise<unknown> {
    permit(ctx, "inventory.view");
    const escaped = page.q ? literalSearch(page.q) : undefined;
    const match = escaped
      ? { "variants.sku": { $regex: escaped, $options: "i" } }
      : {};
    const pipeline = [
      { $unwind: "$variants" },
      { $match: match },
      { $sort: { "variants.sku": 1 as const, _id: 1 as const } },
      {
        $project: {
          _id: 0,
          product: { $toString: "$_id" },
          variant: { $toString: "$variants._id" },
          title: 1,
          sku: "$variants.sku",
          size: "$variants.size",
          color: "$variants.color",
          available: "$variants.stock",
          damaged: { $ifNull: ["$variants.damagedStock", 0] },
          threshold: {
            $ifNull: ["$variants.lowStockThreshold", "$lowStockThreshold"],
          },
          revision: { $ifNull: ["$variants.stockRevision", 0] },
        },
      },
    ];
    const [result] = await ProductModel.aggregate([
      ...pipeline,
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
    const rows: Record<string, unknown>[] = result.items;
    const variantIds = rows.map(
      (row) => new Types.ObjectId(String(row.variant)),
    );
    const reservations = await OrderModel.aggregate([
      {
        $match: {
          stockReserved: true,
          orderStatus: {
            $nin: ["cancelled", "shipped", "delivered", "returned"],
          },
          "items.variant": { $in: variantIds },
        },
      },
      { $unwind: "$items" },
      { $match: { "items.variant": { $in: variantIds } } },
      { $group: { _id: "$items.variant", total: { $sum: "$items.quantity" } } },
    ]);
    const reserved = new Map(
      reservations.map((r) => [String(r._id), Number(r.total)]),
    );
    for (const row of rows) {
      row.reserved = reserved.get(String(row.variant)) ?? 0;
      if (Number(row.available) <= Number(row.threshold))
        await notify(
          [ctx.actor.id],
          "inventory.low_stock",
          String(row.variant),
          Number(row.revision),
          String(row.sku),
        );
    }
    const total = result.count[0]?.total ?? 0;
    return {
      items: rows,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async requestAdjustment(
    ctx: OperationsContext,
    input: z.infer<typeof adjustmentSchema>,
  ): Promise<unknown> {
    permit(ctx, "inventory.adjust.request");
    if (
      input.returnReference &&
      (await StockMovementModel.exists({
        idempotencyKey: `return:${input.returnReference}:${input.variant}`,
      }))
    )
      throw new ApiError(409, "Return already restocked");
    if (input.damagedDelta > Math.max(0, input.expectedStock - input.newStock))
      throw new ApiError(
        400,
        "Damaged units must be removed from available stock",
      );
    return withMongoTransaction(async (session) => {
      await authorizeAttachments(ctx, input.evidence, session);
      const product = await ProductModel.findById(input.product).session(
        session ?? null,
      );
      const variant = product?.variants.id(input.variant);
      if (
        !variant ||
        variant.stock !== input.expectedStock ||
        (variant.stockRevision ?? 0) !== input.expectedRevision
      )
        throw new ApiError(409, "Inventory changed; reload");
      const [approval] = await ApprovalRequestModel.create(
        [
          {
            kind: "inventory",
            entity: input.variant,
            requester: ctx.actor.id,
            expectedEntityVersion: input.expectedRevision,
            proposed: input,
            existing: {
              stock: variant.stock,
              title: product?.title,
              sku: variant.sku,
            },
            reason: input.reason,
            evidence: input.evidence,
          },
        ],
        { session },
      );
      await audit(
        ctx,
        "inventory.adjustment_requested",
        approval.id,
        "Stock correction awaiting independent approval",
        session,
      );
      return approval;
    });
  },
  async scan(ctx: OperationsContext, code: string): Promise<unknown> {
    permit(ctx, "inventory.view");
    const { product, variant } = await resolveCode(code);
    return {
      product: product.id,
      variant: String(variant._id),
      title: product.title,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      available: variant.stock,
      revision: variant.stockRevision ?? 0,
    };
  },
  async label(
    ctx: OperationsContext,
    productId: string,
    variantId: string,
  ): Promise<unknown> {
    permit(ctx, "inventory.count");
    return withMongoTransaction(async (session) => {
      const product = await ProductModel.findById(productId).session(
        session ?? null,
      );
      const variant = product?.variants.id(variantId);
      if (!variant) throw new ApiError(404, "SKU not found");
      const code = `CRSKU-${randomUUID()}`;
      const [label] = await VariantLabelModel.create(
        [{ code, product: productId, variant: variantId, sku: variant.sku }],
        { session },
      );
      await audit(
        ctx,
        "inventory.label_created",
        label.id,
        "Opaque SKU label generated",
        session,
      );
      return {
        id: label.id,
        code,
        sku: variant.sku,
        svg: await QRCode.toString(code, {
          type: "svg",
          errorCorrectionLevel: "M",
        }),
      };
    });
  },
  async retireLabel(ctx: OperationsContext, id: string): Promise<void> {
    permit(ctx, "inventory.count");
    await withMongoTransaction(async (session) => {
      await VariantLabelModel.updateOne(
        { _id: id },
        { $set: { active: false } },
        { session },
      );
      await audit(
        ctx,
        "inventory.label_retired",
        id,
        "Damaged or missing label retired",
        session,
      );
      return true;
    });
  },
  async order(ctx: OperationsContext, id: string): Promise<unknown> {
    permit(ctx, "orders.view");
    if (
      ctx.actor.kind === "employee" &&
      !(await EmployeeTaskModel.exists({
        order: id,
        assignees: ctx.actor.id,
        status: { $nin: ["CANCELLED", "COMPLETED"] },
      }))
    )
      throw new ApiError(404, "Assigned order not found");
    const order = await OrderModel.findById(id)
      .select(
        "orderNumber orderStatus items.sku items.title items.size items.color items.variant items.quantity",
      )
      .lean();
    if (!order) throw new ApiError(404, "Order not found");
    const packing = await PackingVerificationModel.findOne({
      order: id,
    }).lean();
    return { order, packing };
  },
  async pack(
    ctx: OperationsContext,
    orderId: string,
    input: { task: string; code: string; version: number },
  ): Promise<unknown> {
    return withMongoTransaction(async (session) => {
      const order = await packingAccess(ctx, orderId, input.task, session);
      if (
        await ProductModel.exists({
          variants: {
            $elemMatch: {
              _id: { $in: order.items.map((i) => i.variant) },
              unitTracked: true,
            },
          },
        }).session(session ?? null)
      )
        throw new ApiError(
          409,
          "Use physical unit fulfillment for tracked inventory",
        );
      const { variant } = await resolveCode(input.code, session);
      const requiredQuantity = order.items
        .filter(
          (i) =>
            String(i.variant) === String(variant._id) && i.sku === variant.sku,
        )
        .reduce((total, i) => total + i.quantity, 0);
      if (!requiredQuantity)
        throw new ApiError(409, "Wrong product or size for this order");
      let record = await PackingVerificationModel.findOne({
        order: orderId,
      }).session(session ?? null);
      if (!record) {
        if (input.version !== 0)
          throw new ApiError(409, "Packaging changed; reload");
        [record] = await PackingVerificationModel.create(
          [{ order: orderId, task: input.task }],
          { session },
        );
      }
      if (String(record.task) !== input.task)
        throw new ApiError(409, "This order has another packaging task");
      if (record.version !== input.version || record.completedAt)
        throw new ApiError(409, "Packaging changed; reload");
      const packed = record.items.find((i) => i.sku === variant.sku);
      if ((packed?.quantity ?? 0) >= requiredQuantity)
        throw new ApiError(409, "Required quantity already scanned");
      if (packed) packed.quantity = (packed.quantity ?? 0) + 1;
      else record.items.push({ sku: variant.sku, quantity: 1 });
      record.version += 1;
      await record.save({ session });
      await audit(
        ctx,
        "order.item_scanned",
        orderId,
        "Order SKU and quantity verified",
        session,
      );
      return record;
    });
  },
  async completePacking(
    ctx: OperationsContext,
    orderId: string,
    input: { task: string; version: number },
  ): Promise<unknown> {
    return withMongoTransaction(async (session) => {
      const order = await packingAccess(ctx, orderId, input.task, session);
      if (
        await ProductModel.exists({
          variants: {
            $elemMatch: {
              _id: { $in: order.items.map((i) => i.variant) },
              unitTracked: true,
            },
          },
        }).session(session ?? null)
      )
        throw new ApiError(
          409,
          "Use physical unit fulfillment for tracked inventory",
        );
      const record = await PackingVerificationModel.findOne({
        order: orderId,
        task: input.task,
        version: input.version,
        completedAt: { $exists: false },
      }).session(session ?? null);
      const required = new Map<string, number>();
      for (const item of order.items)
        required.set(item.sku, (required.get(item.sku) ?? 0) + item.quantity);
      if (
        !record ||
        [...required].some(
          ([sku, quantity]) =>
            record.items.find((p) => p.sku === sku)?.quantity !== quantity,
        )
      )
        throw new ApiError(
          409,
          "Scan every required item before completing packaging",
        );
      record.completedAt = new Date();
      record.completedBy = ctx.actor.id;
      record.version += 1;
      await record.save({ session });
      await OrderModel.updateOne(
        { _id: orderId },
        {
          $set: {
            packingVerifiedAt: record.completedAt,
            ...(order.fulfillmentStatus === "unfulfilled"
              ? { fulfillmentStatus: "pending_logistics" }
              : {}),
          },
          $push: {
            timeline: {
              status: "packing_verified",
              timestamp: new Date(),
              note: "SKU/size/quantity verified; shipping state unchanged",
            },
          },
        },
        { session },
      );
      await audit(
        ctx,
        "order.packing_verified",
        orderId,
        "Packaging verified; no shipment or payment operation triggered",
        session,
      );
      return record;
    });
  },
};
