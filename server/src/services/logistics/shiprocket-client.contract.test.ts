// Governed by .rules v1.0
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosRequest, axiosCreate, loggerWarn } = vi.hoisted(() => {
  const request = vi.fn();
  return {
    axiosRequest: request,
    axiosCreate: vi.fn(() => ({ request })),
    loggerWarn: vi.fn()
  };
});

vi.mock('axios', () => ({
  default: {
    create: axiosCreate,
    isAxiosError: (error: unknown): boolean => typeof error === 'object' && error !== null && 'isAxiosError' in error
  }
}));
vi.mock('../../utils/logger.js', () => ({
  logger: { warn: loggerWarn, info: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/cruisin-logistics-client-test';
process.env.REDIS_URL = 'redis://localhost:6379/14';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_logistics';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'SG.test';
process.env.SHIPROCKET_ENABLED = 'true';
process.env.SHIPROCKET_MODE = 'live-readonly';
process.env.SHIPROCKET_ALLOW_LIVE_READS = 'true';
process.env.SHIPROCKET_ALLOW_LIVE_MUTATIONS = 'false';
process.env.SHIPROCKET_API_EMAIL = 'shiprocket-qa@example.test';
process.env.SHIPROCKET_API_PASSWORD = 'test-only-password';
process.env.SHIPROCKET_PICKUP_LOCATION = 'Mock Warehouse';
process.env.SHIPROCKET_PICKUP_POSTCODE = '560001';
process.env.SHIPROCKET_REQUEST_TIMEOUT_MS = '1000';

const token = 'mock-shiprocket-token-with-safe-length';
const axiosError = (status?: number, code?: string, data: unknown = {}): object => ({
  isAxiosError: true,
  code,
  response: status ? { status, data } : undefined
});
const okSchema = z.object({ ok: z.literal(true) });

let ShiprocketClient: typeof import('./shiprocket-client.js').ShiprocketClient;

beforeEach(async () => {
  vi.useRealTimers();
  vi.clearAllMocks();
  ({ ShiprocketClient } = await import('./shiprocket-client.js'));
});

afterEach(() => vi.useRealTimers());

describe('Shiprocket HTTP client contract without network access', () => {
  it('authenticates once and reuses the cached token', async () => {
    axiosRequest.mockResolvedValue({ data: { token } });
    const client = new ShiprocketClient();
    await client.authenticate();
    await client.authenticate();
    expect(axiosRequest).toHaveBeenCalledTimes(1);
    expect(axiosRequest.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      url: '/auth/login',
      data: { email: 'shiprocket-qa@example.test', password: 'test-only-password' }
    });
  });

  it('coalesces concurrent token requests into one authentication call', async () => {
    let resolveAuthentication: ((value: unknown) => void) | undefined;
    axiosRequest.mockImplementation(() => new Promise((resolve) => {
      resolveAuthentication = resolve;
    }));
    const client = new ShiprocketClient();
    const first = client.authenticate();
    const second = client.authenticate();
    await vi.waitFor(() => expect(axiosRequest).toHaveBeenCalledTimes(1));
    resolveAuthentication?.({ data: { token } });
    await Promise.all([first, second]);
  });

  it('normalizes an authentication rejection without retrying or leaking credentials', async () => {
    axiosRequest.mockRejectedValue(axiosError(401, undefined, { message: 'bad credentials test-only-password' }));
    const client = new ShiprocketClient();
    await expect(client.authenticate()).rejects.toMatchObject({
      code: 'authentication',
      retryable: false,
      message: 'Logistics provider authentication failed'
    });
    expect(axiosRequest).toHaveBeenCalledTimes(1);
    expect(loggerWarn).toHaveBeenCalledWith('Logistics provider request failed', expect.not.objectContaining({
      password: expect.anything(),
      data: expect.anything()
    }));
  });

  it('refreshes once after an authenticated 401 and then succeeds', async () => {
    let authenticationCalls = 0;
    let protectedCalls = 0;
    axiosRequest.mockImplementation((config: { url: string }) => {
      if (config.url === '/auth/login') {
        authenticationCalls += 1;
        return Promise.resolve({ data: { token: `${token}-${authenticationCalls}` } });
      }
      protectedCalls += 1;
      return protectedCalls === 1
        ? Promise.reject(axiosError(401))
        : Promise.resolve({ data: { ok: true } });
    });
    const result = await new ShiprocketClient().get('/settings/company/pickup', okSchema);
    expect(result).toEqual({ ok: true });
    expect(authenticationCalls).toBe(2);
    expect(protectedCalls).toBe(2);
  });

  it.each([429, 502, 503, 504])('retries HTTP %s exactly three times and returns a retryable safe error', async (status) => {
    axiosRequest.mockResolvedValueOnce({ data: { token } });
    const client = new ShiprocketClient();
    await client.authenticate();
    axiosRequest.mockReset();
    axiosRequest.mockRejectedValue(axiosError(status, undefined, { message: `unsafe provider ${status}` }));
    vi.useFakeTimers();
    const request = client.get('/courier/serviceability', okSchema);
    const rejection = expect(request).rejects.toMatchObject({
      code: status === 429 ? 'rate_limited' : 'temporary_provider',
      retryable: true,
      message: status === 429 ? 'Logistics provider rate limit reached' : 'Logistics provider is temporarily unavailable'
    });
    await vi.runAllTimersAsync();
    await rejection;
    expect(axiosRequest).toHaveBeenCalledTimes(3);
  });

  it('retries a timeout three times and exposes only the normalized timeout', async () => {
    axiosRequest.mockResolvedValueOnce({ data: { token } });
    const client = new ShiprocketClient();
    await client.authenticate();
    axiosRequest.mockReset();
    axiosRequest.mockRejectedValue(axiosError(undefined, 'ERR_CANCELED'));
    vi.useFakeTimers();
    const request = client.get('/courier/serviceability', okSchema);
    const rejection = expect(request).rejects.toMatchObject({
      code: 'timeout',
      retryable: true,
      message: 'Logistics provider timed out'
    });
    await vi.runAllTimersAsync();
    await rejection;
    expect(axiosRequest).toHaveBeenCalledTimes(3);
  });

  it('treats HTTP 422 as permanent and does not retry', async () => {
    axiosRequest.mockResolvedValueOnce({ data: { token } });
    const client = new ShiprocketClient();
    await client.authenticate();
    axiosRequest.mockReset();
    axiosRequest.mockRejectedValue(axiosError(422, undefined, { errors: { postcode: ['invalid'] } }));
    await expect(client.get('/courier/serviceability', okSchema)).rejects.toMatchObject({
      code: 'invalid_payload',
      retryable: false,
      message: 'Logistics provider rejected the shipment details'
    });
    expect(axiosRequest).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed successful responses as permanent provider failures', async () => {
    axiosRequest.mockResolvedValueOnce({ data: { token } }).mockResolvedValueOnce({ data: { ok: 'not-a-boolean' } });
    await expect(new ShiprocketClient().get('/courier/serviceability', okSchema)).rejects.toMatchObject({
      code: 'permanent_provider',
      retryable: false,
      message: 'Logistics provider returned an invalid response'
    });
  });

  it('rejects absolute and protocol-relative provider paths before making a request', async () => {
    const client = new ShiprocketClient();
    await expect(client.get('https://evil.example.test', okSchema)).rejects.toMatchObject({ code: 'configuration' });
    await expect(client.get('//evil.example.test', okSchema)).rejects.toMatchObject({ code: 'configuration' });
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  it('refuses mutations in live-readonly mode before authentication', async () => {
    await expect(new ShiprocketClient().post('/orders/create/adhoc', {}, okSchema)).rejects.toThrow('Live logistics mutations are disabled');
    expect(axiosRequest).not.toHaveBeenCalled();
  });
});
