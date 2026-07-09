// Governed by .rules v1.0
import { CategoryModel } from '../models/category.model.js';
import { CollectionModel } from '../models/collection.model.js';
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { addIstDays, endOfIstDay, formatIstDay, startOfIstDay } from '../utils/analytics-simulation.js';

export interface AnalyticsPoint {
  day: string;
  revenue: number;
  orders: number;
}

export interface AnalyticsSummaryRange {
  startDate: string;
  endDate: string;
  timezone: 'Asia/Kolkata';
  preset: string;
  analyticsTestBatchId?: string;
}

export interface AnalyticsSummary {
  range: AnalyticsSummaryRange;
  generatedAt: string;
  summary: {
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
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
  };
  revenueByDay: Array<{ day: string; grossRevenue: number; netRevenue: number; orders: number; paidOrders: number }>;
  topProducts: Array<{ productId: string; title: string; sku: string; quantity: number; revenue: number; orders: number }>;
  topCategories: Array<{ categoryId: string; name: string; quantity: number; revenue: number; orders: number }>;
  topCollections: Array<{ collectionId: string; title: string; quantity: number; revenue: number; orders: number }>;
  coupons: Array<{ code: string; orders: number; discount: number; revenue: number }>;
  ordersByStatus: Record<string, number>;
  paymentStatus: Record<string, number>;
}

type OrderLike = {
  _id: unknown;
  user?: unknown;
  items: Array<{ product: unknown; title: string; sku: string; quantity: number; price: number }>;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  refundAmount?: number;
  createdAt: Date;
};

