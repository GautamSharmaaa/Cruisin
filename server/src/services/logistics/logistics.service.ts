// Governed by .rules v1.0
import crypto from "node:crypto";
import { Types } from "mongoose";
import { logisticsConfig, logisticsIsMock } from "../../config/logistics.js";
import { LogisticsAuditModel } from "../../models/logistics-audit.model.js";
import { LogisticsQuoteModel } from "../../models/logistics-quote.model.js";
import { OrderModel } from "../../models/order.model.js";
import { ProductModel } from "../../models/product.model.js";
import { ShipmentModel } from "../../models/shipment.model.js";
import { UserModel } from "../../models/user.model.js";
import type {
  LogisticsAddress,
  PackageMeasurement,
  ShipmentStatus,
} from "../../types/logistics.types.js";
import { LogisticsProviderError } from "../../types/logistics.types.js";
import { ApiError } from "../../utils/api-error.js";
import { logger } from "../../utils/logger.js";
import { calculatePackage, type PackageLine } from "./package-calculator.js";
import { LogisticsAutomationService } from "./logistics-automation.service.js";
import { LogisticsNotificationService } from "./logistics-notification.service.js";
import { applyShiprocketSnapshot, recordShiprocketSyncFailure, type ShiprocketSyncSource } from "./logistics-sync.service.js";
import { getLogisticsProvider } from "./provider-factory.js";
import { buildCustomerTrackingMilestones } from "./customer-tracking.js";

const money = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;
const quotedProviderCost = () => ({
  $add: [
    { $ifNull: ["$providerShippingCost", 0] },
    { $ifNull: ["$codCharge", 0] },
    { $ifNull: ["$rtoCost", 0] },
    { $ifNull: ["$otherProviderCharges", 0] },
  ],
});
const effectiveProviderCost = () => ({
  $cond: [
    { $eq: ["$providerBillingStatus", "current"] },
    { $ifNull: ["$providerBilledTotal", 0] },
    quotedProviderCost(),
  ],
});
const effectiveLogisticsCost = () => ({
  $add: [
    effectiveProviderCost(),
    { $ifNull: ["$returnShippingCost", 0] },
    { $ifNull: ["$exchangeShippingCost", 0] },
  ],
});
const objectId = (value: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value))
    throw new ApiError(400, "Invalid identifier");
  return new Types.ObjectId(value);
};

const activeShiprocketSyncStatuses = [
  "draft",
  "pending_provider",
  "provider_order_created",
  "awb_assigned",
  "pickup_scheduled",
  "out_for_pickup",
  "picked_up",
  "shipped",
  "in_transit",
  "reached_destination_hub",
  "out_for_delivery",
  "delivery_exception",
  "ndr",
  "rto_initiated",
  "rto_in_transit",
  "return_in_transit",
  "error",
  "unknown",
] as const;

export interface ShiprocketBulkSyncSummary {
  scanned: number;
  changed: number;
  unchanged: number;
  failed: number;
  shiprocketMutations: 0;
}

const audit = async (input: {
  action: string;
  actorType: "admin" | "customer" | "system" | "provider";
  order?: unknown;
  shipment?: unknown;
  admin?: string;
  previousValue?: unknown;
  newValue?: unknown;
  providerReference?: string;
  failureReason?: string;
  correlationId?: string;
}): Promise<void> => {
  try {
    await LogisticsAuditModel.create(input);
  } catch (error) {
    logger.error("Logistics audit record could not be stored", {
      action: input.action,
      error,
    });
  }
};

const providerFailure = async (
  shipmentId: string,
  action: string,
  error: unknown,
): Promise<never> => {
  const normalized =
    error instanceof LogisticsProviderError
      ? error
      : new LogisticsProviderError(
          "unknown",
          "Logistics operation failed",
          false,
          502,
        );
  const shipment = await ShipmentModel.findByIdAndUpdate(shipmentId, {
    $set: {
      shipmentStatus: "error",
      lastProviderError: {
        code: normalized.code,
        message: normalized.message,
        retryable: normalized.retryable,
        correlationId: normalized.providerReference,
        occurredAt: new Date(),
      },
    },
  });
  if (shipment) {
    await OrderModel.updateOne(
      { _id: shipment.order },
      { $set: { fulfillmentStatus: "logistics_error" } },
    );
    await audit({
      action,
      actorType: "system",
      order: shipment.order,
      shipment: shipment._id,
      failureReason: normalized.message,
      correlationId: normalized.providerReference,
    });
  }
  throw normalized;
};

const loadPackageLines = async (
  items: Array<{ product: unknown; variant: unknown; quantity: number }>,
): Promise<PackageLine[]> => {
  const productIds = [...new Set(items.map((item) => String(item.product)))];
  const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
  const byId = new Map(
    products.map((product) => [String(product._id), product]),
  );
  return items.map((item) => {
    const product = byId.get(String(item.product));
    const variant = product?.variants.find(
      (candidate) => String(candidate._id) === String(item.variant),
    );
    if (!product || !variant)
      throw new ApiError(
        409,
        "Shipment package data references an unavailable product variant",
      );
    return { product, variant, quantity: item.quantity };
  });
};

