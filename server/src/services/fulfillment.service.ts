import { transitionOrderUnits } from "./physical-units.service.js";
import { operationalDay } from "../utils/operational-day.js";
import { EmployeeModel } from "../models/employee.model.js";
import { Types, type ClientSession } from "mongoose";
import { z } from "zod";
import { OrderModel } from "../models/order.model.js";
import { ShipmentModel } from "../models/shipment.model.js";
import { EmployeeTaskModel } from "../models/employee-task.model.js";
import { PhysicalUnitModel } from "../models/physical-unit.model.js";
import {
  FulfillmentRecordModel,
  CourierMeasurementPolicyModel,
} from "../models/fulfillment-record.model.js";
import { MediaAssetModel } from "../models/media-asset.model.js";
import { ApiError } from "../utils/api-error.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import {
  permit,
  audit,
  notify,
  type OperationsContext,
} from "./operations-context.js";
import { authorizeAttachments } from "./media/media.service.js";
import { LogisticsService } from "./logistics/logistics.service.js";
import type { OperationPage } from "../validators/operations.validator.js";
export const measurementSchema = z
  .object({
    weightKg: z.number().positive().max(1000),
    lengthCm: z.number().positive().max(500),
    widthCm: z.number().positive().max(500),
    heightCm: z.number().positive().max(500),
    courier: z.string().min(1).max(100),
    evidence: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(20),
    version: z.number().int().min(0),
  })
  .strict();
export const courierPolicySchema = z
  .object({
    courier: z.string().trim().min(2).max(100),
    divisor: z.number().positive().max(100000),
    minWeightKg: z.number().positive(),
    maxWeightKg: z.number().positive().max(1000),
    requireEvidence: z.boolean(),
  })
  .strict()
  .refine((p) => p.maxWeightKg >= p.minWeightKg);
