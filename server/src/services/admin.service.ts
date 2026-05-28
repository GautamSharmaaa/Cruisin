// Governed by .rules v1.0
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';

export interface AnalyticsPoint {
  day: string;
  revenue: number;
  orders: number;
}

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

export const AdminService = {
  async overview(): Promise<Record<string, number>> { const start = new Date(); start.setHours(0, 0, 0, 0); const [orders, users, products, revenue] = await Promise.all([OrderModel.countDocuments({ createdAt: { $gte: start } }), UserModel.countDocuments(), ProductModel.countDocuments({ isActive: true }), OrderModel.aggregate<{ total: number }>([{ $match: { paymentStatus: 'paid', createdAt: { $gte: start } } }, { $group: { _id: null, total: { $sum: '$total' } } }])]); return { revenue: revenue[0]?.total ?? 0, orders, users, products, conversionRate: orders > 0 && users > 0 ? Number(((orders / users) * 100).toFixed(2)) : 0 }; },
  async analytics(days: number): Promise<AnalyticsPoint[]> {
    const safeDays = Math.min(Math.max(days, 7), 90);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));
    const rows = await OrderModel.aggregate<{ _id: string; revenue: number; orders: number }>([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const rowMap = new Map(rows.map((row) => [row._id, row]));
    return Array.from({ length: safeDays }, (_unused, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dayKey(date);
      const row = rowMap.get(key);
      return { day: key, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 };
    });
  }
};