type ProductLike = {
  _id: unknown;
  title: string;
  category?: unknown;
  collections?: unknown[];
  variants?: Array<{ sku?: string }>;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;
const objectId = (value: unknown): string => String(value && typeof value === 'object' && '_id' in value ? (value as { _id: unknown })._id : value);
const isRevenueEligible = (order: OrderLike): boolean => order.orderStatus !== 'cancelled' && (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded');
const netRevenueFor = (order: OrderLike): number => {
  if (order.orderStatus === 'cancelled') return 0;
  if (order.paymentStatus === 'paid') return order.total;
  if (order.paymentStatus === 'refunded') return Math.max(0, order.total - (order.refundAmount ?? order.total));
  return 0;
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
    return { startDate, endDate, timezone: 'Asia/Kolkata', preset: 'custom', analyticsTestBatchId };
  }
  const analyticsTestBatchId = typeof query.analyticsTestBatchId === 'string' && query.analyticsTestBatchId.trim() ? query.analyticsTestBatchId.trim() : undefined;
  if (preset === 'last7') return { startDate: addIstDays(today, -6), endDate: today, timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  if (preset === 'last30') return { startDate: addIstDays(today, -29), endDate: today, timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  if (preset === 'previous30') return { startDate: addIstDays(today, -59), endDate: addIstDays(today, -30), timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  if (preset === 'thisMonth') return { startDate: today.slice(0, 8) + '01', endDate: today, timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  if (preset === 'lastMonth') {
    const currentMonthStart = startOfIstDay(today.slice(0, 8) + '01');
    const lastMonthEnd = formatIstDay(new Date(currentMonthStart.getTime() - 1));
    return { startDate: lastMonthEnd.slice(0, 8) + '01', endDate: lastMonthEnd, timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  }
  if (preset === 'saleWeek') return { startDate: '2026-06-03', endDate: '2026-06-10', timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  if (preset === 'full60') return { startDate: addIstDays(today, -59), endDate: today, timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  throw new ApiError(400, 'Unsupported analytics preset');
};

export const AdminService = {
  async overview(): Promise<Record<string, number>> { const start = new Date(); start.setHours(0, 0, 0, 0); const [orders, users, products, revenue] = await Promise.all([OrderModel.countDocuments({ createdAt: { $gte: start } }), UserModel.countDocuments(), ProductModel.countDocuments({ isActive: true }), OrderModel.aggregate<{ total: number }>([{ $match: { paymentStatus: 'paid', createdAt: { $gte: start } } }, { $group: { _id: null, total: { $sum: '$total' } } }])]); return { revenue: revenue[0]?.total ?? 0, orders, users, products, conversionRate: orders > 0 && users > 0 ? Number(((orders / users) * 100).toFixed(2)) : 0 }; },
  async analytics(days: number): Promise<AnalyticsPoint[]> {
    const safeDays = Math.min(Math.max(days, 7), 90);
    const endDate = formatIstDay(new Date());
    const startDate = addIstDays(endDate, -(safeDays - 1));
    const summary = await this.analyticsSummary({ startDate, endDate });
    return summary.revenueByDay.map((point) => ({ day: point.day, revenue: point.netRevenue, orders: point.orders }));
  },

  async analyticsSummary(query: Record<string, unknown>): Promise<AnalyticsSummary> {
    const range = analyticsRange(query);
    const start = startOfIstDay(range.startDate);
    const end = endOfIstDay(range.endDate);
    const orderMatch: Record<string, unknown> = { createdAt: { $gte: start, $lte: end } };
    if (range.analyticsTestBatchId) orderMatch.analyticsTestBatchId = range.analyticsTestBatchId;
    const orders = await OrderModel.find(orderMatch).select('-shippingAddress -billingAddress -timeline').lean<OrderLike[]>();
    const productIds = [...new Set(orders.flatMap((order) => order.items.map((item) => objectId(item.product))))];
    const userIds = [...new Set(orders.flatMap((order) => order.user ? [objectId(order.user)] : []))];
    const [products, categories, collections, users] = await Promise.all([
      ProductModel.find({ _id: { $in: productIds } }).select('title category collections variants').lean<ProductLike[]>(),
      CategoryModel.find().select('name').lean<Array<{ _id: unknown; name: string }>>(),
      CollectionModel.find().select('title').lean<Array<{ _id: unknown; title: string }>>(),
      UserModel.find({ _id: { $in: userIds } }).select('createdAt').lean<Array<{ _id: unknown; createdAt: Date }>>()
    ]);

    const orderUsers = new Set(userIds);
    const orderCountsByUser = new Map<string, number>();
    for (const order of orders) {
      if (!order.user) continue;
      const id = objectId(order.user);
      orderCountsByUser.set(id, (orderCountsByUser.get(id) ?? 0) + 1);
    }

    const summary: AnalyticsSummary['summary'] = {
      totalOrders: orders.length,
      paidOrders: orders.filter((order) => order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled').length,
      pendingOrders: orders.filter((order) => order.paymentStatus === 'pending').length,
      cancelledOrders: orders.filter((order) => order.orderStatus === 'cancelled').length,
      failedPaymentOrders: orders.filter((order) => order.paymentStatus === 'failed').length,
      refundedOrders: orders.filter((order) => order.paymentStatus === 'refunded').length,
      grossRevenue: roundMoney(orders.filter(isRevenueEligible).reduce((sum, order) => sum + order.subtotal, 0)),
      netRevenue: roundMoney(orders.reduce((sum, order) => sum + netRevenueFor(order), 0)),
      discounts: roundMoney(orders.filter(isRevenueEligible).reduce((sum, order) => sum + order.discount, 0)),
      tax: roundMoney(orders.filter(isRevenueEligible).reduce((sum, order) => sum + order.tax, 0)),
      shipping: roundMoney(orders.filter(isRevenueEligible).reduce((sum, order) => sum + order.shipping, 0)),
      averageOrderValue: 0,
      customers: orderUsers.size,
      newCustomers: users.filter((user) => user.createdAt >= start && user.createdAt <= end).length,
      returningCustomers: users.filter((user) => (orderCountsByUser.get(objectId(user._id)) ?? 0) > 1 || user.createdAt < start).length
    };
    summary.averageOrderValue = summary.paidOrders > 0 ? roundMoney(summary.netRevenue / summary.paidOrders) : 0;

    const revenueByDay: AnalyticsSummary['revenueByDay'] = [];
    for (let day = range.startDate; day <= range.endDate; day = addIstDays(day, 1)) {
      const dayOrders = orders.filter((order) => formatIstDay(order.createdAt) === day);
      revenueByDay.push({
        day,
        grossRevenue: roundMoney(dayOrders.filter(isRevenueEligible).reduce((sum, order) => sum + order.subtotal, 0)),
        netRevenue: roundMoney(dayOrders.reduce((sum, order) => sum + netRevenueFor(order), 0)),
        orders: dayOrders.length,
        paidOrders: dayOrders.filter((order) => order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled').length
      });
    }

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

    const ordersByStatus = orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.orderStatus] = (acc[order.orderStatus] ?? 0) + 1;
      return acc;
    }, {});
    const paymentStatus = orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.paymentStatus] = (acc[order.paymentStatus] ?? 0) + 1;
      return acc;
    }, {});

    return {
      range,
      generatedAt: new Date().toISOString(),
      summary,
      revenueByDay,
      topProducts: [...productRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ productId: row.productId, title: row.title, sku: row.sku, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
      topCategories: [...categoryRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ categoryId: row.categoryId, name: row.name, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
      topCollections: [...collectionRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ collectionId: row.collectionId, title: row.title, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
      coupons: [...couponRows.values()].sort((left, right) => right.discount - left.discount),
      ordersByStatus,
      paymentStatus
    };
  }
};
