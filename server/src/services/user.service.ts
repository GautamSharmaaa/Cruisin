// Governed by .rules v1.0
import { UserModel } from '../models/user.model.js';
import { OrderModel } from '../models/order.model.js';
import type { PaginatedResult } from '../types/api.types.js';
import { ApiError } from '../utils/api-error.js';
import { normalizeEmail } from '../utils/sanitize.js';

export interface UserFilters {
  q?: string;
  role?: string;
  page: number;
  limit: number;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const objectId = (value: unknown): string => String(value ?? '');

export const UserService = {
  async list(filters: UserFilters): Promise<PaginatedResult<unknown>> {
    const query: Record<string, unknown> = {};
    if (filters.role) {
      query.role = filters.role;
    }
    if (filters.q) {
      const normalized = escapeRegex(normalizeEmail(filters.q));
      const raw = escapeRegex(filters.q);
      query.$or = [{ email: new RegExp(normalized, 'i') }, { name: new RegExp(raw, 'i') }, { phone: new RegExp(raw, 'i') }];
    }
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(Math.max(1, filters.limit ?? 25), 100);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      UserModel.find(query).select('name email role phone status isVerified isActive addresses createdAt lastLogin').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      UserModel.countDocuments(query)
    ]);
    const userIds = items.map((user) => user._id);
    const [orderStats, latestOrders] = await Promise.all([
      OrderModel.aggregate<{ _id: unknown; orderCount: number; totalSpend: number; lastOrderAt?: Date }>([
        { $match: { user: { $in: userIds } } },
        { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpend: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } }, lastOrderAt: { $max: '$createdAt' } } }
      ]),
      OrderModel.find({ user: { $in: userIds } }).select('user orderStatus paymentStatus total couponCode createdAt').sort({ createdAt: -1 }).lean()
    ]);
    const statsByUser = new Map(orderStats.map((item) => [objectId(item._id), item]));
    const latestByUser = new Map<string, (typeof latestOrders)[number]>();
    for (const order of latestOrders) {
      const id = objectId(order.user);
      if (!latestByUser.has(id)) latestByUser.set(id, order);
    }
    const enriched = items.map((user) => {
      const id = objectId(user._id);
      const stats = statsByUser.get(id);
      const latest = latestByUser.get(id);
      return {
        id,
        _id: id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        addressCount: user.addresses?.length ?? 0,
        orderCount: stats?.orderCount ?? 0,
        totalSpend: stats?.totalSpend ?? 0,
        lastOrderAt: latest?.createdAt ?? stats?.lastOrderAt,
        lastOrderId: latest ? objectId(latest._id) : undefined,
        lastOrderStatus: latest?.orderStatus,
        lastPaymentStatus: latest?.paymentStatus,
        lastOrderTotal: latest?.total,
        lastCouponCode: latest?.couponCode
      };
    });
    return { items: enriched, total, page, pages: Math.ceil(total / limit) };
  },

  async update(id: string, input: Record<string, unknown>): Promise<unknown> {
    const current = await UserModel.findById(id).select('role isActive').lean();
    if (!current) {
      throw new ApiError(404, 'User not found');
    }
    const nextRole = typeof input.role === 'string' ? input.role : current.role;
    const nextActive = typeof input.isActive === 'boolean' ? input.isActive : current.isActive;
    if (current.role === 'superadmin' && (nextRole !== 'superadmin' || !nextActive)) {
      const remainingSuperadmins = await UserModel.countDocuments({ _id: { $ne: id }, role: 'superadmin', isActive: true });
      if (remainingSuperadmins === 0) {
        throw new ApiError(400, 'At least one active superadmin is required');
      }
    }
    const user = await UserModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }
};
