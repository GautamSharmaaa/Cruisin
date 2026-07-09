// Governed by .rules v1.0
export const ANALYTICS_QA_SEED = 20260701;
export const ANALYTICS_QA_TIMEZONE = 'Asia/Kolkata';
export const ANALYTICS_QA_NOW_ISO = '2026-07-02T12:00:00.000Z';
export const ANALYTICS_QA_START_DAY = '2026-05-04';
export const ANALYTICS_QA_END_DAY = '2026-07-02';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SimPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type SimOrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type SimCouponType = 'percentage' | 'fixed' | 'freeShipping';

export interface SimCategory {
  id: string;
  name: string;
  slug: string;
}

export interface SimCollection {
  id: string;
  title: string;
  slug: string;
}

export interface SimProduct {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  collectionIds: string[];
  basePrice: number;
  sku: string;
  stock: number;
  weight: number;
}

export interface SimCoupon {
  code: string;
  type: SimCouponType;
  value: number;
  maxDiscount?: number;
  minOrderValue: number;
}

export interface SimUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface SimOrderItem {
  productId: string;
  title: string;
  sku: string;
  quantity: number;
  price: number;
}

export interface SimOrder {
  id: string;
  userId?: string;
  sessionId: string;
  createdAt: string;
  paymentStatus: SimPaymentStatus;
  orderStatus: SimOrderStatus;
  items: SimOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  refundAmount: number;
  state: string;
  city: string;
}

export interface SimCart {
  id: string;
  userId?: string;
  sessionId: string;
  createdAt: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
}

export interface AnalyticsMetricSummary {
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
}

export interface AnalyticsExpectedSummary {
  batchId: string;
  seed: number;
  timezone: string;
  generatedAt: string;
  dateRange: { startDate: string; endDate: string };
  counts: {
    users: number;
    carts: number;
    orders: number;
    products: number;
    categories: number;
    collections: number;
    coupons: number;
    futureOrders: number;
  };
  ranges: Record<string, {
    startDate: string;
    endDate: string;
    summary: AnalyticsMetricSummary;
    revenueByDay: Array<{ day: string; grossRevenue: number; netRevenue: number; orders: number; paidOrders: number }>;
    topProducts: Array<{ productId: string; title: string; sku: string; quantity: number; revenue: number; orders: number }>;
    topCategories: Array<{ categoryId: string; name: string; quantity: number; revenue: number; orders: number }>;
    topCollections: Array<{ collectionId: string; title: string; quantity: number; revenue: number; orders: number }>;
    coupons: Array<{ code: string; orders: number; discount: number; revenue: number }>;
    ordersByStatus: Record<string, number>;
    paymentStatus: Record<string, number>;
  }>;
}

export interface AnalyticsSimulation {
  batchId: string;
  seed: number;
  timezone: string;
  users: SimUser[];
  categories: SimCategory[];
  collections: SimCollection[];
  products: SimProduct[];
  coupons: SimCoupon[];
  carts: SimCart[];
  orders: SimOrder[];
  expected: AnalyticsExpectedSummary;
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const createRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const istDate = (day: string, hour = 12, minute = 0, second = 0): Date => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date, hour, minute, second) - IST_OFFSET_MS);
};

export const formatIstDay = (date: Date): string => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
};

export const addIstDays = (day: string, days: number): string => {
  const date = istDate(day);
  return formatIstDay(new Date(date.getTime() + days * DAY_MS));
};

export const startOfIstDay = (day: string): Date => istDate(day, 0, 0, 0);
export const endOfIstDay = (day: string): Date => istDate(day, 23, 59, 59);

const weightedPick = <TValue extends { weight: number }>(values: TValue[], rng: () => number): TValue => {
  const total = values.reduce((sum, value) => sum + value.weight, 0);
  let cursor = rng() * total;
  for (const value of values) {
    cursor -= value.weight;
    if (cursor <= 0) return value;
  }
  return values.at(-1) as TValue;
};

