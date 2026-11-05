import { ApprovalRequestModel } from "../models/approval-request.model.js";
import { EmployeeModel } from "../models/employee.model.js";
import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import QRCode from "qrcode";
import { z } from "zod";
import {
  UnitInspectionModel,
  PhysicalUnitModel,
  UnitReceiptModel,
  OperationsExceptionModel,
} from "../models/physical-unit.model.js";
import { ProductModel } from "../models/product.model.js";
import { OrderModel } from "../models/order.model.js";
import { EmployeeTaskModel } from "../models/employee-task.model.js";
import {
  SopDocumentModel,
  SopVersionModel,
} from "../models/sop-document.model.js";
import { StockMovementModel } from "../models/stock-movement.model.js";
import { ReturnRequestModel } from "../models/return-request.model.js";
import { MediaAssetModel } from "../models/media-asset.model.js";
import { ApiError } from "../utils/api-error.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import { authorizeAttachments } from "./media/media.service.js";
import { permit, audit, type OperationsContext } from "./operations-context.js";
import * as v from "../validators/physical-units.validator.js";
import { literalSearch } from "../utils/literal-search.js";
import type { OperationPage } from "../validators/operations.validator.js";
type Unit = InstanceType<typeof PhysicalUnitModel>;
const taskAccess = async (
  ctx: OperationsContext,
  unit: Unit,
  session?: ClientSession,
): Promise<void> => {
  if (ctx.actor.kind === "admin") return;
  const task = await EmployeeTaskModel.exists({
    assignees: ctx.actor.id,
    status: { $in: ["ASSIGNED", "IN_PROGRESS", "REWORK_REQUIRED"] },
    $or: [
      { unit: unit.unitId },
      ...(unit.order ? [{ order: unit.order }] : []),
    ],
  }).session(session ?? null);
  if (!task) throw new ApiError(403, "An active assigned task is required");
};
const get = async (code: string, session?: ClientSession) => {
  const u = await PhysicalUnitModel.findOne({
    $or: [{ unitId: code }, { code }],
  }).session(session ?? null);
  if (!u) throw new ApiError(404, "Physical unit not found");
  return u;
};
const transition = async (
  ctx: OperationsContext,
  u: Unit,
  to: string,
  action: string,
  session?: ClientSession,
  reason = "",
) => {
  const from = u.state;
  u.state = to as typeof u.state;
  u.version++;
  u.history.push({
    action,
    from,
    to,
    actor: ctx.actor.id,
    order: u.order?.toString(),
    shipment: u.shipment?.toString(),
    at: new Date(),
    reason,
  });
  await u.save({ session });
  const product = await ProductModel.findById(u.product).session(
    session ?? null,
  );
  const stock = product?.variants.id(u.variant)?.stock;
  if (stock === undefined)
    throw new ApiError(409, "Variant disappeared during unit transition");
  await StockMovementModel.create(
    [
      {
        product: u.product,
        variant: u.variant,
        unit: u.unitId,
        sku: u.sku,
        delta: 0,
        reason: action,
        reference: u.order?.toString() ?? u.receipt,
        actor: ctx.actor.id,
        before: stock,
        after: stock,
        previousState: from,
        nextState: to,
        idempotencyKey: `unit-event:${u.unitId}:${u.version}`,
        location: u.location,
      },
    ],
    { session },
  );
  await audit(
    ctx,
    action,
    u.unitId,
    `${from} → ${to}${reason ? ": " + reason : ""}`,
    session,
  );
};
const movement = async (
  ctx: OperationsContext,
  u: Unit,
  delta: number,
  reason: string,
  session?: ClientSession,
) => {
  const p = await ProductModel.findOneAndUpdate(
    {
      _id: u.product,
      variants: {
        $elemMatch: {
          _id: u.variant,
          unitTracked: true,
          stock: { $gte: Math.max(0, -delta) },
        },
      },
    },
    { $inc: { "variants.$.stock": delta, "variants.$.stockRevision": 1 } },
    { new: true, session },
  );
  const variant = p?.variants.id(u.variant);
  if (!variant) throw new ApiError(409, "Tracked stock changed");
  await StockMovementModel.create(
    [
      {
        product: u.product,
        variant: u.variant,
        unit: u.unitId,
        sku: u.sku,
        delta,
        reason,
        reference: u.order?.toString() ?? u.receipt,
        actor: ctx.actor.id,
        before: variant.stock - delta,
        after: variant.stock,
        previousState: u.history.at(-1)?.from,
        nextState: u.state,
        idempotencyKey: `unit:${u.unitId}:${u.version}:${reason}`,
      },
    ],
    { session },
  );
};
const validateWork = async (
  ctx: OperationsContext,
  u: Unit,
  input: {
    sop: string;
    completed: string[];
    evidence: string[];
    scannedCode?: string;
  },
  kind: "PRODUCT" | "PACKAGING",
  session?: ClientSession,
) => {
  const document = await SopDocumentModel.findOne({
    _id: input.sop,
    status: { $ne: "ARCHIVED" },
    publishedVersion: { $exists: true },
  }).session(session ?? null);
  if (ctx.actor.kind === "employee") {
    const employee = await EmployeeModel.findById(ctx.actor.id).session(
      session ?? null,
    );
    if (
      !employee ||
      (document?.roles.length && !document.roles.includes(employee.role))
    )
      throw new ApiError(403, "SOP role access denied");
  }
  if (!document) throw new ApiError(409, "Published SOP required");
  const publication = await SopVersionModel.findOne({
    document: document._id,
    version: document.publishedVersion,
  }).session(session ?? null);
  const sop = publication?.snapshot as
    | {
        kind?: string;
        products?: string[];
        requirements?: Array<{
          key: string;
          mandatory: boolean;
          photo: boolean;
          scan: boolean;
        }>;
      }
    | undefined;
  if (
    !sop ||
    sop.kind !== kind ||
    !sop.products?.includes(u.product.toString())
  )
    throw new ApiError(409, "Product-specific published SOP required");
  await authorizeAttachments(ctx, input.evidence, session);
  if (input.evidence.length) {
    const privateCount = await MediaAssetModel.countDocuments({
      _id: { $in: input.evidence },
      visibility: "private",
      deletedAt: { $exists: false },
    }).session(session ?? null);
    if (privateCount !== new Set(input.evidence).size)
      throw new ApiError(400, "Operational evidence must be private");
  }
  for (const r of sop.requirements ?? []) {
    if (r.mandatory && r.scan && input.scannedCode !== u.code)
      throw new ApiError(400, "SOP unit scan required");
    if (r.mandatory && !input.completed.includes(r.key))
      throw new ApiError(400, "Mandatory SOP step incomplete");
    if (r.mandatory && r.photo && !input.evidence.length)
      throw new ApiError(400, "SOP photo evidence required");
  }
  return {
    sop: input.sop,
    sopVersion: publication!.version,
    employee: ctx.actor.id,
    completed: input.completed,
    evidence: input.evidence,
    at: new Date(),
  };
};
export const transitionOrderUnits = async (
  ctx: OperationsContext,
  order: string,
  from: string,
  to: string,
  session?: ClientSession,
  shipment?: string,
  awb?: string,
): Promise<void> => {
  const units = await PhysicalUnitModel.find({ order, state: from }).session(
    session ?? null,
  );
  if (!units.length)
    throw new ApiError(409, "Expected physical units are unavailable");
  for (const u of units) {
    if (shipment) u.shipment = new Types.ObjectId(shipment);
    if (awb) u.awb = awb;
    await transition(ctx, u, to, `unit.${to.toLowerCase()}`, session);
  }
};
export const applyUnitDisposition = async (
  ctx: OperationsContext,
  code: string,
  version: number,
  proposed: unknown,
  session?: ClientSession,
): Promise<void> => {
  permit(ctx, "inventory.adjust.approve");
  const input = v.unitDispositionSchema.parse(proposed);
  const u = await get(code, session);
  if (
    u.version !== version ||
    ![
      "QC_PENDING",
      "QC_FAILED",
      "PACKAGING_PENDING",
      "PACKED_AVAILABLE",
      "QUARANTINED",
      "DAMAGED",
    ].includes(u.state) ||
    u.state === input.state
  )
    throw new ApiError(
      409,
      "Unit state changed or an active order prevents disposition",
    );
  const sellable = u.state === "PACKED_AVAILABLE";
  await transition(
    ctx,
    u,
    input.state,
    "unit.disposition_approved",
    session,
    input.reason,
  );
  if (sellable) await movement(ctx, u, -1, "unit_disposition", session);
};
export const reservePhysicalUnits = async (
  items: Array<{ variant: unknown; quantity: number }>,
  order: string,
  session?: ClientSession,
): Promise<void> => {
  if (process.env.NODE_ENV === "test" && mongoose.connection.readyState !== 1)
    return;
  for (const item of items) {
    const p = await ProductModel.findOne({
      "variants._id": item.variant,
    }).session(session ?? null);
    const variant = p?.variants.id(String(item.variant));
    if (!variant?.unitTracked) continue;
    if (!Types.ObjectId.isValid(order))
      throw new ApiError(
        409,
        "A real order identity is required for tracked reservations",
      );
    if (!session)
      throw new ApiError(503, "Tracked inventory requires transactions");
    for (let i = 0; i < item.quantity; i++) {
      const unit = await PhysicalUnitModel.findOneAndUpdate(
        {
          variant: item.variant,
          state: "PACKED_AVAILABLE",
          order: { $exists: false },
        },
        {
          $set: { state: "RESERVED", order },
          $inc: { version: 1 },
          $push: {
            history: {
              action: "unit.reserved",
              from: "PACKED_AVAILABLE",
              to: "RESERVED",
              actor: "commerce",
              order,
              at: new Date(),
            },
          },
        },
        { new: true, session, sort: { createdAt: 1 } },
      );
      if (!unit)
        throw new ApiError(409, "Packed physical inventory unavailable");
    }
  }
};
export const releasePhysicalUnits = async (
  order: string,
  session?: ClientSession,
): Promise<void> => {
  if (process.env.NODE_ENV === "test" && mongoose.connection.readyState !== 1)
    return;
  if (!Types.ObjectId.isValid(order)) return;
  const unsafe = await PhysicalUnitModel.exists({
    order,
    state: { $in: ["READY_FOR_HANDOVER", "HANDED_OVER", "SHIPPED"] },
  }).session(session ?? null);
  if (unsafe)
    throw new ApiError(409, "Shipment inventory needs reviewed recovery");
  await PhysicalUnitModel.updateMany(
    { order, state: { $in: ["RESERVED", "PICKED", "PACKED_FOR_SHIPMENT"] } },
    {
      $set: { state: "PACKED_AVAILABLE" },
      $unset: { order: 1, shipment: 1, awb: 1, exchange: 1 },
      $inc: { version: 1 },
      $push: {
        history: {
          action: "unit.released",
          to: "PACKED_AVAILABLE",
          actor: "commerce",
          order,
          at: new Date(),
        },
      },
    },
    { session },
  );
};
export const PhysicalUnitsService = {
  async list(ctx: OperationsContext, page: OperationPage) {
    permit(ctx, "inventory.view");
    const filter = {
      ...(page.status ? { state: page.status } : {}),
      ...(page.q
        ? {
            $or: [
              { unitId: { $regex: literalSearch(page.q), $options: "i" } },
              { sku: { $regex: literalSearch(page.q), $options: "i" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      PhysicalUnitModel.find(filter)
        .select("unitId sku product variant state location version")
        .sort({ createdAt: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      PhysicalUnitModel.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async detail(ctx: OperationsContext, code: string) {
    permit(ctx, "units.scan");
    const u = await get(code);
    await audit(ctx, "unit.scanned", u.unitId, "Unit identity resolved");
    const inspectionHistory=await UnitInspectionModel.find({unitId:u.unitId}).sort({createdAt:-1}).lean();
    return {...u.toObject(),inspectionHistory};
  },
  async receive(
    ctx: OperationsContext,
    input: z.infer<typeof v.receiveUnitsSchema>,
  ) {
    permit(ctx, "inventory.receive");
    input = v.receiveUnitsSchema.parse(input);
    return withMongoTransaction(async (session) => {
      const existing = await UnitReceiptModel.findOne({
        key: input.idempotencyKey,
      }).session(session ?? null);
      if (existing) {
        if (
          existing.variant !== input.variant ||
          existing.quantity !== input.quantity ||
          existing.location !== input.location
        )
          throw new ApiError(409, "Receipt key used for different input");
        return PhysicalUnitModel.find({
          receipt: input.idempotencyKey,
        }).session(session ?? null);
      }
      const p = await ProductModel.findOne({
        "variants._id": input.variant,
      }).session(session ?? null);
      const variant = p?.variants.id(input.variant);
      if (!variant) throw new ApiError(404, "Variant not found");
      if (!variant.unitTracked && variant.stock !== 0)
        throw new ApiError(
          409,
          "Existing aggregate stock needs an explicit reviewed unit conversion",
        );
      const activeOrder = await OrderModel.exists({
        stockReserved: true,
        "items.variant": input.variant,
        orderStatus: { $nin: ["cancelled", "delivered"] },
      }).session(session ?? null);
      if (!variant.unitTracked && activeOrder)
        throw new ApiError(
          409,
          "Active aggregate reservations prevent conversion",
        );
      await ProductModel.updateOne(
        { _id: p!._id, "variants._id": variant._id },
        {
          $set: { "variants.$.unitTracked": true },
          $inc: { "variants.$.stockRevision": 1 },
        },
        { session },
      );
      await UnitReceiptModel.create(
        [{ ...input, key: input.idempotencyKey, actor: ctx.actor.id }],
        { session },
      );
      const units = await PhysicalUnitModel.create(
        Array.from({ length: input.quantity }, () => ({
          unitId: `CU-${randomUUID()}`,
          code: `cruisin:unit:${randomUUID()}`,
          product: p!._id,
          variant: variant._id,
          sku: variant.sku,
          receipt: input.idempotencyKey,
          location: input.location,
          history: [
            {
              action: "unit.received",
              to: "QC_PENDING",
              actor: ctx.actor.id,
              at: new Date(),
            },
          ],
        })),
        { session, ordered: true },
      );
      await StockMovementModel.create(
        units.map((u) => ({
          product: u.product,
          variant: u.variant,
          unit: u.unitId,
          sku: u.sku,
          delta: 0,
          reason: "unit.received",
          reference: input.idempotencyKey,
          actor: ctx.actor.id,
          before: variant.stock,
          after: variant.stock,
          previousState: "",
          nextState: "QC_PENDING",
          idempotencyKey: `unit-event:${u.unitId}:0`,
          location: input.location,
        })),
        { session, ordered: true },
      );
      await audit(
        ctx,
        "units.received",
        input.idempotencyKey,
        `${input.quantity} units received; sellable stock unchanged`,
        session,
      );
      return units;
    });
  },
  async label(ctx: OperationsContext, code: string) {
    permit(ctx, "units.generate");
    const u = await get(code);
    await audit(
      ctx,
      "unit.label_printed",
      u.unitId,
      "Generated or reprinted existing unit label; no stock change",
    );
    return {
      unitId: u.unitId,
      code: u.code,
      sku: u.sku,
      svg: await QRCode.toString(u.code, {
        type: "svg",
        errorCorrectionLevel: "M",
      }),
    };
  },
  async requestDisposition(
    ctx: OperationsContext,
    code: string,
    raw: z.infer<typeof v.unitDispositionSchema>,
  ) {
    permit(ctx, "inventory.adjust.request");
    const input = v.unitDispositionSchema.parse(raw);
    return withMongoTransaction(async (session) => {
      const u = await get(code, session);
      if (
        u.version !== input.version ||
        ![
          "QC_PENDING",
          "QC_FAILED",
          "PACKAGING_PENDING",
          "PACKED_AVAILABLE",
          "QUARANTINED",
          "DAMAGED",
        ].includes(u.state) ||
        u.state === input.state
      )
        throw new ApiError(
          409,
          "Unit cannot change disposition in its current state",
        );
      await authorizeAttachments(ctx, input.evidence, session);
      if (
        (await MediaAssetModel.countDocuments({
          _id: { $in: input.evidence },
          visibility: "private",
          deletedAt: { $exists: false },
        }).session(session ?? null)) !== new Set(input.evidence).size
      )
        throw new ApiError(400, "Private evidence required");
      const [a] = await ApprovalRequestModel.create(
        [
          {
            kind: "unit_disposition",
            entity: u.unitId,
            requester: ctx.actor.id,
            expectedEntityVersion: u.version,
            proposed: input,
            reason: input.reason,
            evidence: input.evidence,
            existing: { sku: u.sku, state: u.state },
          },
        ],
        { session },
      );
      await audit(
        ctx,
        "unit.disposition_requested",
        u.unitId,
        input.reason,
        session,
      );
      return a;
    });
  },
  async requestRework(
    ctx: OperationsContext,
    code: string,
    input: { version: number; reason: string },
  ) {
    permit(ctx, "qc.perform");
    return withMongoTransaction(async (session) => {
      const u = await get(code, session);
      await taskAccess(ctx, u, session);
      if (
        u.version !== input.version ||
        !["QC_FAILED", "QUARANTINED"].includes(u.state)
      )
        throw new ApiError(409, "Failed or quarantined unit required");
      const [a] = await ApprovalRequestModel.create(
        [
          {
            kind: "qc_override",
            entity: u.unitId,
            requester: ctx.actor.id,
            expectedEntityVersion: u.version,
            proposed: { action: "rework" },
            reason: input.reason,
            evidence: u.qc?.evidence ?? [],
          },
        ],
        { session },
      );
      await audit(
        ctx,
        "unit.rework_requested",
        u.unitId,
        input.reason,
        session,
      );
      return a;
    });
  },
  async qc(
    ctx: OperationsContext,
    code: string,
    input: z.infer<typeof v.unitQcSchema>,
  ) {
    permit(ctx, "qc.perform");
    input = v.unitQcSchema.parse(input);
    if (
      input.result !== "PASSED" &&
      (!input.defectCategory || !input.reason || input.reason.trim().length < 5)
    )
      throw new ApiError(
        400,
        "Record the defect category and inspection reason",
      );
    return withMongoTransaction(async (session) => {
      const u = await get(code, session);
      await taskAccess(ctx, u, session);
      if (
        u.version !== input.version ||
        !["QC_PENDING", "RETURN_INSPECTION"].includes(u.state)
      )
        throw new ApiError(409, "QC state changed");
      if (
        ["QC_FAILED", "QUARANTINED"].includes(u.state) &&
        ctx.actor.kind !== "admin"
      )
        throw new ApiError(
          403,
          "Administrator must authorize failed QC rework",
        );
      const work = await validateWork(ctx, u, input, "PRODUCT", session);
      const publication = await SopVersionModel.findOne({
        document: work.sop,
        version: work.sopVersion,
      }).session(session ?? null);
      const specification = publication?.snapshot as
        | {
            measurements?: {
              key: string;
              min: number;
              max: number;
              required: boolean;
            }[];
          }
        | undefined;
      if (input.result === "PASSED")
        for (const rule of specification?.measurements ?? []) {
          const value = input.measurements[rule.key];
          if (
            (rule.required && value === undefined) ||
            (value !== undefined && (value < rule.min || value > rule.max))
          )
            throw new ApiError(
              409,
              "Measurement is missing or outside the published SOP tolerance",
            );
        }

      u.qc = {
        ...work,
        result: input.result,
        defectCategory: input.defectCategory,
        reason: input.reason,
        measurements: new Map(Object.entries(input.measurements)),
      };
      await UnitInspectionModel.create([{unitId:u.unitId,kind:'QC',unitVersion:u.version+1,sop:work.sop,sopVersion:work.sopVersion,employee:ctx.actor.id,snapshot:{...work,result:input.result,defectCategory:input.defectCategory,reason:input.reason,measurements:input.measurements}}],{session});

      await transition(
        ctx,
        u,
        input.result === "PASSED"
          ? "PACKAGING_PENDING"
          : input.result === "FAILED"
            ? "QC_FAILED"
            : "QUARANTINED",
        "unit.qc_recorded",
        session,
        input.reason,
      );
      return u;
    });
  },
  async package(
    ctx: OperationsContext,
    code: string,
    input: z.infer<typeof v.unitPackagingSchema>,
  ) {
    permit(ctx, "orders.pack");
    input = v.unitPackagingSchema.parse(input);
    return withMongoTransaction(async (session) => {
      const u = await get(code, session);
      await taskAccess(ctx, u, session);
      if (
        u.version !== input.version ||
        u.state !== "PACKAGING_PENDING" ||
        u.qc?.result !== "PASSED"
      )
        throw new ApiError(
          409,
          "Passed QC and current packaging state required",
        );
      if (input.scannedCode !== u.code)
        throw new ApiError(400, "Scan the unique unit label");
      const work = await validateWork(ctx, u, input, "PACKAGING", session);
      u.packaging = { ...work, result: "VERIFIED" };
      await UnitInspectionModel.create([{unitId:u.unitId,kind:'PACKAGING',unitVersion:u.version+1,sop:work.sop,sopVersion:work.sopVersion,employee:ctx.actor.id,snapshot:{...work,result:'VERIFIED',scannedCode:u.code}}],{session});

      await transition(ctx, u, "PACKED_AVAILABLE", "unit.packaged", session);
      await movement(ctx, u, 1, "unit_packed_available", session);
      return u;
    });
  },
  async allocate(ctx: OperationsContext, code: string, orderId: string) {
    permit(ctx, "orders.pack");
    return withMongoTransaction(async (session) => {
      const u = await get(code, session);
      const order = await OrderModel.findOne({
        _id: orderId,
        stockReserved: true,
        orderStatus: { $in: ["pending", "placed", "confirmed", "processing"] },
        $or: [
          { paymentStatus: "paid" },
          {
            paymentMode: "partial",
            paymentStatus: "partially_paid",
            amountPaid: { $gt: 0 },
          },
          { paymentMethod: "cod", paymentStatus: "cod_pending" },
        ],
      }).session(session ?? null);
      if (!order) throw new ApiError(409, "Eligible reserved order required");
      if (
        !order.items.some(
          (i) => String(i.variant) === String(u.variant) && i.sku === u.sku,
        )
      )
        throw new ApiError(400, "Wrong SKU, size or color");
      if (u.state !== "RESERVED" || u.order?.toString() !== orderId)
        throw new ApiError(409, "Unit is not reserved for this order");
      await taskAccess(ctx, u, session);
      await transition(ctx, u, "PICKED", "unit.picked", session);
      return u;
    });
  },
  async returnUnit(
    ctx: OperationsContext,
    code: string,
    input: z.infer<typeof v.unitReturnSchema>,
  ) {
    permit(ctx, "inventory.adjust.approve");
    input = v.unitReturnSchema.parse(input);
    return withMongoTransaction(async (session) => {
      const u = await get(code, session);
      if (
        u.version !== input.version ||
        !["SHIPPED", "HANDED_OVER", "RETURN_INSPECTION"].includes(u.state)
      )
        throw new ApiError(409, "Return state changed");
      const r = await ReturnRequestModel.findOne({
        _id: input.returnRequest,
        order: u.order,
        qualityCheckedAt: { $exists: true },
      }).session(session ?? null);
      if (
        !r ||
        ![
          "quality_check_passed",
          "refund_window_open",
          "refund_pending",
          "refunded",
          "closed",
        ].includes(r.status) ||
        !(
          r.items.some((i) => String(i.variant) === String(u.variant)) ||
          String(r.item?.variant) === String(u.variant)
        )
      )
        throw new ApiError(
          409,
          "Matching authorized inspected return required",
        );
      u.qc = undefined;
      u.packaging = undefined;
      const next = {
        REPACKAGE: "QC_PENDING",
        QUARANTINE: "QUARANTINED",
        DAMAGED: "DAMAGED",
        RETURN_TO_VENDOR: "RETURNED_TO_VENDOR",
      }[input.disposition];
      u.order = undefined;
      u.shipment = undefined;
      u.awb = undefined;
      await transition(
        ctx,
        u,
        next,
        "unit.return_disposition",
        session,
        input.reason,
      );
      return u;
    });
  },
  async reconcile(ctx: OperationsContext) {
    permit(ctx, "inventory.view");
    const counts = await PhysicalUnitModel.aggregate([
      {
        $group: {
          _id: { variant: "$variant", state: "$state" },
          quantity: { $sum: 1 },
        },
      },
    ]);
    const products = await ProductModel.find({
      "variants.unitTracked": true,
    }).select("title variants");
    return products.flatMap((p) =>
      p.variants
        .filter((v) => v.unitTracked)
        .map((v) => {
          const states = Object.fromEntries(
            counts
              .filter((c) => String(c._id.variant) === String(v._id))
              .map((c) => [c._id.state, c.quantity]),
          );
          return {
            product: p.id,
            variant: String(v._id),
            sku: v.sku,
            stock: v.stock,
            states,
            reconciled: v.stock === (states.PACKED_AVAILABLE ?? 0),
          };
        }),
    );
  },
  async exception(
    ctx: OperationsContext,
    input: z.infer<typeof v.exceptionSchema>,
  ) {
    permit(ctx, "tasks.view");
    input = v.exceptionSchema.parse(input);
    await authorizeAttachments(ctx, input.evidence);
    const e = await OperationsExceptionModel.create({
      ...input,
      reporter: ctx.actor.id,
    });
    await audit(ctx, "exception.reported", e.id, input.type);
    return e;
  },
};
