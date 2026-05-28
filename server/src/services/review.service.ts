// Governed by .rules v1.0
import { ReviewModel } from '../models/review.model.js';

export const ReviewService = {
  async list(product: string): Promise<unknown[]> { return ReviewModel.find({ product, status: 'approved' }).sort({ createdAt: -1 }).lean(); },
  async create(user: string, input: Record<string, unknown>): Promise<unknown> { return ReviewModel.create({ ...input, user }); },
  async moderate(id: string, status: string): Promise<unknown> { return ReviewModel.findByIdAndUpdate(id, { status }, { new: true }); }
};
