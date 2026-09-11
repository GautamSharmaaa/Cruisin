// Governed by .rules v1.0
import { Types, type FilterQuery, type PipelineStage } from "mongoose";
import { InvoiceCounterModel } from "../models/invoice-counter.model.js";
import { InvoiceDownloadStatusModel } from "../models/invoice-download-status.model.js";
import { InvoiceModel, type InvoiceDocument } from "../models/invoice.model.js";
import { InvoiceSettingsModel } from "../models/invoice-settings.model.js";
import { OrderModel } from "../models/order.model.js";
import { ProductModel } from "../models/product.model.js";
import { UserModel } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";
import {
  allocateInvoiceLines,
  financialYearFor,
  isInvoiceEligible,
  roundInvoiceMoney,
} from "./invoice-rules.js";
import { effectiveOrderPaymentStatus } from "./order-payment-status.js";
export { financialYearFor, isInvoiceEligible } from "./invoice-rules.js";

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  orderStartDate?: string;
  orderEndDate?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  invoiceStatus?: string;
  state?: string;
  minAmount?: number;
  maxAmount?: number;
  sort?: "newest" | "oldest" | "total-asc" | "total-desc";
}

interface OrderItemSnapshot {
  product: Types.ObjectId;
  title: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: number;
  productCode?: string | null;
  hsnCode?: string | null;
  gstPercent?: number | null;
  mrp?: number | null;
}

interface OrderSnapshot {
  _id: Types.ObjectId;
  user?: Types.ObjectId | null;
  orderNumber?: string | null;
  createdAt: Date;
  items: OrderItemSnapshot[];
  shippingAddress: Record<string, string | undefined>;
  billingAddress: Record<string, string | undefined>;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  archivedAt?: Date | null;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  codFee?: number | null;
  total: number;
  couponCode?: string | null;
}

export interface InvoiceSettingsValue {
  legalName: string;
  tradeName: string;
  invoicePrefix: string;
  registeredAddress: string;
  gstin: string;
  state: string;
  stateCode: string;
  phone: string;
  email: string;
  footer: string;
  authorizedSignatory: string;
  signatureAssetUrl: string;
  bulkPdfLimit: number;
}

export const invoiceBusinessIdentity = {
  legalName: "Cruisin",
  tradeName: "CRUISIN",
  registeredAddress:
    "KV APPAREL 992/1, Gali No. 2, Kapashera Extention, Kapashera, New Delhi 110037, Near Mahadeep Public School, South West Delhi, Delhi, India",
  gstin: "07BZXPV5435K1ZB",
  state: "Delhi",
  stateCode: "07",
  phone: "8287846203",
  email: "",
} as const;

export const defaultInvoiceSettings: InvoiceSettingsValue = {
  ...invoiceBusinessIdentity,
  invoicePrefix: "CR",
  footer: "Thank you for shopping with Cruisin.",
  authorizedSignatory: "",
  signatureAssetUrl: "",
  bulkPdfLimit: 100,
};

const roundMoney = roundInvoiceMoney;
const dateStart = (value: string): Date =>
  new Date(`${value}T00:00:00.000+05:30`);
const dateEnd = (value: string): Date =>
  new Date(`${value}T23:59:59.999+05:30`);
const regexEscape = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const publicInvoiceEmail = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const email = value.trim();
  return email.toLowerCase().endsWith("@phone.cruisin.local") ? "" : email;
};

const publicInvoicePhone = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const phone = value.trim();
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && !/^0+$/.test(digits)
    ? phone
    : "";
};

const sanitizeInvoiceContact = (
  invoice: Record<string, unknown>,
): Record<string, unknown> => {
  const customer =
    (invoice.customer as Record<string, unknown> | undefined) ?? {};
  const sanitizeAddress = (value: unknown): unknown => {
    if (!value || typeof value !== "object") return value;
    const address = value as Record<string, unknown>;
    return { ...address, phone: publicInvoicePhone(address.phone) };
  };
  return {
    ...invoice,
    customer: {
      ...customer,
      email: publicInvoiceEmail(customer.email),
      phone: publicInvoicePhone(customer.phone),
    },
    billingAddress: sanitizeAddress(invoice.billingAddress),
    shippingAddress: sanitizeAddress(invoice.shippingAddress),
  };
};

