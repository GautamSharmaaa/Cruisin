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

  it('uses a legitimate checkout name, hides synthetic email, and reports net collected spend only', async () => {
    const userId = '000000000000000000000001';
    const createdAt = new Date('2026-08-12T00:00:00.000Z');
    userModel.find.mockReturnValue({ select: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([{ _id: userId, name: 'Cruisin Member', email: '919999999999@phone.cruisin.local', role: 'customer', status: 'active', isActive: true, isVerified: true, addresses: [], createdAt }]) });
    userModel.countDocuments.mockResolvedValue(1);
    orderModel.find.mockReturnValue({ select: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([
      { _id: 'order-1', user: userId, orderNumber: 'CR-REAL', orderStatus: 'delivered', paymentStatus: 'partially_refunded', paymentMode: 'online', total: 1_000, amountPaid: 1_000, refundAmount: 250, shippingAddress: { fullName: 'Checkout Customer' }, createdAt }
    ]) });
    const { UserService } = await import('./user.service.js');

    const result = await UserService.list({ page: 1, limit: 25 });

    expect(result.items[0]).toMatchObject({ name: 'Checkout Customer', email: '', orderCount: 1, totalSpend: 750, lastOrderNumber: 'CR-REAL' });
    expect(orderModel.find).toHaveBeenCalledWith(expect.objectContaining({ archivedAt: { $exists: false }, isTestOrder: { $ne: true }, isAnalyticsTestData: { $ne: true } }));
  });
});
