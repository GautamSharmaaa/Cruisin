// Governed by .rules v1.0
import { beforeAll, describe, expect, it } from 'vitest';

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
process.env.RAZORPAY_KEY_ID = 'rzp_test_logistics';
process.env.RAZORPAY_KEY_SECRET = 'test';
process.env.SENDGRID_API_KEY = 'SG.test';
process.env.SHIPROCKET_MODE = 'mock';

let eventTypes: typeof import('../../models/logistics-notification-event.model.js').logisticsNotificationEventTypes;
let eventModel: typeof import('../../models/logistics-notification-event.model.js').LogisticsNotificationEventModel;
let render: typeof import('./logistics-notification.service.js').renderLogisticsNotification;
let aggregate: typeof import('./logistics-notification.service.js').logisticsNotificationAggregateStatus;
let sanitize: typeof import('./logistics-notification.service.js').sanitizeLogisticsNotificationError;

beforeAll(async () => {
  const [modelModule, serviceModule] = await Promise.all([
    import('../../models/logistics-notification-event.model.js'),
    import('./logistics-notification.service.js')
  ]);
  eventTypes = modelModule.logisticsNotificationEventTypes;
  eventModel = modelModule.LogisticsNotificationEventModel;
  render = serviceModule.renderLogisticsNotification;
  aggregate = serviceModule.logisticsNotificationAggregateStatus;
  sanitize = serviceModule.sanitizeLogisticsNotificationError;
});

describe('logistics notification event contract', () => {
  it('has deterministic templates for every required event type', () => {
    expect(eventTypes).toHaveLength(23);
    for (const eventType of eventTypes) {
      const output = render(eventType, 'CR-TEST-001');
      expect(output.title.length).toBeGreaterThan(3);
      expect(output.body).toContain('CR-TEST-001');
    }
  });

  it('derives aggregate delivery status without treating skipped channels as failures', () => {
    expect(aggregate([{ status: 'sent' }, { status: 'skipped' }])).toBe('sent');
    expect(aggregate([{ status: 'sent' }, { status: 'failed' }])).toBe('partial');
    expect(aggregate([{ status: 'failed' }, { status: 'skipped' }])).toBe('failed');
    expect(aggregate([{ status: 'skipped' }])).toBe('skipped');
  });

  it('sanitizes secrets and enforces a unique semantic dedupe index', () => {
    expect(sanitize(new Error('authorization=secret-value Bearer abc.def'))).not.toContain('secret-value');
    const dedupeIndex = eventModel.schema.indexes().find(([fields]) => fields.dedupeKey === 1);
    expect(dedupeIndex?.[1]).toMatchObject({ unique: true });
  });
});