const normalizeAddress = (
  address: Record<string, string | undefined>,
): Record<string, string> => ({
  fullName: address.fullName ?? "",
  phone: address.phone ?? "",
  line1: address.line1 ?? "",
  line2: address.line2 ?? "",
  city: address.city ?? "",
  state: address.state ?? "",
  postalCode: address.postalCode ?? "",
  country: address.country ?? "India",
});

const buildMatch = (filters: InvoiceFilters): FilterQuery<InvoiceDocument> => {
  const match: FilterQuery<InvoiceDocument> = {};
  if (filters.search) {
    const search = new RegExp(regexEscape(filters.search.trim()), "i");
    match.$or = [
      { invoiceNumber: search },
      { orderNumber: search },
      { "customer.name": search },
      { "customer.email": search },
      { "customer.phone": search },
    ];
  }
  if (filters.startDate || filters.endDate)
    match.invoiceDate = {
      ...(filters.startDate ? { $gte: dateStart(filters.startDate) } : {}),
      ...(filters.endDate ? { $lte: dateEnd(filters.endDate) } : {}),
    };
  if (filters.orderStartDate || filters.orderEndDate)
    match.orderDate = {
      ...(filters.orderStartDate
        ? { $gte: dateStart(filters.orderStartDate) }
        : {}),
      ...(filters.orderEndDate ? { $lte: dateEnd(filters.orderEndDate) } : {}),
    };
  if (filters.paymentMethod) match.paymentMethod = filters.paymentMethod;
  if (filters.invoiceStatus) match.invoiceStatus = filters.invoiceStatus;
  if (filters.state)
    match["customer.state"] = new RegExp(
      `^${regexEscape(filters.state)}$`,
      "i",
    );
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined)
    match.grandTotal = {
      ...(filters.minAmount !== undefined ? { $gte: filters.minAmount } : {}),
      ...(filters.maxAmount !== undefined ? { $lte: filters.maxAmount } : {}),
    };
  return match;
};

const sortFor = (sort: InvoiceFilters["sort"]): Record<string, 1 | -1> => {
  if (sort === "oldest") return { invoiceDate: 1, _id: 1 };
  if (sort === "total-asc") return { grandTotal: 1, invoiceDate: -1 };
  if (sort === "total-desc") return { grandTotal: -1, invoiceDate: -1 };
  return { invoiceDate: -1, _id: -1 };
};

