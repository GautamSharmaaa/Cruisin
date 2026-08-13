// Governed by .rules v1.0
import { ExchangeRequestModel } from '../models/exchange-request.model.js';
import { OrderModel } from '../models/order.model.js';
import { ReturnRequestModel } from '../models/return-request.model.js';
import { ShipmentModel } from '../models/shipment.model.js';
import { addIstDays, endOfIstDay, formatIstDay, startOfIstDay } from '../utils/analytics-simulation.js';
import { ApiError } from '../utils/api-error.js';

type PaymentFilter = 'all' | 'cod' | 'prepaid';
type CodFilter = 'all' | 'pending' | 'collected';
type ServiceFilter = 'all' | 'order' | 'return' | 'exchange';
type FreightFilter = 'all' | 'billed' | 'estimated' | 'missing';
type ResultFilter = 'all' | 'profit' | 'loss' | 'missing_cost';
const money = (value: number): number => Math.round(value * 100) / 100;
const id = (value: unknown): string => String(value && typeof value === 'object' && '_id' in value ? (value as { _id: unknown })._id : value);

const rangeFor = (query: Record<string, unknown>): { start: Date; end: Date; label: string } => {
  const preset = String(query.preset ?? 'month');
  if (preset === 'custom') {
    const startDate = String(query.startDate ?? '');
    const endDate = String(query.endDate ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new ApiError(400, 'Custom dates must be YYYY-MM-DD');
    return { start: startOfIstDay(startDate), end: endOfIstDay(endDate), label: `${startDate}-to-${endDate}` };
  }
  const today = formatIstDay(new Date());
  const [year, month] = today.split('-').map(Number) as [number, number, number];
  if (preset === 'all') return { start: new Date(0), end: endOfIstDay(today), label: 'all-time' };
  if (preset === 'today') return { start: startOfIstDay(today), end: endOfIstDay(today), label: 'today' };
  if (preset === 'week') {
    const date = startOfIstDay(today);
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const startDate = addIstDays(today, -mondayOffset);
    return { start: startOfIstDay(startDate), end: endOfIstDay(today), label: 'this-week' };
  }
  if (preset === 'year') return { start: startOfIstDay(`${year}-01-01`), end: endOfIstDay(today), label: 'this-year' };
  if (preset === 'quarter') {
    const firstMonth = Math.floor((month - 1) / 3) * 3 + 1;
    return { start: startOfIstDay(`${year}-${String(firstMonth).padStart(2, '0')}-01`), end: endOfIstDay(today), label: 'this-quarter' };
  }
  return { start: startOfIstDay(`${year}-${String(month).padStart(2, '0')}-01`), end: endOfIstDay(today), label: 'this-month' };
};

export const ProfitabilityAnalyticsService = {
  async report(query: Record<string, unknown>, allowTestOrders: boolean): Promise<unknown> {
    const range = rangeFor(query);
    const payment = (['all', 'cod', 'prepaid'].includes(String(query.payment)) ? query.payment : 'all') as PaymentFilter;
    const cod = (['all', 'pending', 'collected'].includes(String(query.cod)) ? query.cod : 'all') as CodFilter;
    const service = (['all', 'order', 'return', 'exchange'].includes(String(query.service)) ? query.service : 'all') as ServiceFilter;
    const freight = (['all', 'billed', 'estimated', 'missing'].includes(String(query.freight)) ? query.freight : 'all') as FreightFilter;
    const result = (['all', 'profit', 'loss', 'missing_cost'].includes(String(query.result)) ? query.result : 'all') as ResultFilter;
    const search = String(query.search ?? '').trim().toLowerCase();
    const orderMatch: Record<string, unknown> = { createdAt: { $gte: range.start, $lte: range.end } };
    if (!allowTestOrders) orderMatch.$and = [{ isTestOrder: { $ne: true } }, { isAnalyticsTestData: { $ne: true } }];
    const orders = await OrderModel.find(orderMatch).select('-shippingAddress -billingAddress -timeline -paymentAttempts').sort({ createdAt: -1 }).lean();
    const orderIds = orders.map((order) => order._id);
    const [shipments, returns, exchanges] = await Promise.all([
      ShipmentModel.find({ order: { $in: orderIds } }).select('order shipmentType shipmentStatus providerBilledTotal providerBillingStatus providerShippingCost codCharge otherProviderCharges rtoCost returnShippingCost exchangeShippingCost').lean(),
      ReturnRequestModel.find({ order: { $in: orderIds } }).select('order handlingFee handlingFeePaymentStatus refundStatus productRefundAmount status').lean(),
      ExchangeRequestModel.find({ order: { $in: orderIds } }).select('order handlingFee handlingFeePaymentStatus additionalAmount refundDifference status').lean()
    ]);
    const shipmentsByOrder = new Map<string, typeof shipments>();
    for (const shipment of shipments) shipmentsByOrder.set(id(shipment.order), [...(shipmentsByOrder.get(id(shipment.order)) ?? []), shipment]);
    const returnsByOrder = new Map<string, typeof returns>();
    for (const request of returns) returnsByOrder.set(id(request.order), [...(returnsByOrder.get(id(request.order)) ?? []), request]);
    const exchangesByOrder = new Map<string, typeof exchanges>();
    for (const request of exchanges) exchangesByOrder.set(id(request.order), [...(exchangesByOrder.get(id(request.order)) ?? []), request]);

    const rows = orders.flatMap((order) => {
      const orderShipments = shipmentsByOrder.get(id(order._id)) ?? [];
      const orderReturns = returnsByOrder.get(id(order._id)) ?? [];
      const orderExchanges = exchangesByOrder.get(id(order._id)) ?? [];
      const paidReturnFee = money(orderReturns.filter((request) => request.handlingFeePaymentStatus === 'paid').reduce((sum, request) => sum + Number(request.handlingFee ?? 0), 0));
      const paidExchangeFee = money(orderExchanges.filter((request) => request.handlingFeePaymentStatus === 'paid').reduce((sum, request) => sum + Number(request.handlingFee ?? 0), 0));
      const refund = money(Number(order.refundAmount ?? 0));
      const forward = orderShipments.filter((shipment) => shipment.shipmentType === 'forward');
      const reverse = orderShipments.filter((shipment) => shipment.shipmentType !== 'forward');
      const billedForward = money(forward.filter((shipment) => shipment.providerBillingStatus === 'current').reduce((sum, shipment) => sum + Number(shipment.providerBilledTotal ?? 0), 0));
      const estimatedForward = money(forward.reduce((sum, shipment) => sum + Number(shipment.providerShippingCost ?? 0) + Number(shipment.codCharge ?? 0) + Number(shipment.otherProviderCharges ?? 0) + Number(shipment.rtoCost ?? 0), 0));
      const billedReverse = money(reverse.filter((shipment) => shipment.providerBillingStatus === 'current').reduce((sum, shipment) => sum + Number(shipment.providerBilledTotal ?? 0), 0));
      const estimatedReverse = money(reverse.reduce((sum, shipment) => sum + Number(shipment.returnShippingCost ?? 0) + Number(shipment.exchangeShippingCost ?? 0) + Number(shipment.providerShippingCost ?? 0), 0));
      const freightSource = orderShipments.length === 0 ? 'missing' : orderShipments.every((shipment) => shipment.providerBillingStatus === 'current') ? 'billed' : 'estimated';
      const forwardFreight = billedForward > 0 ? billedForward : estimatedForward;
      const reverseFreight = billedReverse > 0 ? billedReverse : estimatedReverse;
      const paidInCruisin = Number(order.amountPaid ?? 0) > 0 || ['paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus);
      const codCollectedByCourier = order.paymentMode === 'cod' && forward.some((shipment) => shipment.shipmentStatus === 'delivered');
      const revenueCollected = paidInCruisin || codCollectedByCourier;
      const codState = order.paymentMode !== 'cod' ? 'not_cod' : codCollectedByCourier || paidInCruisin ? 'collected' : 'pending';
      const grossItems = Math.max(1, order.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0));
      const revenueExcludingGst = revenueCollected ? money(Math.max(0, Number(order.amountPaid || order.total) - Number(order.tax ?? 0))) : 0;
      return order.items.map((item) => {
        const share = (Number(item.price) * Number(item.quantity)) / grossItems;
        const manufacturing = money(Number(item.unitCostBreakdown?.manufacturing ?? 0) * item.quantity);
        const packaging = money(Number(item.unitCostBreakdown?.packaging ?? 0) * item.quantity);
        const marketing = money(Number(item.unitCostBreakdown?.marketing ?? 0) * item.quantity);
        const handling = money(Number(item.unitCostBreakdown?.handling ?? 0) * item.quantity);
        const other = money(Number(item.unitCostBreakdown?.other ?? 0) * item.quantity);
        const productCost = money(manufacturing + packaging + marketing + handling + other);
        const allocatedRevenue = money(revenueExcludingGst * share);
        const allocatedCodFee = money(Number(order.codFee ?? 0) * share);
        const allocatedReturnFee = money(paidReturnFee * share);
        const allocatedExchangeFee = money(paidExchangeFee * share);
        const allocatedForward = money(forwardFreight * share);
        const allocatedReverse = money(reverseFreight * share);
        const allocatedRefund = money(refund * share);
        const totalIncome = money(allocatedRevenue + allocatedReturnFee + allocatedExchangeFee);
        const totalCost = money(productCost + allocatedForward + allocatedReverse + allocatedRefund);
        const profit = money(totalIncome - totalCost);
        const missingCosts = Number(item.unitCostTotal ?? 0) <= 0;
        return {
          orderId: id(order._id), orderNumber: order.orderNumber ?? id(order._id), date: order.createdAt.toISOString(), productId: id(item.product), sku: item.sku, product: item.title, size: item.size ?? '', color: item.color ?? '', quantity: item.quantity,
          sellingValue: money(Number(item.price) * item.quantity), paymentMode: order.paymentMode ?? 'online', paymentStatus: order.paymentStatus, orderStatus: order.orderStatus, codState,
          collectedRevenue: allocatedRevenue, codFee: allocatedCodFee, returnFee: allocatedReturnFee, exchangeFee: allocatedExchangeFee, refund: allocatedRefund,
          manufacturingCost: manufacturing, packagingCost: packaging, marketingCost: marketing, handlingCost: handling, otherCost: other, productCost,
          forwardFreight: allocatedForward, reverseFreight: allocatedReverse, freightSource, totalIncome, totalCost, netProfit: profit, margin: totalIncome > 0 ? money((profit / totalIncome) * 100) : 0,
          missingCosts, hasReturn: orderReturns.length > 0, hasExchange: orderExchanges.length > 0
        };
      });
    }).filter((row) => {
      if (payment === 'cod' && row.paymentMode !== 'cod') return false;
      if (payment === 'prepaid' && row.paymentMode === 'cod') return false;
      if (cod !== 'all' && row.codState !== cod) return false;
      if (service === 'order' && (row.hasReturn || row.hasExchange)) return false;
      if (service === 'return' && !row.hasReturn) return false;
      if (service === 'exchange' && !row.hasExchange) return false;
      if (freight !== 'all' && row.freightSource !== freight) return false;
      if (result === 'profit' && row.netProfit <= 0) return false;
      if (result === 'loss' && row.netProfit >= 0) return false;
      if (result === 'missing_cost' && !row.missingCosts) return false;
      return !search || [row.orderNumber, row.productId, row.sku, row.product].some((value) => String(value).toLowerCase().includes(search));
    });
    const uniqueOrders = new Set(rows.map((row) => row.orderId));
    return {
      range: { startDate: formatIstDay(range.start), endDate: formatIstDay(range.end), preset: String(query.preset ?? 'month'), timezone: 'Asia/Kolkata' },
      generatedAt: new Date().toISOString(), filenameLabel: range.label,
      summary: {
        orders: uniqueOrders.size, lines: rows.length,
        collectedRevenue: money(rows.reduce((sum, row) => sum + row.collectedRevenue, 0)),
        pendingCod: money(rows.filter((row) => row.codState === 'pending').reduce((sum, row) => sum + row.sellingValue + row.codFee, 0)),
        codFees: money(rows.reduce((sum, row) => sum + row.codFee, 0)), returnFees: money(rows.reduce((sum, row) => sum + row.returnFee, 0)), exchangeFees: money(rows.reduce((sum, row) => sum + row.exchangeFee, 0)),
        productCosts: money(rows.reduce((sum, row) => sum + row.productCost, 0)), logisticsCosts: money(rows.reduce((sum, row) => sum + row.forwardFreight + row.reverseFreight, 0)), refunds: money(rows.reduce((sum, row) => sum + row.refund, 0)),
        netProfit: money(rows.reduce((sum, row) => sum + row.netProfit, 0)), missingCostLines: rows.filter((row) => row.missingCosts).length
      },
      rows
    };
  }
};