const addressForProvider = async (order: {
  user?: unknown;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}): Promise<LogisticsAddress> => {
  const user = order.user
    ? await UserModel.findById(order.user).select("email").lean()
    : null;
  return {
    name: order.shippingAddress.fullName,
    phone: order.shippingAddress.phone,
    email: user?.email ?? undefined,
    address: order.shippingAddress.line1,
    address2: order.shippingAddress.line2 ?? undefined,
    city: order.shippingAddress.city,
    state: order.shippingAddress.state,
    country: order.shippingAddress.country,
    postcode: order.shippingAddress.postalCode,
  };
};

const getShipment = async (shipmentId: string) => {
  const shipment = await ShipmentModel.findById(objectId(shipmentId));
  if (!shipment) throw new ApiError(404, "Shipment not found");
  return shipment;
};
const safeDocumentError = (error: unknown): string =>
  (error instanceof Error ? error.message : "Document generation failed")
    .replace(
      /(token|password|secret|authorization)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    )
    .slice(0, 500);
const customerStatus = (status: ShipmentStatus): string => {
  if (["draft", "pending_provider", "provider_order_created", "awb_assigned", "pickup_scheduled", "out_for_pickup"].includes(status)) return "preparing_for_shipment";
  if (["picked_up", "shipped"].includes(status)) return "shipped";
  if (["in_transit", "reached_destination_hub"].includes(status)) return "in_transit";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (status === "delivered") return "delivered";
  if (["delivery_exception", "ndr", "lost", "damaged"].includes(status)) return "delivery_delayed";
  if (status.startsWith("rto_")) return "return_to_sender";
  if (["return_in_transit", "returned"].includes(status)) return "returned";
  if (status === "cancelled") return "cancelled";
  return "preparing_for_shipment";
};
const customerStatusMessage = (status: ShipmentStatus): string => ({
  preparing_for_shipment: "Your order is being prepared for shipment",
  shipped: "Your order has shipped",
  in_transit: "Your order is in transit",
  out_for_delivery: "Your order is out for delivery",
  delivered: "Your order was delivered",
  delivery_delayed: "Your delivery needs additional time",
  return_to_sender: "The shipment is returning to the sender",
  returned: "The shipment was returned",
  cancelled: "The shipment was cancelled",
}[customerStatus(status)] ?? "Shipment update received");
const assertDocumentUrl = (url: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new LogisticsProviderError(
      "invalid_payload",
      "Provider returned an invalid document URL",
      false,
      502,
    );
  }
  if (
    logisticsIsMock()
      ? !["mock:", "https:"].includes(parsed.protocol)
      : parsed.protocol !== "https:"
  ) {
    throw new LogisticsProviderError(
      "invalid_payload",
      "Provider returned an unsafe document URL",
      false,
      502,
    );
  }
};

