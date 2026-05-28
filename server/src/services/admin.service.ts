// Governed by .rules v1.0
import { OrderModel } from '../models/order.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';

export const AdminService = {
  async overview(): Promise<Record<string, number>> { const start = new Date(); start.setHours(0, 0, 0, 0); const [orders, users, products, revenue] = await Promise.all([OrderModel.countDocuments({ createdAt: { $gte: start } }), UserModel.countDocuments(), ProductModel.countDocuments({ isActive: true }), OrderModel.aggregate<{ total: number }>([{ $match: { paymentStatus: 'paid', createdAt: { $gte: start } } }, { $group: { _id: null, total: { $sum: '$total' } } }])]); return { revenue: revenue[0]?.total ?? 0, orders, users, products, conversionRate: orders > 0 && users > 0 ? Number(((orders / users) * 100).toFixed(2)) : 0 }; }
};
