import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupIndiaPincode } from './india-pincode';

describe('lookupIndiaPincode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects malformed pincodes without a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(lookupIndiaPincode('01234')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns normalized city and state from the storefront proxy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ city: ' Gautam Buddha Nagar ', state: ' Uttar Pradesh ' }) }));
    await expect(lookupIndiaPincode('201301')).resolves.toEqual({ city: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' });
  });

  it('keeps manual entry available when lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(lookupIndiaPincode('999999')).resolves.toBeNull();
  });
});
