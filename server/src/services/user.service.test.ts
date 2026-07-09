// Governed by .rules v1.0
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { userModel, orderModel } = vi.hoisted(() => ({
  userModel: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn()
  },
  orderModel: {
    aggregate: vi.fn(),
    find: vi.fn()
  }
}));

vi.mock('../models/user.model.js', () => ({ UserModel: userModel }));
vi.mock('../models/order.model.js', () => ({ OrderModel: orderModel }));

const findByIdLean = (value: unknown) => ({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(value) });

describe('UserService admin updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prevents demoting the last active superadmin', async () => {
    const { UserService } = await import('./user.service.js');
    userModel.findById.mockReturnValue(findByIdLean({ role: 'superadmin', isActive: true }));
    userModel.countDocuments.mockResolvedValue(0);

    await expect(UserService.update('user-1', { role: 'admin', isActive: true })).rejects.toMatchObject({
      statusCode: 400,
      message: 'At least one active superadmin is required'
    });
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('allows superadmin changes when another active superadmin remains', async () => {
    const { UserService } = await import('./user.service.js');
    const updated = { _id: 'user-1', role: 'admin', isActive: true };
    userModel.findById.mockReturnValue(findByIdLean({ role: 'superadmin', isActive: true }));
    userModel.countDocuments.mockResolvedValue(1);
    userModel.findByIdAndUpdate.mockResolvedValue(updated);

    await expect(UserService.update('user-1', { role: 'admin', isActive: true })).resolves.toBe(updated);
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('user-1', { role: 'admin', isActive: true }, { new: true, runValidators: true });
  });
});
