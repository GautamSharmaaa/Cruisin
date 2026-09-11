// Governed by .rules v1.0
import { CategoryModel } from '../models/category.model.js';
import { CollectionModel } from '../models/collection.model.js';
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { ShipmentModel } from '../models/shipment.model.js';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { addIstDays, endOfIstDay, formatIstDay, startOfIstDay } from '../utils/analytics-simulation.js';

export interface AnalyticsPoint {
  day: string;
  revenue: number;
  totalRevenue: number;
  orders: number;
  pendingCod: number;
  codOrders: number;
  prepaidOrders: number;
}

export interface AnalyticsSummaryRange {
  startDate: string;
  endDate: string;
  timezone: 'Asia/Kolkata';
  preset: string;
  analyticsTestBatchId?: string;
  includeTestOrders?: boolean;
}

export interface AnalyticsSummary {
  range: AnalyticsSummaryRange;
  generatedAt: string;
  summary: {
    totalOrders: number;
    paidOrders: number;
    todayOrders: number;
    codOrders: number;
    prepaidOrders: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    returnedOrders: number;
    rtoOrders: number;
    cancelledOrders: number;
    failedPaymentOrders: number;
    refundedOrders: number;
    grossRevenue: number;
    netRevenue: number;
    discounts: number;
    tax: number;
    shipping: number;
    averageOrderValue: number;
    customers: number;
    newCustomers: number;
    returningCustomers: number;
    unitsSold: number;
    refunds: number;
  };
  comparison: {
    range: AnalyticsSummaryRange;
    summary: AnalyticsSummary['summary'];
    revenueByDay: Array<{ day: string; grossRevenue: number; netRevenue: number; totalRevenue: number; discounts: number; refunds: number; orders: number; paidOrders: number; pendingCod: number; codOrders: number; prepaidOrders: number }>;
    outstanding: { cod: number; partial: number; total: number };
  };
  revenueByDay: Array<{ day: string; grossRevenue: number; netRevenue: number; totalRevenue: number; discounts: number; refunds: number; orders: number; paidOrders: number; pendingCod: number; codOrders: number; prepaidOrders: number }>;
  topProducts: Array<{ productId: string; title: string; slug: string; image?: string; sku: string; quantity: number; revenue: number; orders: number }>;
  topCategories: Array<{ categoryId: string; name: string; quantity: number; revenue: number; orders: number }>;
  topCollections: Array<{ collectionId: string; title: string; quantity: number; revenue: number; orders: number }>;
  coupons: Array<{ code: string; orders: number; discount: number; revenue: number }>;
  ordersByStatus: Record<string, number>;
  paymentStatus: Record<string, number>;
  paymentModes: Record<string, number>;
  outstanding: { cod: number; partial: number; total: number };
  inventory: {
    lowStock: number;
    outOfStock: number;
    estimatedValue: number;
    products: Array<{ productId: string; title: string; slug: string; productCode: string; stock: number; threshold: number; status: 'low_stock' | 'out_of_stock' }>;
  };
  recentOrders: Array<{ orderId: string; orderNumber: string; customer: string; date: string; total: number; paymentMode: string; paymentStatus: string; orderStatus: string }>;
}

type OrderLike = {
  _id: unknown;
  user?: unknown;
  items: Array<{ product: unknown; title: string; sku: string; quantity: number; price: number }>;
  paymentStatus: 'pending' | 'authorized' | 'paid' | 'failed' | 'partially_paid' | 'cod_pending' | 'refunded' | 'partially_refunded' | 'cancelled';
  paymentMode?: 'online' | 'cod' | 'partial';
  orderStatus: 'pending' | 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  amountPaid?: number;
  amountDue?: number;
  refundAmount?: number;
  orderNumber?: string;
  createdAt: Date;
  isTestOrder?: boolean;
  isAnalyticsTestData?: boolean;
};

type ProductLike = {
  _id: unknown;
  title: string;
  slug?: string;
  productCode?: string;
  images?: Array<{ url?: string }>;
  costPrice?: number;
  lowStockThreshold?: number;
  category?: unknown;
  collections?: unknown[];
  variants?: Array<{ sku?: string; stock?: number; enabled?: boolean; lowStockThreshold?: number }>;
};

