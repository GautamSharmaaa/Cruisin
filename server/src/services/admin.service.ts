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
    unitsSold: number;
    refunds: number;
  };
  comparison: {
    range: AnalyticsSummaryRange;
    summary: AnalyticsSummary['summary'];
    revenueByDay: Array<{ day: string; grossRevenue: number; netRevenue: number; discounts: number; refunds: number; orders: number; paidOrders: number }>;
    outstanding: { cod: number; partial: number; total: number };
  };
  revenueByDay: Array<{ day: string; grossRevenue: number; netRevenue: number; discounts: number; refunds: number; orders: number; paidOrders: number }>;
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
const collectedFor = (order: OrderLike): number => order.amountPaid && order.amountPaid > 0 ? Math.min(order.total, order.amountPaid) : order.total;
const isRevenueEligible = (order: OrderLike): boolean => order.orderStatus !== 'cancelled' && ['paid', 'partially_paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus);
const netRevenueFor = (order: OrderLike): number => {
  if (order.orderStatus === 'cancelled') return 0;
  if (order.paymentStatus === 'paid') return collectedFor(order);
  if (order.paymentStatus === 'partially_paid') return Math.max(0, order.amountPaid ?? 0);
  if (order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded') return Math.max(0, collectedFor(order) - (order.refundAmount ?? (order.paymentStatus === 'refunded' ? collectedFor(order) : 0)));
  return 0;
};

const outstandingFor = (orders: OrderLike[]): { cod: number; partial: number; total: number } => {
  const cod = roundMoney(orders.filter((order) => order.paymentMode === 'cod' && order.paymentStatus === 'cod_pending').reduce((sum, order) => sum + (order.amountDue ?? order.total), 0));
  const partial = roundMoney(orders.filter((order) => order.paymentMode === 'partial' && order.paymentStatus === 'partially_paid').reduce((sum, order) => sum + (order.amountDue ?? Math.max(0, order.total - (order.amountPaid ?? 0))), 0));
  return { cod, partial, total: roundMoney(cod + partial) };
};

const summarizeOrders = (orders: OrderLike[], users: AnalyticsUserLike[], start: Date, end: Date): AnalyticsSummary['summary'] => {
  const orderUsers = new Set(orders.flatMap((order) => order.user ? [objectId(order.user)] : []));
  const orderCountsByUser = new Map<string, number>();
  for (const order of orders) {
    if (!order.user) continue;
    const id = objectId(order.user);
    orderCountsByUser.set(id, (orderCountsByUser.get(id) ?? 0) + 1);
  }
  const relevantUsers = users.filter((user) => orderUsers.has(objectId(user._id)));
  const summary: AnalyticsSummary['summary'] = {
    totalOrders: orders.length,
    paidOrders: orders.filter((order) => order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled').length,
    pendingOrders: orders.filter((order) => order.paymentStatus === 'pending').length,
    cancelledOrders: orders.filter((order) => order.orderStatus === 'cancelled').length,
    failedPaymentOrders: orders.filter((order) => order.paymentStatus === 'failed').length,
    refundedOrders: orders.filter((order) => order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded').length,
    grossRevenue: roundMoney(orders.filter(isRevenueEligible).reduce((sum, order) => sum + order.subtotal, 0)),
    netRevenue: roundMoney(orders.reduce((sum, order) => sum + netRevenueFor(order), 0)),
    discounts: roundMoney(orders.filter(isRevenueEligible).reduce((sum, order) => sum + order.discount, 0)),
    tax: roundMoney(orders.filter(isRevenueEligible).reduce((sum, order) => sum + order.tax, 0)),
    shipping: roundMoney(orders.filter(isRevenueEligible).reduce((sum, order) => sum + order.shipping, 0)),
    averageOrderValue: 0,
    customers: orderUsers.size,
    newCustomers: relevantUsers.filter((user) => user.createdAt >= start && user.createdAt <= end).length,
    returningCustomers: relevantUsers.filter((user) => (orderCountsByUser.get(objectId(user._id)) ?? 0) > 1 || user.createdAt < start).length,
    unitsSold: orders.filter(isRevenueEligible).reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + item.quantity, 0), 0),
    refunds: roundMoney(orders.reduce((sum, order) => sum + (order.refundAmount ?? 0), 0))
  };
  summary.averageOrderValue = summary.paidOrders > 0 ? roundMoney(summary.netRevenue / summary.paidOrders) : 0;
  return summary;
};

const dailyRevenue = (orders: OrderLike[], startDate: string, endDate: string): AnalyticsSummary['revenueByDay'] => {
  const rows: AnalyticsSummary['revenueByDay'] = [];
  for (let day = startDate; day <= endDate; day = addIstDays(day, 1)) {
    const dayOrders = orders.filter((order) => formatIstDay(order.createdAt) === day);
    rows.push({
      day,
      grossRevenue: roundMoney(dayOrders.filter(isRevenueEligible).reduce((sum, order) => sum + order.subtotal, 0)),
      netRevenue: roundMoney(dayOrders.reduce((sum, order) => sum + netRevenueFor(order), 0)),
      discounts: roundMoney(dayOrders.filter(isRevenueEligible).reduce((sum, order) => sum + order.discount, 0)),
      refunds: roundMoney(dayOrders.reduce((sum, order) => sum + (order.refundAmount ?? 0), 0)),
      orders: dayOrders.length,
      paidOrders: dayOrders.filter((order) => order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled').length
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
    return { startDate, endDate, timezone: 'Asia/Kolkata', preset: 'custom', analyticsTestBatchId };
  }
  const analyticsTestBatchId = typeof query.analyticsTestBatchId === 'string' && query.analyticsTestBatchId.trim() ? query.analyticsTestBatchId.trim() : undefined;
  if (preset === 'last7') return { startDate: addIstDays(today, -6), endDate: today, timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  if (preset === 'today') return { startDate: today, endDate: today, timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  if (preset === 'last30') return { startDate: addIstDays(today, -29), endDate: today, timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
  if (preset === 'last90') return { startDate: addIstDays(today, -89), endDate: today, timezone: 'Asia/Kolkata', preset, analyticsTestBatchId };
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
    const dayCount = Math.round((startOfIstDay(range.endDate).getTime() - start.getTime()) / 86_400_000) + 1;
    const previousEndDate = addIstDays(range.startDate, -1);
    const previousStartDate = addIstDays(previousEndDate, -(dayCount - 1));
    const previousRange: AnalyticsSummaryRange = { startDate: previousStartDate, endDate: previousEndDate, timezone: 'Asia/Kolkata', preset: 'previous-equivalent-period', analyticsTestBatchId: range.analyticsTestBatchId };
    const orderMatch: Record<string, unknown> = { createdAt: { $gte: start, $lte: end } };
    if (range.analyticsTestBatchId) orderMatch.analyticsTestBatchId = range.analyticsTestBatchId;
    const previousMatch: Record<string, unknown> = { createdAt: { $gte: startOfIstDay(previousStartDate), $lte: endOfIstDay(previousEndDate) } };
    if (range.analyticsTestBatchId) previousMatch.analyticsTestBatchId = range.analyticsTestBatchId;
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
    const revenueByDay = dailyRevenue(orders, range.startDate, range.endDate);
    const previousRevenueByDay = dailyRevenue(previousOrders, previousStartDate, previousEndDate);
    const outstanding = outstandingFor(orders);
    const previousOutstanding = outstandingFor(previousOrders);

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
      comparison: { range: previousRange, summary: previousSummary, revenueByDay: previousRevenueByDay, outstanding: previousOutstanding },
      topProducts: [...productRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => { const product = productsById.get(row.productId); return { productId: row.productId, title: row.title, slug: product?.slug ?? '', image: product?.images?.[0]?.url, sku: row.sku, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size }; }),
      topCategories: [...categoryRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ categoryId: row.categoryId, name: row.name, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
      topCollections: [...collectionRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ collectionId: row.collectionId, title: row.title, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
      coupons: [...couponRows.values()].sort((left, right) => right.discount - left.discount),
      ordersByStatus,
      paymentStatus,
      paymentModes: orders.reduce<Record<string, number>>((acc, order) => { const mode = order.paymentMode ?? 'online'; acc[mode] = (acc[mode] ?? 0) + 1; return acc; }, {}),
      outstanding,
      inventory: (() => { const rows = inventoryProducts.map((product) => { const variants = (product.variants ?? []).filter((variant) => variant.enabled !== false); const stock = variants.reduce((sum, variant) => sum + Math.max(0, variant.stock ?? 0), 0); const threshold = product.lowStockThreshold ?? Math.max(1, ...variants.map((variant) => variant.lowStockThreshold ?? 5)); const status = stock <= 0 ? 'out_of_stock' as const : stock <= threshold ? 'low_stock' as const : null; return { productId: objectId(product._id), title: product.title, slug: product.slug ?? '', productCode: product.productCode ?? '', stock, threshold, status, value: stock * (product.costPrice ?? 0) }; }); const actionable = rows.filter((row): row is typeof row & { status: 'low_stock' | 'out_of_stock' } => row.status !== null).sort((left, right) => left.stock - right.stock); return { lowStock: actionable.filter((row) => row.status === 'low_stock').length, outOfStock: actionable.filter((row) => row.status === 'out_of_stock').length, estimatedValue: roundMoney(rows.reduce((sum, row) => sum + row.value, 0)), products: actionable.slice(0, 10).map(({ value: _value, ...row }) => row) }; })(),
      recentOrders: orders.slice().sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).slice(0, 10).map((order) => { const customer = users.find((user) => objectId(user._id) === objectId(order.user)); return { orderId: objectId(order._id), orderNumber: order.orderNumber ?? objectId(order._id), customer: customer?.name ?? customer?.email ?? 'Guest/legacy', date: order.createdAt.toISOString(), total: order.total, paymentMode: order.paymentMode ?? 'online', paymentStatus: order.paymentStatus, orderStatus: order.orderStatus }; })
    };
  }
};