const currentStatusPipeline = (filters: InvoiceFilters): PipelineStage[] => {
  const statusMatch: Record<string, string> = {};
  if (filters.paymentStatus)
    statusMatch.currentPaymentStatus = filters.paymentStatus;
  if (filters.orderStatus) statusMatch.currentOrderStatus = filters.orderStatus;
  return [
    {
      $lookup: {
        from: "orders",
        let: { invoiceOrderId: "$orderId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$invoiceOrderId"] } } },
          {
            $project: {
              _id: 0,
              paymentStatus: 1,
              paymentMode: 1,
              paymentMethod: 1,
              orderStatus: 1,
            },
          },
        ],
        as: "currentOrder",
      },
    },
    {
      $set: {
        currentPaymentStatus: {
          $ifNull: [
            { $arrayElemAt: ["$currentOrder.paymentStatus", 0] },
            "$paymentStatus",
          ],
        },
        currentOrderStatus: {
          $ifNull: [
            { $arrayElemAt: ["$currentOrder.orderStatus", 0] },
            "$orderStatus",
          ],
        },
      },
    },
    {
      $set: {
        currentPaymentStatus: {
          $cond: [
            {
              $and: [
                {
                  $or: [
                    { $eq: ["$paymentMethod", "cod"] },
                    {
                      $eq: [
                        { $arrayElemAt: ["$currentOrder.paymentMode", 0] },
                        "cod",
                      ],
                    },
                    {
                      $eq: [
                        { $arrayElemAt: ["$currentOrder.paymentMethod", 0] },
                        "cod",
                      ],
                    },
                  ],
                },
                {
                  $or: [
                    {
                      $in: ["$currentPaymentStatus", ["paid", "cod_collected"]],
                    },
                    {
                      $and: [
                        { $eq: ["$currentPaymentStatus", "cod_pending"] },
                        {
                          $in: [
                            "$currentOrderStatus",
                            ["delivered", "returned"],
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            "cod_collected",
            "$currentPaymentStatus",
          ],
        },
      },
    },
    { $unset: "currentOrder" },
    ...(Object.keys(statusMatch).length ? [{ $match: statusMatch }] : []),
  ];
};

const withCurrentStatus = async (
  invoices: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> => {
  const orderIds = invoices
    .map((invoice) => invoice.orderId)
    .filter(
      (value): value is Types.ObjectId => value instanceof Types.ObjectId,
    );
  const orders = await OrderModel.find({ _id: { $in: orderIds } })
    .select("_id paymentStatus paymentMode paymentMethod orderStatus")
    .lean();
  const statusById = new Map(orders.map((order) => [String(order._id), order]));
  return invoices.map((invoice) => {
    const current = statusById.get(String(invoice.orderId));
    const currentOrderStatus =
      current?.orderStatus ?? String(invoice.orderStatus ?? "");
    const currentPaymentStatus = effectiveOrderPaymentStatus({
      paymentStatus:
        current?.paymentStatus ?? String(invoice.paymentStatus ?? ""),
      paymentMode: current?.paymentMode,
      paymentMethod:
        current?.paymentMethod ?? String(invoice.paymentMethod ?? ""),
      orderStatus: currentOrderStatus,
    });
    return sanitizeInvoiceContact({
      ...invoice,
      seller: {
        ...((invoice.seller as Record<string, unknown> | undefined) ?? {}),
        ...invoiceBusinessIdentity,
      },
      currentPaymentStatus,
      currentOrderStatus,
    });
  });
};

const withDownloadStatus = async (
  invoices: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> => {
  const ids = invoices
    .map((invoice) => String(invoice._id ?? ""))
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  const statuses = ids.length
    ? await InvoiceDownloadStatusModel.find({ _id: { $in: ids } })
        .select(
          "_id downloadCount lastDownloadedAt lastDownloadedBy lastDownloadKind",
        )
        .lean()
    : [];
  const statusById = new Map(
    statuses.map((status) => [String(status._id), status]),
  );
  return invoices.map((invoice) => {
    const status = statusById.get(String(invoice._id));
    return sanitizeInvoiceContact({
      ...invoice,
      downloadStatus:
        status && status.downloadCount > 0 ? "downloaded" : "not_downloaded",
      downloadCount: status?.downloadCount ?? 0,
      lastDownloadedAt: status?.lastDownloadedAt,
      lastDownloadedBy: status?.lastDownloadedBy,
      lastDownloadKind: status?.lastDownloadKind,
    });
  });
};

const settings = async (): Promise<InvoiceSettingsValue> => {
  const value = await InvoiceSettingsModel.findById("global").lean();
  return {
    ...defaultInvoiceSettings,
    ...(value ?? {}),
    ...invoiceBusinessIdentity,
  } as InvoiceSettingsValue;
};

const nextSequence = async (financialYear: string): Promise<number> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const counter = await InvoiceCounterModel.findByIdAndUpdate(
        financialYear,
        { $inc: { sequence: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (counter) return counter.sequence;
    } catch (error) {
      const duplicate =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000;
      if (!duplicate || attempt === 2) throw error;
    }
  }
  throw new ApiError(500, "Invoice number could not be allocated");
};

export const InvoiceService = {
  async syncEligibleOrders(limit = 3): Promise<{
    eligibleOrders: number;
    alreadyGenerated: number;
    inspected: number;
    created: number;
    issues: Array<{ orderId: string; orderNumber: string; message: string }>;
    remainingEligible: number;
  }> {
    const safeLimit = Math.min(10, Math.max(1, Math.trunc(limit)));
    const eligibleMatch: FilterQuery<OrderSnapshot> = {
      archivedAt: { $exists: false },
      orderStatus: {
        $in: [
          "placed",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "returned",
        ],
      },
    };
    const [eligibleOrders, missing] = await Promise.all([
      OrderModel.countDocuments(eligibleMatch),
      OrderModel.aggregate<{
        candidates: Array<{
          _id: Types.ObjectId;
          orderNumber?: string;
          createdAt: Date;
        }>;
        total: Array<{ count: number }>;
      }>([
        { $match: eligibleMatch },
        {
          $lookup: {
            from: InvoiceModel.collection.name,
            localField: "_id",
            foreignField: "_id",
            as: "generatedInvoice",
          },
        },
        { $match: { generatedInvoice: { $eq: [] } } },
        {
          $facet: {
            candidates: [
              { $sort: { createdAt: 1, _id: 1 } },
              { $limit: safeLimit },
              { $project: { _id: 1, orderNumber: 1, createdAt: 1 } },
            ],
            total: [{ $count: "count" }],
          },
        },
      ] as PipelineStage[]),
    ]);
    const candidates = missing[0]?.candidates ?? [];
    const missingBefore = missing[0]?.total[0]?.count ?? 0;
    const issues: Array<{
      orderId: string;
      orderNumber: string;
      message: string;
    }> = [];
    let created = 0;
    for (const order of candidates) {
      const orderId = String(order._id);
      try {
        const invoice = await this.ensureForOrder(orderId, order.createdAt);
        if (invoice) created += 1;
        else
          issues.push({
            orderId,
            orderNumber: order.orderNumber ?? orderId,
            message: "Order is no longer eligible for an invoice",
          });
      } catch (error) {
        issues.push({
          orderId,
          orderNumber: order.orderNumber ?? orderId,
          message:
            error instanceof Error
              ? error.message
              : "Invoice generation failed",
        });
      }
    }
    const result = {
      eligibleOrders,
      alreadyGenerated: Math.max(0, eligibleOrders - missingBefore),
      inspected: candidates.length,
      created,
      issues,
      remainingEligible: Math.max(0, missingBefore - created),
    };
    logger.info("Eligible orders synchronized with invoices", result);
    return result;
  },

  async ensureForOrder(
    orderId: string,
    invoiceDate = new Date(),
  ): Promise<unknown | null> {
    if (!Types.ObjectId.isValid(orderId))
      throw new ApiError(400, "Invalid order id");
    const existing = await InvoiceModel.findById(orderId).lean();
    if (existing) return existing;
    const order = (await OrderModel.findById(
      orderId,
    ).lean()) as unknown as OrderSnapshot | null;
    if (!order || !isInvoiceEligible(order)) return null;
    const [business, customer, products] = await Promise.all([
      settings(),
      order.user
        ? UserModel.findById(order.user).select("name email phone").lean()
        : null,
      ProductModel.find({
        _id: { $in: order.items.map((item) => item.product) },
      })
        .select("_id productCode hsnCode gstPercent comparePrice")
        .lean(),
    ]);
    const metadata = new Map(
      (products as Array<Record<string, unknown>>).map((product) => [
        String(product._id),
        product,
      ]),
    );
    const financialYear = financialYearFor(invoiceDate);
    const sequence = await nextSequence(financialYear);
    const invoiceNumber = `${business.invoicePrefix}/${financialYear}/${String(sequence).padStart(6, "0")}`;
    const intraState = Boolean(
      business.state &&
      order.billingAddress.state &&
      business.state.toLowerCase() === order.billingAddress.state.toLowerCase(),
    );
    const allocations = allocateInvoiceLines(
      order.items.map((item) => ({
        price: item.price,
        quantity: item.quantity,
        gstRate: item.gstPercent ?? 0,
      })),
      order.discount,
      order.tax,
      intraState,
    );
    const items = order.items.map((item, index) => {
      const product = metadata.get(String(item.product));
      const allocation = allocations[index];
      const totalTax = allocation.totalTax;
      const storedRate =
        item.gstPercent ??
        (typeof product?.gstPercent === "number" ? product.gstPercent : 0);
      return {
        productId: item.product,
        productName: item.title,
        variant: [item.color, item.size].filter(Boolean).join(" / "),
        sku: item.sku,
        productCode:
          item.productCode ??
          (typeof product?.productCode === "string" ? product.productCode : ""),
        hsn:
          item.hsnCode ??
          (typeof product?.hsnCode === "string" ? product.hsnCode : ""),
        quantity: item.quantity,
        unitPrice: item.price,
        mrp:
          item.mrp ??
          (typeof product?.comparePrice === "number"
            ? product.comparePrice
            : item.price),
        discount: allocation.discount,
        taxableValue: allocation.taxableValue,
        gstRate: order.tax > 0 ? storedRate : 0,
        cgstRate: order.tax > 0 && intraState ? roundMoney(storedRate / 2) : 0,
        cgstAmount: allocation.cgstAmount,
        sgstRate: order.tax > 0 && intraState ? roundMoney(storedRate / 2) : 0,
        sgstAmount: allocation.sgstAmount,
        igstRate: order.tax > 0 && !intraState ? storedRate : 0,
        igstAmount: allocation.igstAmount,
        totalTax,
        lineTotal: roundMoney(allocation.taxableValue + totalTax),
      };
    });
    const cgst = roundMoney(
      items.reduce((sum, item) => sum + item.cgstAmount, 0),
    );
    const sgst = roundMoney(
      items.reduce((sum, item) => sum + item.sgstAmount, 0),
    );
    const igst = roundMoney(
      items.reduce((sum, item) => sum + item.igstAmount, 0),
    );
    const customerName =
      customer?.name ??
      order.billingAddress.fullName ??
      order.shippingAddress.fullName ??
      "Customer";
    try {
      const created = await InvoiceModel.create({
        _id: order._id,
        invoiceNumber,
        sequence,
        orderId: order._id,
        orderNumber: order.orderNumber ?? String(order._id),
        invoiceDate,
        orderDate: order.createdAt,
        financialYear,
        seller: business,
        customer: {
          name: customerName,
          email: publicInvoiceEmail(customer?.email),
          phone: publicInvoicePhone(
            customer?.phone ?? order.billingAddress.phone,
          ),
          gstin: "",
          state: order.billingAddress.state ?? "",
        },
        billingAddress: normalizeAddress(order.billingAddress),
        shippingAddress: normalizeAddress(order.shippingAddress),
        placeOfSupply: {
          state: order.billingAddress.state ?? "",
          stateCode: "",
        },
        items,
        subtotal: order.subtotal,
        productDiscount: order.couponCode ? 0 : order.discount,
        couponDiscount: order.couponCode ? order.discount : 0,
        promotionDiscount: 0,
        shippingCharge: order.shipping,
        codFee: order.codFee ?? 0,
        taxableValue: roundMoney(
          items.reduce((sum, item) => sum + item.taxableValue, 0),
        ),
        cgst,
        sgst,
        igst,
        totalTax: order.tax,
        grandTotal: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        invoiceStatus: "generated",
      });
      logger.info("Invoice created", {
        invoiceId: String(created._id),
        invoiceNumber,
        orderId,
        orderNumber: order.orderNumber,
      });
      return created.toObject();
    } catch (error) {
      const duplicate =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000;
      if (duplicate) return InvoiceModel.findById(orderId).lean();
      logger.error("Invoice creation failed", {
        orderId,
        orderNumber: order.orderNumber,
        error,
      });
      throw error;
    }
  },

  async list(filters: InvoiceFilters): Promise<Record<string, unknown>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 1000;
    const match = buildMatch(filters);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [facets, thisMonth] = await Promise.all([
      InvoiceModel.aggregate<{
        items: Array<Record<string, unknown>>;
        meta: Array<{ total: number }>;
        totals: Array<{ value: number; gst: number }>;
      }>([
        { $match: match },
        ...currentStatusPipeline(filters),
        {
          $facet: {
            items: [
              { $sort: sortFor(filters.sort) },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  items: 0,
                  seller: 0,
                  billingAddress: 0,
                  shippingAddress: 0,
                },
              },
            ],
            meta: [{ $count: "total" }],
            totals: [
              {
                $group: {
                  _id: null,
                  value: { $sum: "$grandTotal" },
                  gst: { $sum: "$totalTax" },
                },
              },
            ],
          },
        },
      ] as PipelineStage[]),
      InvoiceModel.countDocuments({ invoiceDate: { $gte: monthStart } }),
    ]);
    const result = facets[0] ?? { items: [], meta: [], totals: [] };
    const total = result.meta[0]?.total ?? 0;
    const items = await withDownloadStatus(result.items);
    return {
      items,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        totalInvoices: total,
        invoicesThisMonth: thisMonth,
        totalInvoicedValue: result.totals[0]?.value ?? 0,
        gstCollected: result.totals[0]?.gst ?? 0,
      },
    };
  },

  async byId(id: string): Promise<Record<string, unknown>> {
    const invoice = await InvoiceModel.findById(id).lean();
    if (!invoice) throw new ApiError(404, "Invoice not found");
    const current = await withCurrentStatus([
      invoice as unknown as Record<string, unknown>,
    ]);
    return (await withDownloadStatus(current))[0];
  },

  async selected(input: {
    invoiceIds?: string[];
    selectAll?: boolean;
    filters?: InvoiceFilters;
  }): Promise<Array<Record<string, unknown>>> {
    const business = await settings();
    if (input.selectAll) {
      const match = buildMatch(input.filters ?? {});
      const rows = await InvoiceModel.aggregate<Record<string, unknown>>([
        { $match: match },
        ...currentStatusPipeline(input.filters ?? {}),
        { $sort: sortFor(input.filters?.sort) },
        { $limit: business.bulkPdfLimit + 1 },
      ] as PipelineStage[]);
      if (rows.length > business.bulkPdfLimit)
        throw new ApiError(
          413,
          `Bulk PDF is limited to ${business.bulkPdfLimit} invoices. Narrow the filters and try again.`,
        );
      if (rows.length === 0)
        throw new ApiError(404, "No invoices match these filters");
      return rows.map((invoice) => ({
        ...invoice,
        seller: {
          ...((invoice.seller as Record<string, unknown> | undefined) ?? {}),
          ...invoiceBusinessIdentity,
        },
      }));
    }
    const ids = input.invoiceIds ?? [];
    if (ids.length > business.bulkPdfLimit)
      throw new ApiError(
        413,
        `Bulk PDF is limited to ${business.bulkPdfLimit} invoices`,
      );
    const rows = await InvoiceModel.find({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    }).lean();
    if (rows.length !== ids.length)
      throw new ApiError(404, "One or more selected invoices no longer exist");
    const byId = new Map(rows.map((row) => [String(row._id), row]));
    return withCurrentStatus(
      ids.map((id) => byId.get(id) as unknown as Record<string, unknown>),
    );
  },

  async getSettings(): Promise<InvoiceSettingsValue> {
    return settings();
  },
  async recordDownloaded(
    invoiceIds: string[],
    adminId: string | undefined,
    kind: "single" | "bulk",
  ): Promise<void> {
    const ids = [...new Set(invoiceIds)].filter((id) =>
      Types.ObjectId.isValid(id),
    );
    if (ids.length === 0) return;
    const now = new Date();
    await InvoiceDownloadStatusModel.bulkWrite(
      ids.map((id) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(id) },
          update: {
            $inc: { downloadCount: 1 },
            $set: {
              lastDownloadedAt: now,
              lastDownloadedBy: adminId ?? "",
              lastDownloadKind: kind,
            },
          },
          upsert: true,
        },
      })),
    );
  },
  async saveSettings(value: InvoiceSettingsValue): Promise<unknown> {
    return InvoiceSettingsModel.findByIdAndUpdate(
      "global",
      { $set: { ...value, ...invoiceBusinessIdentity } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
  },
};
