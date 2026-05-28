// Governed by .rules v1.0
import { UserModel } from '../models/user.model.js';
import type { PaginatedResult } from '../types/api.types.js';
import { ApiError } from '../utils/api-error.js';
import { normalizeEmail } from '../utils/sanitize.js';

export interface UserFilters {
  q?: string;
  role?: string;
  page: number;
  limit: number;
}

export const UserService = {
  async list(filters: UserFilters): Promise<PaginatedResult<unknown>> {
    const query: Record<string, unknown> = {};
    if (filters.role) {
      query.role = filters.role;
    }
    if (filters.q) {
      const normalized = normalizeEmail(filters.q);
      query.$or = [{ email: new RegExp(normalized, 'i') }, { name: new RegExp(filters.q, 'i') }];
    }
    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
      UserModel.countDocuments(query)
    ]);
    return { items, total, page: filters.page, pages: Math.ceil(total / filters.limit) };
  },

  async update(id: string, input: Record<string, unknown>): Promise<unknown> {
    const user = await UserModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }
};
