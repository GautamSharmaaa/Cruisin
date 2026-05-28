// Governed by .rules v1.0
import { CategoryModel } from '../models/category.model.js';
import { ApiError } from '../utils/api-error.js';

export type CategoryInput = Record<string, unknown>;

export const CategoryService = {
  async list(): Promise<unknown[]> {
    return CategoryModel.find().sort({ parent: 1, sortOrder: 1, name: 1 }).lean();
  },

  async active(): Promise<unknown[]> {
    return CategoryModel.find({ isActive: true }).sort({ parent: 1, sortOrder: 1, name: 1 }).lean();
  },

  async create(input: CategoryInput): Promise<unknown> {
    return CategoryModel.create(input);
  },

  async update(id: string, input: CategoryInput): Promise<unknown> {
    const category = await CategoryModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    return category;
  },

  async remove(id: string): Promise<void> {
    const category = await CategoryModel.findByIdAndUpdate(id, { isActive: false });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
  },

  async reorder(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id, index) => CategoryModel.findByIdAndUpdate(id, { sortOrder: index })));
  }
};