type AnalyticsUserLike = { _id: unknown; name?: string; email?: string; createdAt: Date };

const roundMoney = (value: number): number => Math.round(value * 100) / 100;
const objectId = (value: unknown): string => String(value && typeof value === 'object' && '_id' in value ? (value as { _id: unknown })._id : value);
export const collectedFor = (order: OrderLike): number => {
  if ((order.amountPaid ?? 0) > 0) return Math.min(order.total, order.amountPaid ?? 0);
  return ['paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus) ? order.total : 0;
};
const isRevenueEligible = (order: OrderLike): boolean => collectedFor(order) > 0;
const refundFor = (order: OrderLike): number => Math.max(0, Math.min(collectedFor(order), order.refundAmount ?? (order.paymentStatus === 'refunded' ? collectedFor(order) : 0)));
export const netRevenueFor = (order: OrderLike): number => Math.max(0, collectedFor(order) - refundFor(order));
export const isBusinessOrder = (order: OrderLike): boolean => {
  if (isRevenueEligible(order)) return true;
  if (order.paymentMode === 'cod') return !['pending', 'cancelled'].includes(order.orderStatus);
  if (['authorized', 'partially_paid'].includes(order.paymentStatus)) return true;
  return ['confirmed', 'processing', 'shipped', 'delivered', 'returned'].includes(order.orderStatus);
};

const outstandingFor = (orders: OrderLike[]): { cod: number; partial: number; total: number } => {
  const cod = roundMoney(orders.filter((order) => order.paymentMode === 'cod' && order.paymentStatus === 'cod_pending').reduce((sum, order) => sum + (order.amountDue ?? order.total), 0));
  const partial = roundMoney(orders.filter((order) => order.paymentMode === 'partial' && order.paymentStatus === 'partially_paid').reduce((sum, order) => sum + (order.amountDue ?? Math.max(0, order.total - (order.amountPaid ?? 0))), 0));
  return { cod, partial, total: roundMoney(cod + partial) };
};

const summarizeOrders = (orders: OrderLike[], users: AnalyticsUserLike[], start: Date, end: Date): AnalyticsSummary['summary'] => {
  const businessOrders = orders.filter(isBusinessOrder);
  const orderUsers = new Set(businessOrders.flatMap((order) => order.user ? [objectId(order.user)] : []));
  const orderCountsByUser = new Map<string, number>();
  for (const order of businessOrders) {
    if (!order.user) continue;
    const id = objectId(order.user);
    orderCountsByUser.set(id, (orderCountsByUser.get(id) ?? 0) + 1);
  }
  const relevantUsers = users.filter((user) => orderUsers.has(objectId(user._id)));
  const summary: AnalyticsSummary['summary'] = {
    totalOrders: businessOrders.length,
    paidOrders: businessOrders.filter(isRevenueEligible).length,
    todayOrders: businessOrders.filter((order) => formatIstDay(order.createdAt) === formatIstDay(new Date())).length,
    codOrders: businessOrders.filter((order) => order.paymentMode === 'cod').length,
    prepaidOrders: businessOrders.filter((order) => order.paymentMode !== 'cod').length,
    pendingOrders: businessOrders.filter((order) => ['pending', 'placed', 'confirmed'].includes(order.orderStatus)).length,
    processingOrders: businessOrders.filter((order) => order.orderStatus === 'processing').length,
    shippedOrders: businessOrders.filter((order) => order.orderStatus === 'shipped').length,
    deliveredOrders: businessOrders.filter((order) => order.orderStatus === 'delivered').length,
    returnedOrders: businessOrders.filter((order) => order.orderStatus === 'returned').length,
    rtoOrders: 0,
    cancelledOrders: businessOrders.filter((order) => order.orderStatus === 'cancelled').length,
    failedPaymentOrders: orders.filter((order) => order.paymentStatus === 'failed').length,
    refundedOrders: businessOrders.filter((order) => order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded').length,
    grossRevenue: roundMoney(businessOrders.reduce((sum, order) => sum + collectedFor(order), 0)),
    netRevenue: roundMoney(businessOrders.reduce((sum, order) => sum + netRevenueFor(order), 0)),
    discounts: roundMoney(businessOrders.filter(isRevenueEligible).reduce((sum, order) => sum + order.discount, 0)),
    tax: roundMoney(businessOrders.filter(isRevenueEligible).reduce((sum, order) => sum + order.tax, 0)),
    shipping: roundMoney(businessOrders.filter(isRevenueEligible).reduce((sum, order) => sum + order.shipping, 0)),
    averageOrderValue: 0,
    customers: orderUsers.size,
    newCustomers: relevantUsers.filter((user) => user.createdAt >= start && user.createdAt <= end).length,
    returningCustomers: relevantUsers.filter((user) => (orderCountsByUser.get(objectId(user._id)) ?? 0) > 1 || user.createdAt < start).length,
    unitsSold: businessOrders.filter(isRevenueEligible).reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + item.quantity, 0), 0),
    refunds: roundMoney(businessOrders.reduce((sum, order) => sum + refundFor(order), 0))
  };
  summary.averageOrderValue = summary.paidOrders > 0 ? roundMoney(summary.grossRevenue / summary.paidOrders) : 0;
  return summary;
};

