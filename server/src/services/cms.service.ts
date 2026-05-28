// Governed by .rules v1.0
import { BannerModel } from '../models/banner.model.js';

export const CmsService = {
  async activeHome(): Promise<unknown[]> { const now = new Date(); return BannerModel.find({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }).sort({ sortOrder: 1 }).lean(); },
  async upsertBanner(input: Record<string, unknown>): Promise<unknown> { return BannerModel.create(input); },
  async reorder(ids: string[]): Promise<void> { await Promise.all(ids.map((id, index) => BannerModel.findByIdAndUpdate(id, { sortOrder: index }))); }
};