const rangeFor = (name: string, now = new Date(ANALYTICS_QA_NOW_ISO)): { startDate: string; endDate: string } => {
  const today = formatIstDay(now);
  if (name === 'full60') return { startDate: ANALYTICS_QA_START_DAY, endDate: ANALYTICS_QA_END_DAY };
  if (name === 'last30') return { startDate: addIstDays(today, -29), endDate: today };
  if (name === 'previous30') return { startDate: addIstDays(today, -59), endDate: addIstDays(today, -30) };
  if (name === 'last7') return { startDate: addIstDays(today, -6), endDate: today };
  if (name === 'saleWeek') return { startDate: addIstDays(ANALYTICS_QA_START_DAY, 30), endDate: addIstDays(ANALYTICS_QA_START_DAY, 37) };
  if (name === 'thisMonth') return { startDate: today.slice(0, 8) + '01', endDate: today };
  if (name === 'lastMonth') return { startDate: '2026-06-01', endDate: '2026-06-30' };
  throw new Error('Unknown range ' + name);
};

const isRevenueEligible = (order: SimOrder): boolean => order.orderStatus !== 'cancelled' && (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded');
const netRevenueFor = (order: SimOrder): number => {
  if (order.orderStatus === 'cancelled') return 0;
  if (order.paymentStatus === 'paid') return order.total;
  if (order.paymentStatus === 'refunded') return Math.max(0, order.total - order.refundAmount);
  return 0;
};

const summarizeRange = (
  orders: SimOrder[],
  users: SimUser[],
  products: SimProduct[],
  categories: SimCategory[],
  collections: SimCollection[],
  startDate: string,
  endDate: string
): AnalyticsExpectedSummary['ranges'][string] => {
  const start = startOfIstDay(startDate);
  const end = endOfIstDay(endDate);
  const inRange = orders.filter((order) => {
    const createdAt = new Date(order.createdAt);
    return createdAt >= start && createdAt <= end;
  });
  const orderUsers = new Set(inRange.flatMap((order) => order.userId ? [order.userId] : []));
  const orderCountsByUser = new Map<string, number>();
  for (const order of inRange) {
    if (!order.userId) continue;
    orderCountsByUser.set(order.userId, (orderCountsByUser.get(order.userId) ?? 0) + 1);
  }

  const summary: AnalyticsMetricSummary = {
    totalOrders: inRange.length,
    paidOrders: inRange.filter((order) => order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled').length,
    pendingOrders: inRange.filter((order) => order.paymentStatus === 'pending').length,
    cancelledOrders: inRange.filter((order) => order.orderStatus === 'cancelled').length,
    failedPaymentOrders: inRange.filter((order) => order.paymentStatus === 'failed').length,
    refundedOrders: inRange.filter((order) => order.paymentStatus === 'refunded').length,
    grossRevenue: roundMoney(inRange.filter(isRevenueEligible).reduce((sum, order) => sum + order.subtotal, 0)),
    netRevenue: roundMoney(inRange.reduce((sum, order) => sum + netRevenueFor(order), 0)),
    discounts: roundMoney(inRange.filter(isRevenueEligible).reduce((sum, order) => sum + order.discount, 0)),
    tax: roundMoney(inRange.filter(isRevenueEligible).reduce((sum, order) => sum + order.tax, 0)),
    shipping: roundMoney(inRange.filter(isRevenueEligible).reduce((sum, order) => sum + order.shipping, 0)),
    averageOrderValue: 0,
    customers: orderUsers.size,
    newCustomers: users.filter((user) => {
      const createdAt = new Date(user.createdAt);
      return orderUsers.has(user.id) && createdAt >= start && createdAt <= end;
    }).length,
    returningCustomers: users.filter((user) => orderUsers.has(user.id) && ((orderCountsByUser.get(user.id) ?? 0) > 1 || new Date(user.createdAt) < start)).length
  };
  summary.averageOrderValue = summary.paidOrders > 0 ? roundMoney(summary.netRevenue / summary.paidOrders) : 0;

  const dayRows: AnalyticsExpectedSummary['ranges'][string]['revenueByDay'] = [];
  for (let day = startDate; day <= endDate; day = addIstDays(day, 1)) {
    const dayOrders = inRange.filter((order) => formatIstDay(new Date(order.createdAt)) === day);
    dayRows.push({
      day,
      grossRevenue: roundMoney(dayOrders.filter(isRevenueEligible).reduce((sum, order) => sum + order.subtotal, 0)),
      netRevenue: roundMoney(dayOrders.reduce((sum, order) => sum + netRevenueFor(order), 0)),
      orders: dayOrders.length,
      paidOrders: dayOrders.filter((order) => order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled').length
    });
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const collectionsById = new Map(collections.map((collection) => [collection.id, collection]));
  const productRows = new Map<string, { productId: string; title: string; sku: string; quantity: number; revenue: number; orderIds: Set<string> }>();
  const categoryRows = new Map<string, { categoryId: string; name: string; quantity: number; revenue: number; orderIds: Set<string> }>();
  const collectionRows = new Map<string, { collectionId: string; title: string; quantity: number; revenue: number; orderIds: Set<string> }>();
  const couponRows = new Map<string, { code: string; orders: number; discount: number; revenue: number }>();

  for (const order of inRange.filter(isRevenueEligible)) {
    const orderRevenue = netRevenueFor(order);
    if (order.couponCode) {
      const current = couponRows.get(order.couponCode) ?? { code: order.couponCode, orders: 0, discount: 0, revenue: 0 };
      current.orders += 1;
      current.discount = roundMoney(current.discount + order.discount);
      current.revenue = roundMoney(current.revenue + orderRevenue);
      couponRows.set(order.couponCode, current);
    }
    for (const item of order.items) {
      const product = productsById.get(item.productId);
      if (!product) continue;
      const lineRevenue = roundMoney(item.price * item.quantity * (orderRevenue / Math.max(order.subtotal + order.tax + order.shipping - order.discount, 1)));
      const productRow = productRows.get(product.id) ?? { productId: product.id, title: product.title, sku: product.sku, quantity: 0, revenue: 0, orderIds: new Set<string>() };
      productRow.quantity += item.quantity;
      productRow.revenue = roundMoney(productRow.revenue + lineRevenue);
      productRow.orderIds.add(order.id);
      productRows.set(product.id, productRow);

      const category = categoriesById.get(product.categoryId);
      if (category) {
        const categoryRow = categoryRows.get(category.id) ?? { categoryId: category.id, name: category.name, quantity: 0, revenue: 0, orderIds: new Set<string>() };
        categoryRow.quantity += item.quantity;
        categoryRow.revenue = roundMoney(categoryRow.revenue + lineRevenue);
        categoryRow.orderIds.add(order.id);
        categoryRows.set(category.id, categoryRow);
      }
      for (const collectionId of product.collectionIds) {
        const collection = collectionsById.get(collectionId);
        if (!collection) continue;
        const collectionRow = collectionRows.get(collection.id) ?? { collectionId: collection.id, title: collection.title, quantity: 0, revenue: 0, orderIds: new Set<string>() };
        collectionRow.quantity += item.quantity;
        collectionRow.revenue = roundMoney(collectionRow.revenue + lineRevenue);
        collectionRow.orderIds.add(order.id);
        collectionRows.set(collection.id, collectionRow);
      }
    }
  }

  const ordersByStatus = inRange.reduce<Record<string, number>>((acc, order) => {
    acc[order.orderStatus] = (acc[order.orderStatus] ?? 0) + 1;
    return acc;
  }, {});
  const paymentStatus = inRange.reduce<Record<string, number>>((acc, order) => {
    acc[order.paymentStatus] = (acc[order.paymentStatus] ?? 0) + 1;
    return acc;
  }, {});

  return {
    startDate,
    endDate,
    summary,
    revenueByDay: dayRows,
    topProducts: [...productRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ productId: row.productId, title: row.title, sku: row.sku, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
    topCategories: [...categoryRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ categoryId: row.categoryId, name: row.name, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
    topCollections: [...collectionRows.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 10).map((row) => ({ collectionId: row.collectionId, title: row.title, quantity: row.quantity, revenue: row.revenue, orders: row.orderIds.size })),
    coupons: [...couponRows.values()].sort((left, right) => right.discount - left.discount),
    ordersByStatus,
    paymentStatus
  };
};

export const createAnalyticsSimulation = (batchId = 'ANALYTICS_QA_BATCH_STATIC', seed = ANALYTICS_QA_SEED): AnalyticsSimulation => {
  const rng = createRng(seed);
  const categories: SimCategory[] = [
    { id: 'cat-men-tops', name: 'Men Tops', slug: 'qa-men-tops' },
    { id: 'cat-women-tops', name: 'Women Tops', slug: 'qa-women-tops' },
    { id: 'cat-bottoms', name: 'Bottoms', slug: 'qa-bottoms' },
    { id: 'cat-outerwear', name: 'Outerwear', slug: 'qa-outerwear' },
    { id: 'cat-accessories', name: 'Accessories', slug: 'qa-accessories' }
  ];
  const collections: SimCollection[] = [
    { id: 'col-quiet-uniform', title: 'QA Quiet Uniform', slug: 'qa-quiet-uniform' },
    { id: 'col-weekend-sale', title: 'QA Weekend Sale', slug: 'qa-weekend-sale' },
    { id: 'col-utility-drop', title: 'QA Utility Drop', slug: 'qa-utility-drop' },
    { id: 'col-accessories', title: 'QA Accessories Edit', slug: 'qa-accessories-edit' }
  ];
  const products: SimProduct[] = [
    ['QA Analytics Hoodie', 'cat-men-tops', ['col-quiet-uniform', 'col-weekend-sale'], 2999, 'QA-HOODIE', 140, 12],
    ['QA Analytics T-Shirt', 'cat-men-tops', ['col-quiet-uniform'], 1299, 'QA-TEE', 220, 18],
    ['QA Analytics Cargo', 'cat-bottoms', ['col-utility-drop'], 2499, 'QA-CARGO', 130, 15],
    ['QA Analytics Jogger', 'cat-bottoms', ['col-utility-drop', 'col-weekend-sale'], 1899, 'QA-JOGGER', 150, 16],
    ['QA Analytics Shorts', 'cat-bottoms', ['col-weekend-sale'], 999, 'QA-SHORTS', 160, 7],
    ['QA Analytics Cap', 'cat-accessories', ['col-accessories'], 699, 'QA-CAP', 180, 6],
    ['QA Analytics Jacket', 'cat-outerwear', ['col-utility-drop'], 3999, 'QA-JACKET', 90, 10],
    ['QA Analytics Oversized Tee', 'cat-women-tops', ['col-quiet-uniform'], 1499, 'QA-OVERSIZED-TEE', 210, 14],
    ['QA Analytics Shirt', 'cat-women-tops', ['col-quiet-uniform'], 1799, 'QA-SHIRT', 120, 8],
    ['QA Analytics Sling Bag', 'cat-accessories', ['col-accessories', 'col-weekend-sale'], 1599, 'QA-SLING', 95, 5]
  ].map(([title, categoryId, collectionIds, basePrice, sku, stock, weight], index) => ({
    id: 'prod-' + index,
    title: String(title),
    slug: String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    categoryId: String(categoryId),
    collectionIds: collectionIds as string[],
    basePrice: Number(basePrice),
    sku: String(sku),
    stock: Number(stock),
    weight: Number(weight)
  }));
  const coupons: SimCoupon[] = [
    { code: 'ANALYTICS10', type: 'percentage', value: 10, maxDiscount: 900, minOrderValue: 999 },
    { code: 'ANALYTICS500', type: 'fixed', value: 500, minOrderValue: 2499 },
    { code: 'ANALYTICSFREESHIP', type: 'freeShipping', value: 0, minOrderValue: 999 }
  ];
  const users: SimUser[] = Array.from({ length: 144 }, (_unused, index) => {
    const dayOffset = Math.max(-20, Math.floor(rng() * 65) - 15);
    return {
      id: 'user-' + index,
      name: 'QA Analytics Customer ' + String(index + 1).padStart(3, '0'),
      email: 'analytics.qa+' + batchId.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + index + '@cruisin.local',
      createdAt: istDate(addIstDays(ANALYTICS_QA_START_DAY, dayOffset), 9 + (index % 9), index % 60).toISOString()
    };
  });

  const productWeights = products.map((product) => ({ ...product, weight: product.weight }));
  const statuses: Array<{ paymentStatus: SimPaymentStatus | 'cancelled'; orderStatus: SimOrderStatus; weight: number }> = [
    { paymentStatus: 'paid', orderStatus: 'delivered', weight: 42 },
    { paymentStatus: 'paid', orderStatus: 'processing', weight: 16 },
    { paymentStatus: 'paid', orderStatus: 'shipped', weight: 12 },
    { paymentStatus: 'pending', orderStatus: 'pending', weight: 10 },
    { paymentStatus: 'cancelled', orderStatus: 'cancelled', weight: 8 },
    { paymentStatus: 'failed', orderStatus: 'pending', weight: 5 },
    { paymentStatus: 'refunded', orderStatus: 'delivered', weight: 7 }
  ];
  const cities = [
    ['Maharashtra', 'Mumbai'], ['Delhi', 'New Delhi'], ['Karnataka', 'Bengaluru'], ['Tamil Nadu', 'Chennai'],
    ['Telangana', 'Hyderabad'], ['Gujarat', 'Ahmedabad'], ['West Bengal', 'Kolkata'], ['Uttar Pradesh', 'Noida']
  ];
  const orders: SimOrder[] = [];
  const boundaryDays = [
    { day: ANALYTICS_QA_START_DAY, hour: 0, minute: 0 },
    { day: ANALYTICS_QA_START_DAY, hour: 23, minute: 59 },
    { day: '2026-05-31', hour: 23, minute: 59 },
    { day: '2026-06-01', hour: 0, minute: 0 },
    { day: '2026-06-30', hour: 23, minute: 59 },
    { day: '2026-07-01', hour: 0, minute: 0 },
    { day: '2026-07-01', hour: 18, minute: 15 },
    { day: '2026-07-02', hour: 11, minute: 45 }
  ];

  for (let index = 0; index < 180; index += 1) {
    const boundary = boundaryDays[index];
    let dayIndex = boundary ? Math.floor((startOfIstDay(boundary.day).getTime() - startOfIstDay(ANALYTICS_QA_START_DAY).getTime()) / DAY_MS) : index % 60;
    const weekend = [5, 6].includes(new Date(startOfIstDay(addIstDays(ANALYTICS_QA_START_DAY, dayIndex)).getTime() + IST_OFFSET_MS).getUTCDay());
    const saleWeek = dayIndex >= 30 && dayIndex <= 37;
    if (!boundary && (weekend || saleWeek) && rng() < 0.45) dayIndex = saleWeek ? 30 + Math.floor(rng() * 8) : dayIndex;
    const day = addIstDays(ANALYTICS_QA_START_DAY, dayIndex);
    const status = weightedPick(statuses, rng);
    const normalizedPaymentStatus: SimPaymentStatus = status.paymentStatus === 'cancelled' ? 'pending' : status.paymentStatus;
    const itemCount = 1 + Math.floor(rng() * 4);
    const items: SimOrderItem[] = [];
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const product = weightedPick(productWeights, rng);
      const quantity = 1 + (rng() > 0.82 ? 1 : 0) + (saleWeek && rng() > 0.9 ? 1 : 0);
      items.push({ productId: product.id, title: product.title, sku: product.sku + '-' + ['S', 'M', 'L', 'XL'][itemIndex % 4], quantity, price: product.basePrice });
    }
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const coupon = saleWeek && rng() < 0.72 ? coupons[Math.floor(rng() * coupons.length)] : rng() < 0.22 ? coupons[Math.floor(rng() * coupons.length)] : undefined;
    const shippingBeforeCoupon = subtotal >= 2999 ? 0 : 99;
    let discount = 0;
    let shipping = shippingBeforeCoupon;
    if (coupon && subtotal >= coupon.minOrderValue) {
      if (coupon.type === 'percentage') discount = Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount ?? subtotal);
      if (coupon.type === 'fixed') discount = Math.min(coupon.value, subtotal);
      if (coupon.type === 'freeShipping') shipping = 0;
    }
    discount = roundMoney(discount);
    const tax = roundMoney((subtotal - discount) * 0.05);
    const total = roundMoney(subtotal - discount + tax + shipping);
    const city = cities[index % cities.length];
    const createdAt = boundary
      ? istDate(boundary.day, boundary.hour, boundary.minute).toISOString()
      : istDate(day, 8 + Math.floor(rng() * 14), Math.floor(rng() * 60), Math.floor(rng() * 60)).toISOString();
    orders.push({
      id: 'order-' + index,
      userId: index % 11 === 0 ? undefined : users[(index * 7) % users.length].id,
      sessionId: 'qa-session-' + batchId + '-' + index,
      createdAt,
      paymentStatus: normalizedPaymentStatus,
      orderStatus: status.orderStatus,
      items,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      couponCode: coupon && (discount > 0 || coupon.type === 'freeShipping') ? coupon.code : undefined,
      refundAmount: normalizedPaymentStatus === 'refunded' ? total : 0,
      state: city[0],
      city: city[1]
    });
  }
  orders.push({
    ...orders[0],
    id: 'order-future',
    createdAt: istDate('2026-07-03', 9, 0).toISOString(),
    paymentStatus: 'paid',
    orderStatus: 'processing',
    sessionId: 'qa-session-' + batchId + '-future'
  });

  const carts: SimCart[] = Array.from({ length: 260 }, (_unused, index) => {
    const product = weightedPick(productWeights, rng);
    return {
      id: 'cart-' + index,
      userId: index % 5 === 0 ? undefined : users[(index * 3) % users.length].id,
      sessionId: 'qa-cart-session-' + batchId + '-' + index,
      createdAt: istDate(addIstDays(ANALYTICS_QA_START_DAY, index % 60), 10 + (index % 11), index % 60).toISOString(),
      items: [{ productId: product.id, quantity: 1 + (index % 3 === 0 ? 1 : 0), price: product.basePrice }]
    };
  });

  const rangeNames = ['full60', 'last30', 'previous30', 'last7', 'saleWeek', 'thisMonth', 'lastMonth'];
  const ranges = Object.fromEntries(rangeNames.map((name) => {
    const range = rangeFor(name);
    return [name, summarizeRange(orders, users, products, categories, collections, range.startDate, range.endDate)];
  })) as AnalyticsExpectedSummary['ranges'];

  return {
    batchId,
    seed,
    timezone: ANALYTICS_QA_TIMEZONE,
    users,
    categories,
    collections,
    products,
    coupons,
    carts,
    orders,
    expected: {
      batchId,
      seed,
      timezone: ANALYTICS_QA_TIMEZONE,
      generatedAt: new Date(ANALYTICS_QA_NOW_ISO).toISOString(),
      dateRange: { startDate: ANALYTICS_QA_START_DAY, endDate: ANALYTICS_QA_END_DAY },
      counts: {
        users: users.length,
        carts: carts.length,
        orders: orders.length,
        products: products.length,
        categories: categories.length,
        collections: collections.length,
        coupons: coupons.length,
        futureOrders: 1
      },
      ranges
    }
  };
};