const dailyRevenue = (orders: OrderLike[], startDate: string, endDate: string): AnalyticsSummary['revenueByDay'] => {
  const rows: AnalyticsSummary['revenueByDay'] = [];
  for (let day = startDate; day <= endDate; day = addIstDays(day, 1)) {
    const dayOrders = orders.filter((order) => isBusinessOrder(order) && formatIstDay(order.createdAt) === day);
    const codOrders = dayOrders.filter((order) => order.paymentMode === 'cod');
    rows.push({
      day,
      grossRevenue: roundMoney(dayOrders.reduce((sum, order) => sum + collectedFor(order), 0)),
      netRevenue: roundMoney(dayOrders.reduce((sum, order) => sum + netRevenueFor(order), 0)),
      totalRevenue: roundMoney(dayOrders.reduce((sum, order) => sum + order.total - refundFor(order), 0)),
      discounts: roundMoney(dayOrders.filter(isRevenueEligible).reduce((sum, order) => sum + order.discount, 0)),
      refunds: roundMoney(dayOrders.reduce((sum, order) => sum + refundFor(order), 0)),
      orders: dayOrders.length,
      paidOrders: dayOrders.filter(isRevenueEligible).length,
      pendingCod: roundMoney(codOrders.filter((order) => order.paymentStatus === 'cod_pending').reduce((sum, order) => sum + (order.amountDue ?? order.total), 0)),
      codOrders: codOrders.length,
      prepaidOrders: dayOrders.filter((order) => order.paymentMode !== 'cod').length
    });
  }
  return rows;
};

const parseIsoDay = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, field + ' must be YYYY-MM-DD');
  return value;
};

const analyticsRange = (query: Record<string, unknown>): AnalyticsSummaryRange => {
  const now = new Date();
  const today = formatIstDay(now);
  const preset = typeof query.preset === 'string' ? query.preset : 'last30';
  if (query.startDate !== undefined || query.endDate !== undefined) {
    const startDate = parseIsoDay(query.startDate, 'startDate');
    const endDate = parseIsoDay(query.endDate, 'endDate');
    if (startOfIstDay(startDate) > endOfIstDay(endDate)) throw new ApiError(400, 'startDate must be before or equal to endDate');
    const analyticsTestBatchId = typeof query.analyticsTestBatchId === 'string' && query.analyticsTestBatchId.trim() ? query.analyticsTestBatchId.trim() : undefined;
    return { startDate, endDate, timezone: 'Asia/Kolkata', preset: 'custom', analyticsTestBatchId, includeTestOrders: query.includeTestOrders === true || query.includeTestOrders === 'true' };
  }
  const analyticsTestBatchId = typeof query.analyticsTestBatchId === 'string' && query.analyticsTestBatchId.trim() ? query.analyticsTestBatchId.trim() : undefined;
  const includeTestOrders = query.includeTestOrders === true || query.includeTestOrders === 'true';
  const base = { timezone: 'Asia/Kolkata' as const, preset, analyticsTestBatchId, includeTestOrders };
  if (preset === 'last7') return { startDate: addIstDays(today, -6), endDate: today, ...base };
  if (preset === 'today') return { startDate: today, endDate: today, ...base };
  if (preset === 'last30') return { startDate: addIstDays(today, -29), endDate: today, ...base };
  if (preset === 'last90') return { startDate: addIstDays(today, -89), endDate: today, ...base };
  if (preset === 'previous30') return { startDate: addIstDays(today, -59), endDate: addIstDays(today, -30), ...base };
  if (preset === 'thisMonth') return { startDate: today.slice(0, 8) + '01', endDate: today, ...base };
  if (preset === 'lastMonth') {
    const currentMonthStart = startOfIstDay(today.slice(0, 8) + '01');
    const lastMonthEnd = formatIstDay(new Date(currentMonthStart.getTime() - 1));
    return { startDate: lastMonthEnd.slice(0, 8) + '01', endDate: lastMonthEnd, ...base };
  }
  if (preset === 'saleWeek') return { startDate: '2026-06-03', endDate: '2026-06-10', ...base };
  if (preset === 'full60') return { startDate: addIstDays(today, -59), endDate: today, ...base };
  throw new ApiError(400, 'Unsupported analytics preset');
};

