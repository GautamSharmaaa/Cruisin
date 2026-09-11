import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'development';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ADMIN_URL = 'http://localhost:3001';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
process.env.RAZORPAY_KEY_ID = 'test';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'test';

const { jobModel, logisticsService, logger, redis } = vi.hoisted(() => ({
  jobModel: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn()
  },
  logisticsService: {
    assignAwb: vi.fn(),
    cancel: vi.fn(),
    createProviderOrderForOrder: vi.fn(),
    generateDocument: vi.fn(),
    refreshTracking: vi.fn(),
    schedulePickup: vi.fn()
  },
  logger: { error: vi.fn(), info: vi.fn() },
  redis: { del: vi.fn(), setIfAbsent: vi.fn() }
}));

vi.mock('../../models/logistics-job.model.js', () => ({
  LogisticsJobModel: jobModel,
  logisticsJobTypes: [
    'create_order',
    'assign_awb',
    'schedule_pickup',
    'generate_label',
    'generate_invoice',
    'generate_manifest',
    'refresh_tracking',
    'cancel_shipment',
    'create_return',
    'create_exchange',
    'reconcile_tracking',
    'order_created',
    'release_payment_reservation'
  ]
}));
vi.mock('../../config/redis.js', () => ({ redis }));
vi.mock('../../utils/logger.js', () => ({ logger }));
vi.mock('./logistics.service.js', () => ({ LogisticsService: logisticsService }));

interface TestJob {
  _id: string;
  type: 'create_order';
  payload: { orderId: string };
  status: 'queued' | 'running';
  attempts: number;
  maxAttempts: number;
  runAt: Date;
}

const testJob = (overrides: Partial<TestJob> = {}): TestJob => ({
  _id: 'job-1',
  type: 'create_order',
  payload: { orderId: 'order-1' },
  status: 'running',
  attempts: 1,
  maxAttempts: 5,
  runAt: new Date('2026-08-21T08:00:00.000Z'),
  ...overrides
});

describe('LogisticsJobService durable outbox', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    redis.setIfAbsent.mockResolvedValue(true);
    redis.del.mockResolvedValue(1);
    jobModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('returns the persisted job when the same dedupe key is enqueued twice', async () => {
    const existing = testJob();
    jobModel.create.mockRejectedValueOnce(Object.assign(new Error('duplicate key'), { code: 11000 }));
    jobModel.findOne.mockResolvedValueOnce(existing);
    const { LogisticsJobService } = await import('./logistics-job.service.js');

    const result = await LogisticsJobService.enqueue(
      'create_order',
      { orderId: 'order-1' },
      'create-order:order-1'
    );

    expect(result).toBe(existing);
    expect(jobModel.findOne).toHaveBeenCalledWith({ dedupeKey: 'create-order:order-1' });
  });

  it('claims an expired lease after a restart and executes it exactly once', async () => {
    const job = testJob();
    jobModel.findOneAndUpdate.mockResolvedValueOnce(job).mockResolvedValueOnce(null);
    logisticsService.createProviderOrderForOrder.mockResolvedValue(undefined);
    const { LogisticsJobService } = await import('./logistics-job.service.js');

    await expect(LogisticsJobService.processNext()).resolves.toBe(true);
    await expect(LogisticsJobService.processNext()).resolves.toBe(false);

    expect(jobModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          expect.objectContaining({ status: 'running', leaseExpiresAt: { $lte: expect.any(Date) } })
        ])
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'running', leaseId: expect.any(String), leaseExpiresAt: expect.any(Date) }),
        $inc: { attempts: 1 }
      }),
      expect.objectContaining({ new: true })
    );
    expect(logisticsService.createProviderOrderForOrder).toHaveBeenCalledOnce();
    expect(logisticsService.createProviderOrderForOrder).toHaveBeenCalledWith('order-1');
    expect(jobModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'job-1', leaseId: expect.any(String) }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'succeeded', completedAt: expect.any(Date) }) })
    );
  });

  it('requeues a retryable provider failure with a bounded delay', async () => {
    const { LogisticsProviderError } = await import('../../types/logistics.types.js');
    jobModel.findOneAndUpdate.mockResolvedValueOnce(testJob({ attempts: 2, maxAttempts: 4 }));
    logisticsService.createProviderOrderForOrder.mockRejectedValueOnce(
      new LogisticsProviderError('temporary_provider', 'provider unavailable', true, 503)
    );
    const { LogisticsJobService } = await import('./logistics-job.service.js');
    const startedAt = Date.now();

    await expect(LogisticsJobService.processNext()).resolves.toBe(true);

    const update = jobModel.updateOne.mock.calls[0]?.[1] as {
      $set: { status: string; runAt: Date; lastError: { code: string; retryable: boolean } };
    };
    expect(update.$set.status).toBe('queued');
    expect(update.$set.runAt.getTime()).toBeGreaterThanOrEqual(startedAt + 250);
    expect(update.$set.lastError).toMatchObject({ code: 'temporary_provider', retryable: true });
  });

  it('moves a non-retryable provider failure to the dead-letter state', async () => {
    const { LogisticsProviderError } = await import('../../types/logistics.types.js');
    const originalRunAt = new Date('2026-08-21T08:00:00.000Z');
    jobModel.findOneAndUpdate.mockResolvedValueOnce(testJob({ runAt: originalRunAt }));
    logisticsService.createProviderOrderForOrder.mockRejectedValueOnce(
      new LogisticsProviderError('invalid_payload', 'invalid order', false, 422)
    );
    const { LogisticsJobService } = await import('./logistics-job.service.js');

    await expect(LogisticsJobService.processNext()).resolves.toBe(true);

    expect(jobModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'job-1', leaseId: expect.any(String) }),
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'dead',
          runAt: originalRunAt,
          lastError: expect.objectContaining({ code: 'invalid_payload', retryable: false })
        })
      })
    );
  });

  it('does not claim work when another worker owns the short claim lock', async () => {
    redis.setIfAbsent.mockResolvedValueOnce(false);
    const { LogisticsJobService } = await import('./logistics-job.service.js');

    await expect(LogisticsJobService.processNext()).resolves.toBe(false);

    expect(jobModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });
});