export const LogisticsService = {
  async ensureDraftForOrder(
    orderId: string,
    createdBy?: string,
  ): Promise<unknown> {
    const order = await OrderModel.findById(objectId(orderId));
    if (!order) throw new ApiError(404, "Order not found");
    const eligible =
      order.paymentMode === "cod"
        ? ["cod_pending", "paid"].includes(order.paymentStatus)
        : ["paid", "partially_paid"].includes(order.paymentStatus);
    if (!eligible)
      throw new ApiError(
        409,
        "A shipment can be prepared only after payment authorization or COD placement",
      );
    const existing = await ShipmentModel.findOne({
      order: order._id,
      shipmentType: "forward",
    });
    if (existing) return existing;
    const packageMeasurement = await calculatePackage(
      await loadPackageLines(order.items),
    );
    const quote = order.logisticsQuoteId
      ? await LogisticsQuoteModel.findOne({
          quoteId: order.logisticsQuoteId,
        }).lean()
      : null;
    try {
      const shipment = await ShipmentModel.create({
        order: order._id,
        shipmentType: "forward",
        sourceOrderId: order.orderNumber ?? String(order._id),
        pickupLocation: logisticsConfig.pickupLocation ?? "Mock Warehouse",
        package: packageMeasurement,
        quoteSnapshot:
          quote?.options.find(
            (option) => option.code === order.shippingMethod,
          ) ?? undefined,
        shippingChargeCollected: order.shipping,
        providerShippingCost: quote?.options.find(
          (option) => option.code === order.shippingMethod,
        )?.providerCost,
        codCharge: quote?.options.find(
          (option) => option.code === order.shippingMethod,
        )?.codCharge,
        courierId: quote?.options.find(
          (option) => option.code === order.shippingMethod,
        )?.courierId,
        courierName: quote?.options.find(
          (option) => option.code === order.shippingMethod,
        )?.courierName,
        shippingMode:
          quote?.options.find((option) => option.code === order.shippingMethod)
            ?.shippingMode ?? "unknown",
        idempotencyKey: `forward:${order._id}`,
        createdBy: createdBy ? objectId(createdBy) : undefined,
      });
      order.fulfillmentStatus = "pending_logistics";
      await order.save();
      await audit({
        action: "shipment_draft_created",
        actorType: createdBy ? "admin" : "system",
        admin: createdBy,
        order: order._id,
        shipment: shipment._id,
        newValue: { package: packageMeasurement },
      });
      return shipment;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        const duplicate = await ShipmentModel.findOne({
          order: order._id,
          shipmentType: "forward",
        });
        if (duplicate) return duplicate;
      }
      throw error;
    }
  },

  async createProviderOrderForOrder(
    orderId: string,
    adminId?: string,
  ): Promise<unknown> {
    const draft = await this.ensureDraftForOrder(orderId, adminId);
    return this.createProviderOrder(
      String((draft as { _id: unknown })._id),
      adminId,
    );
  },

  async createProviderOrder(
    shipmentId: string,
    adminId?: string,
  ): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    if (shipment.providerOrderId && shipment.providerShipmentId)
      return shipment;
    if (shipment.shipmentStatus === "pending_provider")
      throw new ApiError(409, "Provider order creation is already in progress");
    if (!logisticsIsMock() && !shipment.package?.measurementConfirmed)
      throw new ApiError(
        409,
        "Confirm package measurements before creating a live provider order",
      );
    const claimed = await ShipmentModel.findOneAndUpdate(
      {
        _id: shipment._id,
        providerOrderId: { $exists: false },
        shipmentStatus: { $in: ["draft", "error"] },
      },
      {
        $set: { shipmentStatus: "pending_provider" },
        $unset: { lastProviderError: 1 },
      },
      { new: true },
    );
    if (!claimed) {
      const current = await getShipment(shipmentId);
      if (current.providerOrderId) return current;
      throw new ApiError(409, "Shipment state changed; refresh and try again");
    }
    const order = await OrderModel.findById(claimed.order);
    if (!order)
      return providerFailure(
        shipmentId,
        "provider_order_create_failed",
        new ApiError(404, "Order not found"),
      );
    try {
      const result = await getLogisticsProvider().createOrder({
        localOrderId: String(order._id),
        sourceOrderId: claimed.sourceOrderId,
        orderDate: order.createdAt,
        pickupLocation: claimed.pickupLocation,
        address: await addressForProvider(order),
        items: order.items.map((item) => ({
          name: item.title,
          sku: item.sku,
          units: item.quantity,
          sellingPrice: item.price,
          discount: 0,
          tax: 0,
        })),
        paymentMode: order.paymentMode === "cod" ? "cod" : "prepaid",
        subtotal: order.subtotal,
        shippingCharge: order.shipping,
        totalDiscount: order.discount,
        total: order.total,
        package: claimed.package as PackageMeasurement,
      });
      claimed.providerOrderId = result.providerOrderId;
      claimed.providerShipmentId = result.providerShipmentId;
      claimed.rawProviderStatus = result.status;
      claimed.shipmentStatus = "provider_order_created";
      claimed.lastProviderError = undefined;
      await claimed.save();
      order.fulfillmentStatus = "ready_to_ship";
      await order.save();
      await audit({
        action: "provider_order_created",
        actorType: adminId ? "admin" : "system",
        admin: adminId,
        order: order._id,
        shipment: claimed._id,
        newValue: result,
        providerReference: result.providerShipmentId,
      });
      await LogisticsNotificationService.emit({
        eventType: "shipment_created",
        orderId: String(order._id),
        shipmentId: String(claimed._id),
      });
      await LogisticsAutomationService.afterProviderOrder(claimed);
      return claimed;
    } catch (error) {
      return providerFailure(shipmentId, "provider_order_create_failed", error);
    }
  },

  async compareCouriers(shipmentId: string): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    const order = await OrderModel.findById(shipment.order);
    if (!order) throw new ApiError(404, "Order not found");
    if (!shipment.package)
      throw new ApiError(409, "Shipment package measurements are missing");
    return getLogisticsProvider().getRates({
      pickupPostcode: logisticsConfig.pickupPostcode ?? "560001",
      deliveryPostcode: order.shippingAddress.postalCode,
      paymentMode: order.paymentMode === "cod" ? "cod" : "prepaid",
      weightKg: shipment.package.deadWeightKg,
      lengthCm: shipment.package.lengthCm,
      breadthCm: shipment.package.breadthCm,
      heightCm: shipment.package.heightCm,
      declaredValue: order.subtotal,
    });
  },

  async confirmPackage(
    shipmentId: string,
    input: PackageMeasurement,
    adminId: string,
  ): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    if (!["draft", "error"].includes(shipment.shipmentStatus))
      throw new ApiError(
        409,
        "Package measurements cannot change after provider creation",
      );
    const previous = shipment.package ? { ...shipment.package } : undefined;
    shipment.package = { ...input, measurementConfirmed: true, warnings: [] };
    await shipment.save();
    await audit({
      action: "package_confirmed",
      actorType: "admin",
      admin: adminId,
      order: shipment.order,
      shipment: shipment._id,
      previousValue: previous,
      newValue: shipment.package,
    });
    return shipment;
  },

  async assignAwb(
    shipmentId: string,
    courierId: number | undefined,
    adminId?: string,
  ): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    if (shipment.awb) return shipment;
    if (!shipment.providerShipmentId)
      throw new ApiError(
        409,
        "Create the provider order before assigning a courier",
      );
    try {
      const result = await getLogisticsProvider().assignCourier({
        providerShipmentId: shipment.providerShipmentId,
        courierId,
      });
      shipment.awb = result.awb;
      shipment.courierId = result.courierId ?? courierId;
      shipment.courierName = result.courierName;
      shipment.rawProviderStatus = result.status;
      shipment.shipmentStatus = "awb_assigned";
      await shipment.save();
      await audit({
        action: "awb_assigned",
        actorType: adminId ? "admin" : "system",
        admin: adminId,
        order: shipment.order,
        shipment: shipment._id,
        newValue: result,
        providerReference: result.awb,
      });
      await LogisticsNotificationService.emit({
        eventType: "awb_assigned",
        orderId: String(shipment.order),
        shipmentId: String(shipment._id),
        entityReference: result.awb,
      });
      await LogisticsAutomationService.afterAwb(shipment);
      try {
        const reconciled = await this.reconcileShiprocketShipment(String(shipment._id), "manual_sync", adminId) as { shipment: unknown };
        return reconciled.shipment;
      } catch {
        return shipment;
      }
    } catch (error) {
      return providerFailure(shipmentId, "awb_assign_failed", error);
    }
  },

  async schedulePickup(shipmentId: string, adminId?: string): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    if (shipment.pickupDate) return shipment;
    if (!shipment.providerShipmentId || !shipment.awb)
      throw new ApiError(409, "Assign an AWB before scheduling pickup");
    try {
      const result = await getLogisticsProvider().schedulePickup({
        providerShipmentId: shipment.providerShipmentId,
      });
      shipment.pickupDate = result.pickupDate
        ? new Date(result.pickupDate)
        : new Date();
      shipment.rawProviderStatus = result.status;
      shipment.shipmentStatus = "pickup_scheduled";
      await shipment.save();
      await audit({
        action: "pickup_scheduled",
        actorType: adminId ? "admin" : "system",
        admin: adminId,
        order: shipment.order,
        shipment: shipment._id,
        newValue: result,
      });
      await LogisticsNotificationService.emit({
        eventType: "pickup_scheduled",
        orderId: String(shipment.order),
        shipmentId: String(shipment._id),
      });
      try {
        const reconciled = await this.reconcileShiprocketShipment(String(shipment._id), "manual_sync", adminId) as { shipment: unknown };
        return reconciled.shipment;
      } catch {
        return shipment;
      }
    } catch (error) {
      return providerFailure(shipmentId, "pickup_schedule_failed", error);
    }
  },

  async generateDocument(
    shipmentId: string,
    kind: "label" | "invoice" | "manifest",
    adminId?: string,
  ): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    const now = new Date();
    const currentDocument = shipment[kind];
    if (
      currentDocument?.status === "ready" &&
      currentDocument.url &&
      currentDocument.expiresAt &&
      currentDocument.expiresAt > now
    )
      return shipment;
    if (!shipment.providerOrderId && !shipment.providerShipmentId)
      throw new ApiError(
        409,
        "Create the provider order before generating documents",
      );
    const operationId = crypto.randomUUID();
    const claimed = await ShipmentModel.findOneAndUpdate(
      { _id: shipment._id, [`${kind}.status`]: { $ne: "pending" } },
      {
        $set: {
          [`${kind}.status`]: "pending",
          [`${kind}.operationId`]: operationId,
        },
        $unset: {
          [`${kind}.url`]: 1,
          [`${kind}.expiresAt`]: 1,
          [`${kind}.lastError`]: 1,
        },
      },
      { new: true },
    );
    if (!claimed) {
      const latest = await getShipment(shipmentId);
      if (
        latest[kind]?.status === "ready" &&
        latest[kind]?.url &&
        latest[kind]?.expiresAt &&
        latest[kind]!.expiresAt! > now
      )
        return latest;
      throw new ApiError(409, `${kind} generation is already in progress`);
    }
    const input = {
      providerOrderId: claimed.providerOrderId ?? undefined,
      providerShipmentId: claimed.providerShipmentId ?? undefined,
    };
    try {
      const provider = getLogisticsProvider();
      const result =
        kind === "label"
          ? await provider.generateLabel(input)
          : kind === "invoice"
            ? await provider.generateInvoice(input)
            : await provider.generateManifest(input);
      assertDocumentUrl(result.url);
      const generatedAt = new Date(result.generatedAt);
      const expiresAt = new Date(
        Date.now() + logisticsConfig.documentTtlSeconds * 1_000,
      );
      const updated = await ShipmentModel.findOneAndUpdate(
        {
          _id: claimed._id,
          [`${kind}.operationId`]: operationId,
          [`${kind}.status`]: "pending",
        },
        {
          $set: {
            [`${kind}.status`]: "ready",
            [`${kind}.url`]: result.url,
            [`${kind}.generatedAt`]: generatedAt,
            [`${kind}.expiresAt`]: expiresAt,
          },
          $unset: { [`${kind}.operationId`]: 1, [`${kind}.lastError`]: 1 },
        },
        { new: true },
      );
      if (!updated) throw new ApiError(409, `${kind} generation claim expired`);
      await audit({
        action: `${kind}_generated`,
        actorType: adminId ? "admin" : "system",
        admin: adminId,
        order: updated.order,
        shipment: updated._id,
        newValue: { expiresAt },
      });
      return updated;
    } catch (error) {
      const message = safeDocumentError(error);
      await ShipmentModel.updateOne(
        { _id: claimed._id, [`${kind}.operationId`]: operationId },
        {
          $set: {
            [`${kind}.status`]: "failed",
            [`${kind}.lastError`]: message,
          },
          $unset: {
            [`${kind}.operationId`]: 1,
            [`${kind}.url`]: 1,
            [`${kind}.expiresAt`]: 1,
          },
        },
      );
      await audit({
        action: `${kind}_generate_failed`,
        actorType: adminId ? "admin" : "system",
        admin: adminId,
        order: claimed.order,
        shipment: claimed._id,
        failureReason: message,
      });
      throw error;
    }
  },

  async documentAccess(
    shipmentId: string,
    kind: "label" | "invoice" | "manifest",
  ): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    const document = shipment[kind];
    if (!document?.url || document.status !== "ready")
      throw new ApiError(404, `${kind} is not ready`);
    if (!document.expiresAt || document.expiresAt <= new Date())
      throw new ApiError(409, `${kind} URL expired; generate it again`);
    assertDocumentUrl(document.url);
    return {
      shipmentId: String(shipment._id),
      kind,
      status: document.status,
      url: document.url,
      generatedAt: document.generatedAt,
      expiresAt: document.expiresAt,
    };
  },

  async refreshTracking(
    shipmentId: string,
    actorType: "admin" | "system" = "system",
    adminId?: string,
  ): Promise<unknown> {
    const source: ShiprocketSyncSource = actorType === "admin" ? "manual_sync" : "scheduled_reconciliation";
    const result = await this.reconcileShiprocketShipment(shipmentId, source, adminId) as { shipment: unknown };
    return result.shipment;
  },

  async reconcileShiprocketShipment(
    shipmentId: string,
    source: ShiprocketSyncSource,
    adminId?: string,
  ): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    if (shipment.provider !== "shiprocket") throw new ApiError(409, "Shipment is not managed by Shiprocket");
    if (!shipment.providerOrderId && !shipment.providerShipmentId) {
      throw new ApiError(409, "Create the Shiprocket order before synchronization");
    }
    await ShipmentModel.updateOne({ _id: shipment._id }, { $set: { lastSyncAttemptAt: new Date(), lastSyncSource: source } });
    try {
      const snapshot = await getLogisticsProvider().reconcileShipment({
        providerOrderId: shipment.providerOrderId ?? undefined,
        providerShipmentId: shipment.providerShipmentId ?? undefined,
        awb: shipment.awb ?? undefined,
        createdAt: shipment.createdAt.toISOString(),
      });
      const applied = await applyShiprocketSnapshot(shipment, snapshot, source);
      await audit({
        action: "shiprocket_reconciled",
        actorType: source === "manual_sync" ? "admin" : "system",
        admin: adminId,
        order: shipment.order,
        shipment: shipment._id,
        newValue: { source, status: snapshot.status, changed: applied.changed, scansAdded: applied.scansAdded },
      });
      return applied;
    } catch (error) {
      await recordShiprocketSyncFailure(shipmentId, source, error);
      await audit({
        action: "shiprocket_reconcile_failed",
        actorType: source === "manual_sync" ? "admin" : "system",
        admin: adminId,
        order: shipment.order,
        shipment: shipment._id,
        failureReason: error instanceof Error ? error.message.slice(0, 500) : "Shiprocket synchronization failed",
      });
      throw error;
    }
  },

  async reconcileActiveShiprocketShipments(input: {
    source?: Exclude<ShiprocketSyncSource, "webhook">;
    adminId?: string;
    limit?: number;
    concurrency?: number;
  } = {}): Promise<ShiprocketBulkSyncSummary> {
    const source = input.source ?? "manual_sync";
    const limit = Math.min(Math.max(Math.trunc(input.limit ?? 50), 1), 100);
    const concurrency = Math.min(Math.max(Math.trunc(input.concurrency ?? 3), 1), 5);
    const shipments = await ShipmentModel.find({
      provider: "shiprocket",
      shipmentStatus: { $in: activeShiprocketSyncStatuses },
      $or: [
        { providerOrderId: { $type: "string" } },
        { providerShipmentId: { $type: "string" } },
      ],
    })
      .sort({ lastSuccessfulSyncAt: 1, updatedAt: 1 })
      .limit(limit)
      .select("_id")
      .lean();
    const summary: ShiprocketBulkSyncSummary = {
      scanned: shipments.length,
      changed: 0,
      unchanged: 0,
      failed: 0,
      shiprocketMutations: 0,
    };
    for (let offset = 0; offset < shipments.length; offset += concurrency) {
      const results = await Promise.allSettled(
        shipments.slice(offset, offset + concurrency).map((shipment) =>
          this.reconcileShiprocketShipment(String(shipment._id), source, input.adminId),
        ),
      );
      for (const result of results) {
        if (result.status === "rejected") summary.failed += 1;
        else if ((result.value as { changed?: boolean }).changed) summary.changed += 1;
        else summary.unchanged += 1;
      }
    }
    await audit({
      action: "shiprocket_bulk_reconciled",
      actorType: source === "manual_sync" ? "admin" : "system",
      admin: input.adminId,
      newValue: summary,
    });
    return summary;
  },

  async cancel(shipmentId: string, adminId: string): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    if (shipment.shipmentStatus === "cancelled") return shipment;
    if (!shipment.awb)
      throw new ApiError(409, "An AWB is required to cancel this shipment");
    try {
      const result = await getLogisticsProvider().cancelShipment({
        awb: shipment.awb,
      });
      shipment.shipmentStatus = "cancelled";
      shipment.rawProviderStatus = result.status;
      await shipment.save();
      if (shipment.shipmentType !== "return" && shipment.shipmentType !== "exchange_replacement") {
        await OrderModel.updateOne(
          { _id: shipment.order, orderStatus: { $nin: ["delivered", "returned"] } },
          {
            $set: { fulfillmentStatus: "cancelled", orderStatus: "cancelled" },
            $push: { timeline: { status: "cancelled", timestamp: new Date(), note: "Forward shipment cancelled in Shiprocket by an administrator; payment and refund state were not changed" } },
          },
        );
      }
      await audit({
        action: "shipment_cancelled",
        actorType: "admin",
        admin: adminId,
        order: shipment.order,
        shipment: shipment._id,
        newValue: result,
      });
      try {
        const reconciled = await this.reconcileShiprocketShipment(String(shipment._id), "manual_sync", adminId) as { shipment: unknown };
        return reconciled.shipment;
      } catch {
        return shipment;
      }
    } catch (error) {
      return providerFailure(shipmentId, "shipment_cancel_failed", error);
    }
  },

  async recordNdrAction(
    shipmentId: string,
    input: { action: string; note?: string },
    adminId: string,
  ): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    if (shipment.shipmentStatus !== "ndr")
      throw new ApiError(409, "NDR actions require an NDR shipment");
    if (!shipment.ndr || !shipment.rto)
      throw new ApiError(500, "Shipment exception state is unavailable");
    if (
      input.action === "reattempt" &&
      shipment.ndr.reattemptStatus === "requested"
    )
      return shipment;
    const latestAction = shipment.ndr.actionHistory.at(-1);
    if (
      latestAction?.action === input.action &&
      (latestAction.note ?? "") === (input.note ?? "")
    )
      return shipment;
    shipment.ndr.currentAction = input.action;
    shipment.ndr.actionHistory.push({
      action: input.action as never,
      note: input.note,
      admin: objectId(adminId),
      createdAt: new Date(),
    });
    if (input.action === "reattempt")
      shipment.ndr.reattemptStatus = "requested";
    if (input.action === "contacted")
      shipment.ndr.lastCustomerContactAt = new Date();
    if (input.action === "accept_rto") {
      shipment.shipmentStatus = "rto_initiated";
      shipment.rto.status = "initiated";
      shipment.rto.initiatedAt = new Date();
    }
    await shipment.save();
    await audit({
      action: `ndr_${input.action}`,
      actorType: "admin",
      admin: adminId,
      order: shipment.order,
      shipment: shipment._id,
      newValue: input,
    });
    if (input.action === "reattempt")
      await LogisticsNotificationService.emit({
        eventType: "reattempt_requested",
        orderId: String(shipment.order),
        shipmentId: String(shipment._id),
      });
    if (input.action === "accept_rto")
      await LogisticsNotificationService.emit({
        eventType: "rto_initiated",
        orderId: String(shipment.order),
        shipmentId: String(shipment._id),
      });
    return shipment;
  },

  async markRtoWarehouse(
    shipmentId: string,
    input: { action: "received" | "inspection_passed" | "inspection_failed" },
    adminId: string,
  ): Promise<unknown> {
    const shipment = await getShipment(shipmentId);
    if (!shipment.shipmentStatus.startsWith("rto_"))
      throw new ApiError(409, "RTO warehouse actions require an RTO shipment");
    if (!shipment.rto)
      throw new ApiError(500, "Shipment RTO state is unavailable");
    if (input.action === "received") {
      if (
        [
          "inspection_pending",
          "inventory_restored",
          "damaged",
          "closed",
        ].includes(shipment.rto.status)
      )
        return shipment;
      shipment.rto.status = "inspection_pending";
      shipment.rto.inventoryRecoveryStatus = "inspection_pending";
      shipment.rto.warehouseReceivedAt = new Date();
    } else if (input.action === "inspection_passed") {
      if (shipment.rto.inventoryRecoveryStatus === "restored") return shipment;
      if (shipment.rto.inventoryRecoveryStatus !== "inspection_pending")
        throw new ApiError(
          409,
          "Record warehouse receipt before restoring RTO inventory",
        );
      const order = await OrderModel.findOneAndUpdate(
        { _id: shipment.order, stockReserved: true },
        {
          $set: { stockReserved: false },
          $push: {
            timeline: {
              status: "rto_inventory_recovery",
              timestamp: new Date(),
              note: "RTO warehouse inspection passed; inventory recovery started",
            },
          },
        },
        { new: false },
      );
      if (order) {
        try {
          await Promise.all(
            order.items.map((item) =>
              ProductModel.updateOne(
                { _id: item.product, "variants._id": item.variant },
                { $inc: { "variants.$.stock": item.quantity } },
              ),
            ),
          );
        } catch (error) {
          shipment.rto.inventoryRecoveryStatus = "warehouse_pending";
          await shipment.save();
          await OrderModel.updateOne(
            { _id: shipment.order },
            {
              $push: {
                timeline: {
                  status: "inventory_review",
                  timestamp: new Date(),
                  note: "RTO inspection passed; inventory restoration requires admin review",
                },
              },
            },
          );
          throw error;
        }
      }
      shipment.rto.status = "inventory_restored";
      shipment.rto.inventoryRecoveryStatus = "restored";
      shipment.rto.inspectedAt = new Date();
      shipment.rto.inventoryRestoredAt = new Date();
    } else {
      if (shipment.rto.inventoryRecoveryStatus === "damaged") return shipment;
      if (shipment.rto.inventoryRecoveryStatus !== "inspection_pending")
        throw new ApiError(
          409,
          "Record warehouse receipt before marking RTO inventory damaged",
        );
      shipment.rto.status = "damaged";
      shipment.rto.inventoryRecoveryStatus = "damaged";
      shipment.rto.inspectedAt = new Date();
    }
    await shipment.save();
    await audit({
      action: `rto_${input.action}`,
      actorType: "admin",
      admin: adminId,
      order: shipment.order,
      shipment: shipment._id,
    });
    return shipment;
  },

  async byId(shipmentId: string): Promise<unknown> {
    const shipment = await ShipmentModel.findById(objectId(shipmentId))
      .populate("order")
      .lean();
    if (!shipment) throw new ApiError(404, "Shipment not found");
    return shipment;
  },

  async trackingForOrder(orderId: string, userId: string): Promise<unknown> {
    const order = await OrderModel.findOne({
      _id: objectId(orderId),
      user: objectId(userId),
    }).lean();
    if (!order) throw new ApiError(404, "Order not found");
    const shipments = await ShipmentModel.find({ order: order._id })
      .sort({ createdAt: 1 })
      .lean();
    const forwardShipment = [...shipments].reverse().find((shipment) => shipment.shipmentType === 'forward');
    const deliveredAt = forwardShipment?.deliveredDate;
    const returnWindowEndsAt = deliveredAt ? new Date(deliveredAt.getTime() + 5 * 86_400_000) : undefined;
    const returnWindowRemainingMs = returnWindowEndsAt ? Math.max(0, returnWindowEndsAt.getTime() - Date.now()) : 0;
    const returnWindow = deliveredAt ? {
      deliveredAt,
      endsAt: returnWindowEndsAt,
      eligible: order.orderStatus !== 'cancelled' && forwardShipment?.shipmentStatus === 'delivered' && returnWindowRemainingMs > 0,
      daysRemaining: Math.ceil(returnWindowRemainingMs / 86_400_000)
    } : undefined;
    return {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      returnWindow,
      shipments: shipments.map((shipment) => {
        const effectiveStatus = shipment.shipmentType === 'forward' && order.orderStatus === 'cancelled' ? 'cancelled' : shipment.shipmentStatus;
        const projection = buildCustomerTrackingMilestones({ type: shipment.shipmentType, status: effectiveStatus, createdAt: shipment.createdAt, scans: shipment.trackingScans.map((scan) => ({ status: scan.status, message: scan.message, location: scan.location ?? undefined, timestamp: scan.timestamp })) });
        return ({
        id: String(shipment._id),
        type: shipment.shipmentType,
        status: customerStatus(effectiveStatus),
        courierName: shipment.courierName,
        awb: shipment.awb,
        estimatedDelivery: shipment.estimatedDelivery,
        latestUpdate: shipment.lastTrackingUpdate,
        latestLocation: shipment.trackingScans.at(-1)?.location,
        currentMilestone: projection.currentMilestone,
        latestMessage: projection.latestMessage,
        milestones: projection.milestones,
        scans: shipment.trackingScans.map((scan) => ({
          status: customerStatus(scan.status),
          message: customerStatusMessage(scan.status),
          location: scan.location,
          timestamp: scan.timestamp,
        })),
      }); }),
    };
  },

  async list(input: {
    page: number;
    limit: number;
    orderId?: string;
    status?: string;
    search?: string;
    type?: string;
  }): Promise<unknown> {
    const filter: Record<string, unknown> = {};
    if (input.orderId) filter.order = new Types.ObjectId(input.orderId);
    if (input.status === "rto")
      filter.shipmentStatus = {
        $in: ["rto_initiated", "rto_in_transit", "rto_delivered"],
      };
    else if (input.status) filter.shipmentStatus = input.status;
    if (input.type) filter.shipmentType = input.type;
    if (input.search)
      filter.$or = [
        { awb: { $regex: input.search, $options: "i" } },
        { sourceOrderId: { $regex: input.search, $options: "i" } },
        { courierName: { $regex: input.search, $options: "i" } },
      ];
    const [items, total] = await Promise.all([
      ShipmentModel.find(filter)
        .populate("order")
        .sort({ updatedAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean(),
      ShipmentModel.countDocuments(filter),
    ]);
    return {
      items,
      page: input.page,
      limit: input.limit,
      total,
      pages: Math.ceil(total / input.limit),
    };
  },

  async kpis(startDate?: string): Promise<unknown> {
    const parsedStart = startDate ? new Date(startDate) : undefined;
    if (parsedStart && Number.isNaN(parsedStart.getTime())) throw new ApiError(400, "Invalid logistics KPI start date");
    const dateFilter = parsedStart ? { createdAt: { $gte: parsedStart } } : {};
    const [total, ready, inTransit, delivered, ndr, rto, errors, cost, awaitingBilling] =
      await Promise.all([
        ShipmentModel.countDocuments(dateFilter),
        ShipmentModel.countDocuments({
          ...dateFilter,
          shipmentStatus: {
            $in: ["provider_order_created", "awb_assigned", "pickup_scheduled"],
          },
        }),
        ShipmentModel.countDocuments({
          ...dateFilter,
          shipmentStatus: {
            $in: [
              "picked_up",
              "shipped",
              "in_transit",
              "reached_destination_hub",
              "out_for_delivery",
            ],
          },
        }),
        ShipmentModel.countDocuments({ ...dateFilter, shipmentStatus: "delivered" }),
        ShipmentModel.countDocuments({ ...dateFilter, shipmentStatus: "ndr" }),
        ShipmentModel.countDocuments({
          ...dateFilter,
          shipmentStatus: {
            $in: ["rto_initiated", "rto_in_transit", "rto_delivered"],
          },
        }),
        ShipmentModel.countDocuments({ ...dateFilter, shipmentStatus: "error" }),
        ShipmentModel.aggregate<{ total: number }>([
          { $match: dateFilter },
          {
            $group: {
              _id: null,
              total: {
                $sum: effectiveLogisticsCost(),
              },
              billed: { $sum: { $cond: [{ $eq: ["$providerBillingStatus", "current"] }, { $ifNull: ["$providerBilledTotal", 0] }, 0] } },
              estimated: { $sum: { $cond: [{ $eq: ["$providerBillingStatus", "current"] }, 0, quotedProviderCost()] } },
            },
          },
        ]),
        ShipmentModel.countDocuments({ ...dateFilter, providerBillingStatus: { $ne: "current" }, $or: [{ providerOrderId: { $type: "string" } }, { providerShipmentId: { $type: "string" } }] }),
      ]);
    return {
      total,
      ready,
      inTransit,
      delivered,
      ndr,
      rto,
      errors,
      logisticsCost: money(cost[0]?.total ?? 0),
      billedLogisticsCost: money((cost[0] as { billed?: number } | undefined)?.billed ?? 0),
      estimatedLogisticsCost: money((cost[0] as { estimated?: number } | undefined)?.estimated ?? 0),
      shipmentsAwaitingBilling: awaitingBilling,
      deliveryRate: total ? money((delivered / total) * 100) : 0,
      ndrRate: total ? money((ndr / total) * 100) : 0,
      rtoRate: total ? money((rto / total) * 100) : 0,
    };
  },

  async syncHealth(): Promise<unknown> {
    const activeStatuses = [
      "provider_order_created", "awb_assigned", "pickup_scheduled", "out_for_pickup", "picked_up",
      "shipped", "in_transit", "reached_destination_hub", "out_for_delivery", "delivery_exception",
      "ndr", "rto_initiated", "rto_in_transit",
    ];
    const [activeShipments, lastWebhook, lastReconciliation, syncFailures] = await Promise.all([
      ShipmentModel.countDocuments({ provider: "shiprocket", shipmentStatus: { $in: activeStatuses } }),
      ShipmentModel.findOne({ lastWebhookAt: { $exists: true } }).sort({ lastWebhookAt: -1 }).select("lastWebhookAt").lean(),
      ShipmentModel.findOne({ lastSyncSource: "scheduled_reconciliation", lastSuccessfulSyncAt: { $exists: true } }).sort({ lastSuccessfulSyncAt: -1 }).select("lastSuccessfulSyncAt").lean(),
      ShipmentModel.countDocuments({ provider: "shiprocket", syncErrorCode: { $type: "string" }, shipmentStatus: { $in: activeStatuses } }),
    ]);
    return {
      activeShipments,
      lastWebhookAt: lastWebhook?.lastWebhookAt,
      lastReconciliationAt: lastReconciliation?.lastSuccessfulSyncAt,
      syncFailures,
    };
  },

  async analytics(days = 30): Promise<unknown> {
    const start = new Date(Date.now() - days * 86_400_000);
    const [daily, couriers, statuses] = await Promise.all([
      ShipmentModel.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            shipments: { $sum: 1 },
            cost: {
              $sum: effectiveLogisticsCost(),
            },
            billedShipments: { $sum: { $cond: [{ $eq: ["$providerBillingStatus", "current"] }, 1, 0] } },
            estimatedShipments: { $sum: { $cond: [{ $eq: ["$providerBillingStatus", "current"] }, 0, 1] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ShipmentModel.aggregate([
        {
          $match: {
            createdAt: { $gte: start },
            courierName: { $exists: true },
          },
        },
        {
          $group: {
            _id: "$courierName",
            shipments: { $sum: 1 },
            delivered: {
              $sum: {
                $cond: [{ $eq: ["$shipmentStatus", "delivered"] }, 1, 0],
              },
            },
            ndr: {
              $sum: { $cond: [{ $eq: ["$shipmentStatus", "ndr"] }, 1, 0] },
            },
            cost: {
              $sum: effectiveLogisticsCost(),
            },
            billedShipments: { $sum: { $cond: [{ $eq: ["$providerBillingStatus", "current"] }, 1, 0] } },
            estimatedShipments: { $sum: { $cond: [{ $eq: ["$providerBillingStatus", "current"] }, 0, 1] } },
          },
        },
        { $sort: { shipments: -1 } },
      ]),
      ShipmentModel.aggregate([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: "$shipmentStatus", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    return { days, daily, couriers, statuses };
  },
};