export const AdminService = {
  async overview(): Promise<Record<string, number>> {
    const [analytics, users, products] = await Promise.all([
      this.analyticsSummary({ preset: 'today' }),
      UserModel.countDocuments(),
      ProductModel.countDocuments({ isActive: true, isArchived: { $ne: true } })
    ]);
    const orders = analytics.summary.totalOrders;
    return { revenue: analytics.summary.netRevenue, orders, users, products, conversionRate: orders > 0 && users > 0 ? Number(((orders / users) * 100).toFixed(2)) : 0 };
  },
  async analytics(days: number): Promise<AnalyticsPoint[]> {
    const safeDays = Math.min(Math.max(days, 7), 90);
    const endDate = formatIstDay(new Date());
    const startDate = addIstDays(endDate, -(safeDays - 1));
    const summary = await this.analyticsSummary({ startDate, endDate });
    return summary.revenueByDay.map((point) => ({ day: point.day, revenue: point.netRevenue, totalRevenue: point.totalRevenue, orders: point.orders, pendingCod: point.pendingCod, codOrders: point.codOrders, prepaidOrders: point.prepaidOrders }));
  },

  async analyticsSummary(query: Record<string, unknown>): Promise<AnalyticsSummary> {
    const range = analyticsRange(query);
    const start = startOfIstDay(range.startDate);
    const end = endOfIstDay(range.endDate);
    const dayCount = Math.round((startOfIstDay(range.endDate).getTime() - start.getTime()) / 86_400_000) + 1;
    const previousEndDate = addIstDays(range.startDate, -1);
    const previousStartDate = addIstDays(previousEndDate, -(dayCount - 1));
    const previousRange: AnalyticsSummaryRange = { startDate: previousStartDate, endDate: previousEndDate, timezone: 'Asia/Kolkata', preset: 'previous-equivalent-period', analyticsTestBatchId: range.analyticsTestBatchId, includeTestOrders: range.includeTestOrders };
    const orderMatch: Record<string, unknown> = { createdAt: { $gte: start, $lte: end } };
    if (range.analyticsTestBatchId) orderMatch.analyticsTestBatchId = range.analyticsTestBatchId;
    const previousMatch: Record<string, unknown> = { createdAt: { $gte: startOfIstDay(previousStartDate), $lte: endOfIstDay(previousEndDate) } };
    if (range.analyticsTestBatchId) previousMatch.analyticsTestBatchId = range.analyticsTestBatchId;
    if (!range.includeTestOrders && !range.analyticsTestBatchId) {
      orderMatch.$and = [{ isTestOrder: { $ne: true } }, { isAnalyticsTestData: { $ne: true } }];
      previousMatch.$and = [{ isTestOrder: { $ne: true } }, { isAnalyticsTestData: { $ne: true } }];
    }
    const [orders, previousOrders, inventoryProducts] = await Promise.all([
      OrderModel.find(orderMatch).select('-shippingAddress -billingAddress -timeline').lean<OrderLike[]>(),
      OrderModel.find(previousMatch).select('-shippingAddress -billingAddress -timeline').lean<OrderLike[]>(),
      ProductModel.find({ isActive: true, isArchived: { $ne: true } }).select('title slug productCode costPrice lowStockThreshold variants').lean<ProductLike[]>()
    ]);
    const productIds = [...new Set(orders.flatMap((order) => order.items.map((item) => objectId(item.product))))];
    const userIds = [...new Set([...orders, ...previousOrders].flatMap((order) => order.user ? [objectId(order.user)] : []))];
    const [products, categories, collections, users] = await Promise.all([
      ProductModel.find({ _id: { $in: productIds } }).select('title slug productCode images category collections variants').lean<ProductLike[]>(),
      CategoryModel.find().select('name').lean<Array<{ _id: unknown; name: string }>>(),
      CollectionModel.find().select('title').lean<Array<{ _id: unknown; title: string }>>(),
      UserModel.find({ _id: { $in: userIds } }).select('name email createdAt').lean<AnalyticsUserLike[]>()
    ]);

    const summary = summarizeOrders(orders, users, start, end);
    const previousSummary = summarizeOrders(previousOrders, users, startOfIstDay(previousStartDate), endOfIstDay(previousEndDate));
    const [rtoOrderIds, previousRtoOrderIds] = await Promise.all([
      ShipmentModel.distinct('order', { order: { $in: orders.filter(isBusinessOrder).map((order) => order._id) }, shipmentStatus: { $in: ['rto_initiated', 'rto_in_transit', 'rto_delivered'] } }),
      ShipmentModel.distinct('order', { order: { $in: previousOrders.filter(isBusinessOrder).map((order) => order._id) }, shipmentStatus: { $in: ['rto_initiated', 'rto_in_transit', 'rto_delivered'] } })
    ]);
    summary.rtoOrders = rtoOrderIds.length;
    previousSummary.rtoOrders = previousRtoOrderIds.length;
    const revenueByDay = dailyRevenue(orders, range.startDate, range.endDate);
    const previousRevenueByDay = dailyRevenue(previousOrders, previousStartDate, previousEndDate);
    const outstanding = outstandingFor(orders.filter(isBusinessOrder));
    const previousOutstanding = outstandingFor(previousOrders.filter(isBusinessOrder));

    const productsById = new Map(products.map((product) => [objectId(product._id), product]));
    const categoriesById = new Map(categories.map((category) => [objectId(category._id), category]));
    const collectionsById = new Map(collections.map((collection) => [objectId(collection._id), collection]));
    const productRows = new Map<string, { productId: string; title: string; sku: string; quantity: number; revenue: number; orderIds: Set<string> }>();
    const categoryRows = new Map<string, { categoryId: string; name: string; quantity: number; revenue: number; orderIds: Set<string> }>();
    const collectionRows = new Map<string, { collectionId: string; title: string; quantity: number; revenue: number; orderIds: Set<string> }>();
    const couponRows = new Map<string, { code: string; orders: number; discount: number; revenue: number }>();

    for (const order of orders.filter(isRevenueEligible)) {
      const orderRevenue = netRevenueFor(order);
      const orderId = objectId(order._id);
      if (order.couponCode) {
        const current = couponRows.get(order.couponCode) ?? { code: order.couponCode, orders: 0, discount: 0, revenue: 0 };
        current.orders += 1;
        current.discount = roundMoney(current.discount + order.discount);
        current.revenue = roundMoney(current.revenue + orderRevenue);
        couponRows.set(order.couponCode, current);
      }
      for (const item of order.items) {
        const productId = objectId(item.product);
        const product = productsById.get(productId);
        if (!product) continue;
        const lineRevenue = roundMoney(item.price * item.quantity * (orderRevenue / Math.max(order.subtotal + order.tax + order.shipping - order.discount, 1)));
        const productRow = productRows.get(productId) ?? { productId, title: product.title, sku: item.sku || product.variants?.[0]?.sku || '', quantity: 0, revenue: 0, orderIds: new Set<string>() };
        productRow.quantity += item.quantity;
        productRow.revenue = roundMoney(productRow.revenue + lineRevenue);
        productRow.orderIds.add(orderId);
        productRows.set(productId, productRow);

        const categoryId = product.category ? objectId(product.category) : '';
        const category = categoriesById.get(categoryId);
        if (category) {
          const categoryRow = categoryRows.get(categoryId) ?? { categoryId, name: category.name, quantity: 0, revenue: 0, orderIds: new Set<string>() };
          categoryRow.quantity += item.quantity;
          categoryRow.revenue = roundMoney(categoryRow.revenue + lineRevenue);
          categoryRow.orderIds.add(orderId);
          categoryRows.set(categoryId, categoryRow);
        }
        for (const collectionId of (product.collections ?? []).map(objectId)) {
          const collection = collectionsById.get(collectionId);
          if (!collection) continue;
          const collectionRow = collectionRows.get(collectionId) ?? { collectionId, title: collection.title, quantity: 0, revenue: 0, orderIds: new Set<string>() };
          collectionRow.quantity += item.quantity;
          collectionRow.revenue = roundMoney(collectionRow.revenue + lineRevenue);
          collectionRow.orderIds.add(orderId);
          collectionRows.set(collectionId, collectionRow);
        }
      }
    }

    const businessOrders = orders.filter(isBusinessOrder);
    const ordersByStatus = businessOrders.reduce<Record<string, number>>((acc, order) => {
      acc[order.orderStatus] = (acc[order.orderStatus] ?? 0) + 1;
      return acc;
    }, {});
    const paymentStatus = businessOrders.reduce<Record<string, number>>((acc, order) => {
      acc[order.paymentStatus] = (acc[order.paymentStatus] ?? 0) + 1;
      return acc;
    }, {});

    return {
      range,
      generatedAt: new Date().toISOString(),
      summary,
      revenueByDay,
      comparison: { range: previousRange, summary: previousSummary, revenueByDay: previousRevenueByDay, outstanding: previousOutstanding },
      topProducts: [...productRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => { const product = productsById.get(row.productId); return { productId: row.productId, title: row.title, slug: product?.slug ?? '', image: product?.images?.[0]?.url, sku: row.sku, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size }; }),
      topCategories: [...categoryRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ categoryId: row.categoryId, name: row.name, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
      topCollections: [...collectionRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ collectionId: row.collectionId, title: row.title, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
      coupons: [...couponRows.values()].sort((left, right) => right.discount - left.discount),
      ordersByStatus,
      paymentStatus,
      paymentModes: businessOrders.reduce<Record<string, number>>((acc, order) => { const mode = order.paymentMode ?? 'online'; acc[mode] = (acc[mode] ?? 0) + 1; return acc; }, {}),
      outstanding,
      inventory: (() => { const rows = inventoryProducts.map((product) => { const variants = (product.variants ?? []).filter((variant) => variant.enabled !== false); const stock = variants.reduce((sum, variant) => sum + Math.max(0, variant.stock ?? 0), 0); const threshold = product.lowStockThreshold ?? Math.max(1, ...variants.map((variant) => variant.lowStockThreshold ?? 5)); const status = stock <= 0 ? 'out_of_stock' as const : stock <= threshold ? 'low_stock' as const : null; return { productId: objectId(product._id), title: product.title, slug: product.slug ?? '', productCode: product.productCode ?? '', stock, threshold, status, value: stock * (product.costPrice ?? 0) }; }); const actionable = rows.filter((row): row is typeof row & { status: 'low_stock' | 'out_of_stock' } => row.status !== null).sort((left, right) => left.stock - right.stock); return { lowStock: actionable.filter((row) => row.status === 'low_stock').length, outOfStock: actionable.filter((row) => row.status === 'out_of_stock').length, estimatedValue: roundMoney(rows.reduce((sum, row) => sum + row.value, 0)), products: actionable.slice(0, 10).map(({ value: _value, ...row }) => row) }; })(),
      recentOrders: businessOrders.slice().sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).slice(0, 10).map((order) => { const customer = users.find((user) => objectId(user._id) === objectId(order.user)); return { orderId: objectId(order._id), orderNumber: order.orderNumber ?? objectId(order._id), customer: customer?.name ?? customer?.email ?? 'Guest/legacy', date: order.createdAt.toISOString(), total: order.total, paymentMode: order.paymentMode ?? 'online', paymentStatus: order.paymentStatus, orderStatus: order.orderStatus }; })
    };
  }
};
