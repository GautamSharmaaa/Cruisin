// Governed by .rules v1.0
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  config: {
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    whatsappNotificationsEnabled: true
  },
  orderLean: vi.fn(),
  userLean: vi.fn(),
  preferenceLean: vi.fn(),
  eventCreate: vi.fn(),
  eventFindLean: vi.fn(),
  inAppCreate: vi.fn(),
  sendEmail: vi.fn(),
  sendSms: vi.fn(),
  sendWhatsapp: vi.fn(),
  loggerError: vi.fn()
}));

vi.mock('../../config/logistics.js', () => ({ logisticsConfig: mocks.config }));
vi.mock('../../models/order.model.js', () => ({
  OrderModel: { findById: vi.fn(() => ({ select: vi.fn(() => ({ lean: mocks.orderLean })) })) }
}));
vi.mock('../../models/user.model.js', () => ({
  UserModel: { findById: vi.fn(() => ({ select: vi.fn(() => ({ lean: mocks.userLean })) })) }
}));
vi.mock('../../models/user-preference.model.js', () => ({
  UserPreferenceModel: { findOneAndUpdate: vi.fn(() => ({ lean: mocks.preferenceLean })) }
}));
vi.mock('../../models/logistics-notification-event.model.js', () => ({
  LogisticsNotificationEventModel: {
    create: mocks.eventCreate,
    findOne: vi.fn(() => ({ lean: mocks.eventFindLean }))
  }
}));
vi.mock('../../models/notification.model.js', () => ({ NotificationModel: { create: mocks.inAppCreate } }));
vi.mock('../../utils/send-email.js', () => ({ sendEmail: mocks.sendEmail }));
vi.mock('../../utils/send-logistics-message.js', () => ({
  sendLogisticsSms: mocks.sendSms,
  sendLogisticsWhatsapp: mocks.sendWhatsapp
}));
vi.mock('../../utils/logger.js', () => ({ logger: { error: mocks.loggerError } }));

let service: typeof import('./logistics-notification.service.js').LogisticsNotificationService;
type Delivery = { channel: string; status: string; attempts: number; lastError?: string };

const newEvent = (): { deliveries?: Delivery[]; status: string; set: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> } => {
  const event: { deliveries?: Delivery[]; status: string; set: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> } = {
    status: 'pending',
    set: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined)
  };
  event.set.mockImplementation((_key: string, value: Delivery[]) => {
    event.deliveries = value;
  });
  return event;
};

beforeAll(async () => {
  service = (await import('./logistics-notification.service.js')).LogisticsNotificationService;
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'production';
  mocks.orderLean.mockResolvedValue({
    _id: 'order-1',
    user: 'user-1',
    orderNumber: 'CR-NOTIFY-1',
    shippingAddress: { phone: '9000000001' }
  });
  mocks.userLean.mockResolvedValue({
    _id: 'user-1',
    email: 'customer@example.test',
    phone: '9000000001',
    whatsappNumber: '9000000002',
    isVerified: true,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
    whatsappVerifiedAt: new Date()
  });
  mocks.preferenceLean.mockResolvedValue({
    pushNotifications: true,
    orderEmails: true,
    smsNotifications: true,
    whatsappNotifications: true
  });
  mocks.eventCreate.mockImplementation(async () => newEvent());
  mocks.inAppCreate.mockResolvedValue({});
  mocks.sendEmail.mockResolvedValue(undefined);
  mocks.sendSms.mockResolvedValue(undefined);
  mocks.sendWhatsapp.mockResolvedValue(undefined);
});

describe('logistics notification dispatch', () => {
  it('dispatches all enabled, verified, preference-approved channels and records attempts', async () => {
    const event = await service.emit({ eventType: 'delivered', orderId: 'order-1', shipmentId: 'shipment-1' }) as ReturnType<typeof newEvent>;
    expect(event.status).toBe('sent');
    expect(event.deliveries).toHaveLength(4);
    expect(event.deliveries?.every((delivery) => delivery.status === 'sent' && delivery.attempts === 1)).toBe(true);
    expect(mocks.inAppCreate).toHaveBeenCalledOnce();
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'customer@example.test' }));
    expect(mocks.sendSms).toHaveBeenCalledWith('9000000001', expect.stringContaining('CR-NOTIFY-1'));
    expect(mocks.sendWhatsapp).toHaveBeenCalledWith('9000000002', expect.stringContaining('CR-NOTIFY-1'));
  });

  it('respects every customer channel preference without attempting delivery', async () => {
    mocks.preferenceLean.mockResolvedValue({
      pushNotifications: false,
      orderEmails: false,
      smsNotifications: false,
      whatsappNotifications: false
    });
    const event = await service.emit({ eventType: 'shipped', orderId: 'order-1', shipmentId: 'shipment-2' }) as ReturnType<typeof newEvent>;
    expect(event.status).toBe('skipped');
    expect(event.deliveries?.every((delivery) => delivery.status === 'skipped' && delivery.attempts === 0)).toBe(true);
    expect(mocks.inAppCreate).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(mocks.sendWhatsapp).not.toHaveBeenCalled();
  });

  it('records a sanitized channel failure without failing shipment notification processing', async () => {
    mocks.sendSms.mockRejectedValue(new Error('authorization=secret-value'));
    const event = await service.emit({ eventType: 'ndr', orderId: 'order-1', shipmentId: 'shipment-3' }) as ReturnType<typeof newEvent>;
    const sms = event.deliveries?.find((delivery) => delivery.channel === 'sms');
    expect(event.status).toBe('partial');
    expect(sms).toMatchObject({ status: 'failed', attempts: 1 });
    expect(sms?.lastError).not.toContain('secret-value');
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendWhatsapp).toHaveBeenCalledOnce();
  });

  it('returns an existing semantic event and sends nothing on a duplicate key', async () => {
    mocks.eventCreate.mockRejectedValue({ code: 11000 });
    mocks.eventFindLean.mockResolvedValue({ dedupeKey: 'delivered:shipment-1:' });
    await expect(service.emit({ eventType: 'delivered', orderId: 'order-1', shipmentId: 'shipment-1' })).resolves.toMatchObject({
      dedupeKey: 'delivered:shipment-1:'
    });
    expect(mocks.inAppCreate).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(mocks.sendWhatsapp).not.toHaveBeenCalled();
  });
});
