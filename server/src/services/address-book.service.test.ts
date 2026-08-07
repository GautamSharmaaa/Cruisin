import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addressModel, orderModel, userModel } = vi.hoisted(() => ({
  addressModel: { find: vi.fn(), findOneAndUpdate: vi.fn(), create: vi.fn() },
  orderModel: { find: vi.fn() },
  userModel: { findById: vi.fn(), updateOne: vi.fn() }
}));

vi.mock('../models/address.model.js', () => ({ AddressModel: addressModel }));
vi.mock('../models/order.model.js', () => ({ OrderModel: orderModel }));
vi.mock('../models/user.model.js', () => ({ UserModel: userModel }));

const addressQuery = (addresses: unknown[]) => ({
  sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(addresses) })
});

describe('AddressBookService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the first checkout address as the default and normalizes India', async () => {
    addressModel.find.mockReturnValue(addressQuery([]));
    addressModel.create.mockResolvedValue({ _id: 'address-1' });
    const { AddressBookService } = await import('./address-book.service.js');

    await AddressBookService.saveCheckoutAddress('customer-1', {
      fullName: '  Test   Customer ', phone: '+91 98765 43210', line1: ' 1  Test Street ', city: ' Delhi ', state: ' Delhi ', postalCode: '110001', country: 'IN'
    });

    expect(addressModel.create).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Test Customer', phone: '+919876543210', street: '1 Test Street', country: 'India', isDefault: true }));
  });

  it('updates an equivalent checkout address instead of creating a duplicate', async () => {
    addressModel.find.mockReturnValue(addressQuery([{ _id: 'address-1', fullName: 'Old Name', phone: '+919876543210', street: '1 Test Street', city: 'Delhi', state: 'Delhi', pincode: '110001', country: 'India', isDefault: true }]));
    addressModel.findOneAndUpdate.mockResolvedValue({ _id: 'address-1' });
    const { AddressBookService } = await import('./address-book.service.js');

    await AddressBookService.saveCheckoutAddress('customer-1', {
      fullName: 'New Name', phone: '9876543210', line1: '1 test street', city: 'DELHI', state: 'Delhi', postalCode: '110001', country: 'India'
    });

    expect(addressModel.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ _id: 'address-1' }), expect.any(Object), expect.any(Object));
    expect(addressModel.create).not.toHaveBeenCalled();
  });

  it('imports legacy order addresses once for customers whose address book was empty', async () => {
    userModel.findById.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'customer-1' }) }) });
    orderModel.find.mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([{ shippingAddress: { fullName: 'Legacy Customer', phone: '+919876543210', line1: '1 Legacy Street', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' } }])
          })
        })
      })
    });
    addressModel.find.mockReturnValue(addressQuery([]));
    addressModel.create.mockResolvedValue({ _id: 'address-legacy' });
    userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const { AddressBookService } = await import('./address-book.service.js');

    await AddressBookService.backfillCheckoutAddresses('customer-1');

    expect(addressModel.create).toHaveBeenCalledWith(expect.objectContaining({ street: '1 Legacy Street', isDefault: true }));
    expect(userModel.updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: 'customer-1' }), expect.objectContaining({ $set: expect.objectContaining({ addressBookMigratedAt: expect.any(Date) }) }));
  });
});
