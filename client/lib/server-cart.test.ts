import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api, ApiRequestError } = vi.hoisted(() => ({
  api: { delete: vi.fn(), get: vi.fn(), put: vi.fn(), post: vi.fn() },
  ApiRequestError: class extends Error {
    public constructor(
      message: string,
      public readonly status?: number,
      public readonly data?: unknown
    ) {
      super(message);
    }
  }
}));

vi.mock('@/lib/api', () => ({ api, ApiRequestError }));

import { enqueueCartMutation, flushCartMutations, type ServerCart } from './server-cart';

describe('server cart mutation queue', () => {
  beforeEach(async () => {
    await flushCartMutations().catch(() => undefined);
    vi.resetAllMocks();
  });

  it('serializes mutations and sends the latest authoritative version to each request', async () => {
    let version = 0;
    const applied: number[] = [];
    const syncStates: string[] = [];
    api.post.mockResolvedValueOnce({ data: { data: { items: [], version: 1 } } });
    api.put.mockResolvedValueOnce({ data: { data: { items: [], version: 2 } } });
    const apply = (cart: ServerCart): void => {
      version = cart.version ?? 0;
      applied.push(version);
    };
    const setSyncState = (state: string): void => {
      syncStates.push(state);
    };

    enqueueCartMutation(
      { kind: 'add', product: 'product-1', variant: 'variant-1', quantity: 1 },
      () => version,
      apply,
      setSyncState
    );
    enqueueCartMutation(
      { kind: 'update', product: 'product-1', variant: 'variant-1', quantity: 2 },
      () => version,
      apply,
      setSyncState
    );
    await flushCartMutations();

    expect(api.post).toHaveBeenCalledWith('/cart/items', {
      product: 'product-1',
      variant: 'variant-1',
      quantity: 1,
      expectedVersion: 0
    });
    expect(api.put).toHaveBeenCalledWith('/cart/items', {
      product: 'product-1',
      variant: 'variant-1',
      quantity: 2,
      expectedVersion: 1
    });
    expect(applied).toEqual([1, 2]);
    expect(syncStates).toEqual(['syncing', 'idle', 'syncing', 'idle']);
  });

  it('reconciles one stale-version conflict and retries once against the latest cart', async () => {
    let version = 3;
    const applied: number[] = [];
    const latest = { items: [], version: 5 };
    api.post
      .mockRejectedValueOnce(new ApiRequestError('Bag changed', 409, latest))
      .mockResolvedValueOnce({ data: { data: { items: [], version: 6 } } });

    enqueueCartMutation(
      { kind: 'add', product: 'product-1', variant: 'variant-1', quantity: 1 },
      () => version,
      (cart) => {
        version = cart.version ?? 0;
        applied.push(version);
      },
      vi.fn()
    );
    await flushCartMutations();

    expect(api.post).toHaveBeenNthCalledWith(1, '/cart/items', expect.objectContaining({ expectedVersion: 3 }));
    expect(api.post).toHaveBeenNthCalledWith(2, '/cart/items', expect.objectContaining({ expectedVersion: 5 }));
    expect(applied).toEqual([5, 6]);
  });

  it('uses one versioned DELETE request for a removal', async () => {
    api.delete.mockResolvedValueOnce({ data: { data: { items: [], version: 12 } } });

    enqueueCartMutation(
      { kind: 'remove', product: 'product-1', variant: 'variant-1' },
      () => 11,
      vi.fn(),
      vi.fn()
    );
    await flushCartMutations();

    expect(api.delete).toHaveBeenCalledWith('/cart/items/product-1/variant-1', {
      params: { expectedVersion: 11 }
    });
  });
});
