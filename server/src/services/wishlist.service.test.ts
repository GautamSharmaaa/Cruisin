import { beforeEach, describe, expect, it, vi } from 'vitest';

const { wishlistModel } = vi.hoisted(() => ({ wishlistModel: { findOneAndUpdate: vi.fn() } }));
vi.mock('../models/wishlist.model.js', () => ({ WishlistModel: wishlistModel }));

describe('WishlistService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates and returns a wishlist bound to the authenticated user', async () => {
    const lean = vi.fn().mockResolvedValue({ user: 'customer-id', products: [] });
    const populate = vi.fn().mockReturnValue({ lean });
    wishlistModel.findOneAndUpdate.mockReturnValue({ populate });
    const { WishlistService } = await import('./wishlist.service.js');

    await expect(WishlistService.get('customer-id')).resolves.toEqual({ user: 'customer-id', products: [] });
    expect(wishlistModel.findOneAndUpdate).toHaveBeenCalledWith(
      { user: 'customer-id' },
      { $setOnInsert: { user: 'customer-id', products: [] } },
      { upsert: true, new: true }
    );
  });

  it('adds and removes products only on that user’s wishlist document', async () => {
    const wishlist = { products: [], save: vi.fn().mockResolvedValue(undefined), populate: vi.fn().mockResolvedValue({ products: ['000000000000000000000000'] }) };
    wishlistModel.findOneAndUpdate.mockResolvedValue(wishlist);
    const { WishlistService } = await import('./wishlist.service.js');

    await WishlistService.toggle('customer-id', '000000000000000000000000');
    expect(wishlistModel.findOneAndUpdate).toHaveBeenCalledWith(
      { user: 'customer-id' },
      { $setOnInsert: { user: 'customer-id', products: [] } },
      { upsert: true, new: true }
    );
    expect(wishlist.save).toHaveBeenCalledTimes(1);
  });
});