const eligible = async (id: string, session?: ClientSession) => {
  const order = await OrderModel.findOne({
    _id: id,
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
  if (!order) throw new ApiError(409, "Order is not eligible for fulfillment");
  return order;
};
const access = async (
  ctx: OperationsContext,
  order: string,
  session?: ClientSession,
  includeCompleted = false,
) => {
  permit(ctx, "orders.pack");
  const task = await EmployeeTaskModel.findOne({
    order,
    category: "order_packaging",
    status: {
      $nin: includeCompleted ? ["CANCELLED"] : ["CANCELLED", "COMPLETED"],
    },
    ...(ctx.actor.kind === "employee" ? { assignees: ctx.actor.id } : {}),
  }).session(session ?? null);
  if (!task) throw new ApiError(403, "Assigned fulfillment task required");
  return task;
};
export const FulfillmentService = {
  async ensureTask(orderId: string, existingSession?: ClientSession) {
    const work = async (session?: ClientSession) => {
      await eligible(orderId, session);
      const key = `fulfillment:${orderId}`;
      const task = await EmployeeTaskModel.findOneAndUpdate(
        { fulfillmentKey: key },
        {
          $setOnInsert: {
            fulfillmentKey: key,
            title: "Pick and pack order",
            description:
              "Verify reserved physical units and prepare the package",
            category: "order_packaging",
            order: orderId,
            creator: "system",
            assignees: [],
            history: [
              {
                action: "created",
                actor: "system",
                at: new Date(),
                summary: "Eligible order fulfillment queued",
              },
            ],
          },
        },
        { upsert: true, new: true, session },
      );
      await FulfillmentRecordModel.updateOne(
        { order: orderId },
        { $setOnInsert: { order: orderId, task: task._id } },
        { upsert: true, session },
      );
      return task;
    };
    return existingSession ? work(existingSession) : withMongoTransaction(work);
  },
  async orders(
    ctx: OperationsContext,
    page: OperationPage,
    range: { from?: string; to?: string; timezone?: string } = {},
  ) {
    permit(ctx, "orders.view");
    const tasks =
      ctx.actor.kind === "employee"
        ? await EmployeeTaskModel.find({
            assignees: ctx.actor.id,
            order: { $exists: true },
          })
            .select("order")
            .lean()
        : null;
    const employee =
      ctx.actor.kind === "employee"
        ? await EmployeeModel.findById(ctx.actor.id).select("timezone")
        : null;
    const timezone = employee?.timezone ?? range.timezone ?? "Asia/Kolkata";
    let day: { from: Date; to: Date };
    try {
      day = operationalDay(new Date(), timezone);
    } catch {
      throw new ApiError(400, "Invalid operational timezone");
    }
    const start = range.from ? new Date(range.from) : day.from;
    const end = range.to ? new Date(range.to) : day.to;
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    )
      throw new ApiError(400, "Valid date range required");
    const filter = {
      ...(tasks ? { _id: { $in: tasks.map((t) => t.order) } } : {}),
      ...(page.status === "all"
        ? {}
        : { createdAt: { $gte: start, $lt: end } }),
      ...(page.q
        ? {
            orderNumber: {
              $regex: page.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      OrderModel.find(filter)
        .select(
          "orderNumber items.title items.sku items.size items.color items.quantity items.variant paymentStatus orderStatus fulfillmentStatus createdAt",
        )
        .sort({ createdAt: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      OrderModel.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async detail(ctx: OperationsContext, id: string) {
    await access(ctx, id, undefined, true);
    const order = await OrderModel.findById(id).select(
      "orderNumber items.title items.sku items.size items.color items.quantity items.variant paymentStatus orderStatus fulfillmentStatus",
    );
    if (!order) throw new ApiError(404, "Order not found");
    const [record, units, shipments] = await Promise.all([
      FulfillmentRecordModel.findOne({ order: id }).lean(),
      PhysicalUnitModel.find({ order: id }).lean(),
      ShipmentModel.find({ order: id })
        .select(
          "_id awb courierName shipmentStatus label.status label.verificationId label.generatedAt",
        )
        .lean(),
    ]);
    return { order, record, units, shipments };
  },
  async policies(ctx: OperationsContext) {
    permit(ctx, "orders.pack");
    return CourierMeasurementPolicyModel.find().sort({ courier: 1 }).lean();
  },
  async policy(
    ctx: OperationsContext,
    input: z.infer<typeof courierPolicySchema>,
  ) {
    permit(ctx, "shipping.prepare");
    if (ctx.actor.kind !== "admin")
      throw new ApiError(403, "Administrator required");
    input = courierPolicySchema.parse(input);
    const p = await CourierMeasurementPolicyModel.findOneAndUpdate(
      { courier: input.courier },
      { $set: input },
      { upsert: true, new: true },
    );
    await audit(
      ctx,
      "courier.measurement_policy",
      p.id,
      "Courier divisor and weight range configured",
    );
    return p;
  },
  async measure(ctx: OperationsContext, id: string, input: unknown) {
    const data = measurementSchema.parse(input);
    return withMongoTransaction(async (session) => {
      const order = await eligible(id, session);
      const task = await access(ctx, id, session);
      const policy = await CourierMeasurementPolicyModel.findOne({
        courier: data.courier,
      }).session(session ?? null);
      if (!policy)
        throw new ApiError(
          409,
          "Admin must configure the courier measurement divisor",
        );
      if (
        data.weightKg < policy.minWeightKg ||
        data.weightKg > policy.maxWeightKg
      )
        throw new ApiError(409, "Package weight outside courier policy");
      if (policy.requireEvidence && !data.evidence.length)
        throw new ApiError(400, "Package evidence required");
      await authorizeAttachments(ctx, data.evidence, session);
      if (
        data.evidence.length &&
        (await MediaAssetModel.countDocuments({
          _id: { $in: data.evidence },
          visibility: "private",
          deletedAt: { $exists: false },
        }).session(session ?? null)) !== new Set(data.evidence).size
      )
        throw new ApiError(400, "Package evidence must be private");
      const units = await PhysicalUnitModel.find({
        order: id,
        state: "PICKED",
      }).session(session ?? null);
      const expected = order.items.reduce((sum, i) => sum + i.quantity, 0);
      if (units.length !== expected)
        throw new ApiError(409, "Scan every reserved unit before packing");
      for (const item of order.items) {
        if (
          units.filter((u) => String(u.variant) === String(item.variant))
            .length <
          order.items
            .filter((i) => String(i.variant) === String(item.variant))
            .reduce((n, i) => n + i.quantity, 0)
        )
          throw new ApiError(409, "Picked units do not match order");
      }
      const volume = data.lengthCm * data.widthCm * data.heightCm;
      const volumetric = volume / policy.divisor;
      const { version: expectedVersion, ...measurements } = data;
      const record = await FulfillmentRecordModel.findOneAndUpdate(
        { order: id, version: expectedVersion, stage: "PICKING" },
        {
          $set: {
            ...measurements,
            task: task._id,
            employee: ctx.actor.id,
            volumeCm3: volume,
            volumetricWeightKg: volumetric,
            chargeableWeightKg: Math.max(data.weightKg, volumetric),
            divisor: policy.divisor,
            units: units.map((u) => u.unitId),
            stage: "PACKED",
            packedAt: new Date(),
          },
          $inc: { version: 1 },
        },
        { new: true, session },
      );
      if (!record) throw new ApiError(409, "Packing record changed");
      await transitionOrderUnits(
        ctx,
        id,
        "PICKED",
        "PACKED_FOR_SHIPMENT",
        session,
      );
      await audit(
        ctx,
        "package.measured",
        record.id,
        "Physical picking, package measurements and evidence verified",
        session,
      );
      return record;
    });
  },
  async shipping(
    ctx: OperationsContext,
    id: string,
    action: "prepare" | "awb" | "label" | "pickup" | "manifest",
  ) {
    permit(ctx, "shipping.prepare");
    await eligible(id);
    await access(ctx, id);
    const record = await FulfillmentRecordModel.findOne({
      order: id,
      stage: { $in: ["PACKED", "READY_FOR_HANDOVER"] },
    });
    if (!record) throw new ApiError(409, "Verified packed parcel required");
    let shipment = await ShipmentModel.findOne({
      order: id,
      shipmentType: "forward",
    });
    if (!shipment) {
      await LogisticsService.ensureDraftForOrder(id);
      shipment = await ShipmentModel.findOne({
        order: id,
        shipmentType: "forward",
      });
    }
    if (!shipment) throw new ApiError(409, "Shipment missing");
    if (action === "prepare") {
      await LogisticsService.confirmPackage(
        shipment.id,
        {
          productWeightKg: record.weightKg!,
          packagingWeightKg: 0,
          deadWeightKg: record.weightKg!,
          lengthCm: record.lengthCm!,
          breadthCm: record.widthCm!,
          heightCm: record.heightCm!,
          measurementConfirmed: true,
          warnings: [],
        },
        ctx.actor.id,
      );
      return LogisticsService.createProviderOrder(
        shipment.id,
        ctx.actor.kind === "admin" ? ctx.actor.id : undefined,
      );
    }
    if (action === "awb")
      return LogisticsService.assignAwb(
        shipment.id,
        undefined,
        ctx.actor.kind === "admin" ? ctx.actor.id : undefined,
        { deferMockTrackingUntilHandover: true },
      );
    if (action === "label")
      return LogisticsService.generateDocument(
        shipment.id,
        "label",
        ctx.actor.kind === "admin" ? ctx.actor.id : undefined,
      );
    if (action === "pickup")
      return LogisticsService.schedulePickup(
        shipment.id,
        ctx.actor.kind === "admin" ? ctx.actor.id : undefined,
      );
    return LogisticsService.generateDocument(
      shipment.id,
      "manifest",
      ctx.actor.kind === "admin" ? ctx.actor.id : undefined,
    );
  },
  async label(ctx: OperationsContext, id: string) {
    await access(ctx, id);
    const s = await ShipmentModel.findOne({
      order: id,
      shipmentType: "forward",
      awb: { $exists: true },
      "label.status": "ready",
    });
    if (!s) throw new ApiError(409, "Shipment label is not ready");
    return LogisticsService.documentAccess(s.id, "label");
  },
  async ready(
    ctx: OperationsContext,
    id: string,
    input: {
      version: number;
      shipment: string;
      awb: string;
      labelOperationId: string;
    },
  ) {
    return withMongoTransaction(async (session) => {
      await eligible(id, session);
      await access(ctx, id, session);
      const shipment = await ShipmentModel.findOne({
        _id: input.shipment,
        order: id,
        awb: input.awb,
        "label.status": "ready",
        "label.verificationId": input.labelOperationId,
        shipmentStatus: { $nin: ["cancelled", "error"] },
      }).session(session ?? null);
      if (!shipment || !shipment.label?.url || !input.labelOperationId)
        throw new ApiError(409, "AWB and generated shipping label must match");
      const record = await FulfillmentRecordModel.findOneAndUpdate(
        { order: id, stage: "PACKED", version: input.version },
        {
          $set: {
            stage: "READY_FOR_HANDOVER",
            shipment: shipment._id,
            awb: shipment.awb,
            labelOperationId: input.labelOperationId,
            labelVerifiedAt: new Date(),
          },
          $inc: { version: 1 },
        },
        { new: true, session },
      );
      if (!record) throw new ApiError(409, "Package state changed");
      await transitionOrderUnits(
        ctx,
        id,
        "PACKED_FOR_SHIPMENT",
        "READY_FOR_HANDOVER",
        session,
        shipment.id,
        shipment.awb ?? undefined,
      );
      await audit(
        ctx,
        "package.ready_for_handover",
        record.id,
        "Matching AWB and label verified; awaiting handover",
        session,
      );
      return record;
    });
  },
  async handover(ctx: OperationsContext, id: string, version: number) {
    permit(ctx, "shipping.prepare");
    return withMongoTransaction(async (session) => {
      await eligible(id, session);
      const task = await access(ctx, id, session);
      const record = await FulfillmentRecordModel.findOneAndUpdate(
        { order: id, stage: "READY_FOR_HANDOVER", version },
        {
          $set: { stage: "HANDED_OVER", handedOverAt: new Date() },
          $inc: { version: 1 },
        },
        { new: true, session },
      );
      if (!record) throw new ApiError(409, "Ready package required");
      await transitionOrderUnits(
        ctx,
        id,
        "READY_FOR_HANDOVER",
        "HANDED_OVER",
        session,
      );
      await EmployeeTaskModel.updateOne(
        { _id: task._id },
        {
          $set: { status: "COMPLETED" },
          $inc: { version: 1 },
          $push: {
            history: {
              action: "completed",
              actor: ctx.actor.id,
              at: new Date(),
              summary:
                "Verified parcel handed to courier; carrier shipment confirmation pending",
            },
          },
        },
        { session },
      );
      await notify(
        task.assignees,
        "task.completed",
        task.id,
        task.version + 1,
        "Courier handover recorded",
        session,
      );
      await audit(
        ctx,
        "package.handed_over",
        record.id,
        "Handover recorded; provider shipment state unchanged",
        session,
      );
      return record;
    });
  },
};
