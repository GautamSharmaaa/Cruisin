import { ExchangeRequestModel } from "../models/exchange-request.model.js";
import { OrderModel } from "../models/order.model.js";
import { PhysicalUnitModel } from "../models/physical-unit.model.js";
import { ApiError } from "../utils/api-error.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import { permit, audit, type OperationsContext } from "./operations-context.js";
export const TrackedExchangeService = {
  async options(ctx: OperationsContext) {
    permit(ctx, "orders.update");
    if (ctx.actor.kind !== "admin")
      throw new ApiError(403, "Administrator required");
    return ExchangeRequestModel.find({ status: "requested" })
      .select("_id requestNumber")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  },
  async link(ctx: OperationsContext, requestId: string, orderId: string) {
    permit(ctx, "orders.update");
    if (ctx.actor.kind !== "admin")
      throw new ApiError(403, "Administrator required");
    return withMongoTransaction(async (session) => {
      const request = await ExchangeRequestModel.findOne({
        _id: requestId,
        status: "requested",
        inventoryReserved: { $ne: true },
      }).session(session ?? null);
      if (!request?.originalItem)
        throw new ApiError(409, "Unreserved exchange request required");
      if (
        request.replacementOrder &&
        String(request.replacementOrder) !== orderId
      )
        throw new ApiError(
          409,
          "Exchange already linked to another replacement order",
        );
      const order = await OrderModel.findOne({
        _id: orderId,
        user: request.customer,
        stockReserved: true,
        orderStatus: { $in: ["pending", "placed", "confirmed", "processing"] },
        $or: [
          { paymentStatus: "paid" },
          { paymentMethod: "cod", paymentStatus: "cod_pending" },
          {
            paymentMode: "partial",
            paymentStatus: "partially_paid",
            amountPaid: { $gt: 0 },
          },
        ],
      }).session(session ?? null);
      if (
        !order ||
        order.items
          .filter((i) => String(i.variant) === String(request.requestedVariant))
          .reduce((n, i) => n + i.quantity, 0) < request.originalItem.quantity
      )
        throw new ApiError(
          409,
          "An eligible same-customer replacement order with reserved items is required",
        );
      const existing = await PhysicalUnitModel.find({
        order: orderId,
        variant: request.requestedVariant,
        state: "RESERVED",
        exchange: request._id,
      }).session(session ?? null);
      const missing = request.originalItem.quantity - existing.length;
      if (missing < 0)
        throw new ApiError(409, "Exchange allocation needs reconciliation");
      const candidates = await PhysicalUnitModel.find({
        order: orderId,
        variant: request.requestedVariant,
        state: "RESERVED",
        exchange: { $exists: false },
      })
        .sort({ createdAt: 1 })
        .limit(missing || 1)
        .session(session ?? null);
      if (candidates.length < missing)
        throw new ApiError(
          409,
          "Reserved replacement units are already linked elsewhere",
        );
      for (const u of candidates.slice(0, missing)) {
        u.exchange = request._id;
        u.version++;
        u.history.push({
          action: "unit.exchange_linked",
          from: "RESERVED",
          to: "RESERVED",
          actor: ctx.actor.id,
          order: orderId,
          at: new Date(),
          reason: `Exchange ${request.requestNumber}`,
        });
        await u.save({ session });
      }
      const result = await ExchangeRequestModel.findOneAndUpdate(
        { _id: request._id, status: "requested", __v: request.__v },
        {
          $set: { replacementOrder: order._id },
          $inc: { __v: 1 },
          $push: {
            history: {
              action: "replacement_order_linked",
              note: "Existing reserved replacement order linked without a second deduction",
              admin: ctx.actor.id,
              createdAt: new Date(),
            },
          },
        },
        { new: true, session },
      );
      if (!result) throw new ApiError(409, "Exchange changed");
      await audit(
        ctx,
        "exchange.replacement_linked",
        request.id,
        "Reserved unit allocation linked; stock unchanged",
        session,
      );
      return result;
    });
  },
};
