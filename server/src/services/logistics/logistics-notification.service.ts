// Governed by .rules v1.0
import { logisticsConfig } from '../../config/logistics.js';
import {
  LogisticsNotificationEventModel,
  type LogisticsNotificationEventType
} from '../../models/logistics-notification-event.model.js';
import { NotificationModel } from '../../models/notification.model.js';
import { OrderModel } from '../../models/order.model.js';
import { UserPreferenceModel } from '../../models/user-preference.model.js';
import { UserModel } from '../../models/user.model.js';
import { sendEmail } from '../../utils/send-email.js';
import { sendLogisticsSms, sendLogisticsWhatsapp } from '../../utils/send-logistics-message.js';
import { logger } from '../../utils/logger.js';

type NotificationSource = 'service' | 'job' | 'webhook';
type DeliveryChannel = 'in_app' | 'email' | 'sms' | 'whatsapp';
type DeliveryState = {
  channel: DeliveryChannel;
  template: string;
  recipient: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  attempts: number;
  sentAt?: Date;
  lastAttemptAt?: Date;
  lastError?: string;
};

const copy: Record<LogisticsNotificationEventType, { title: string; body: (orderNumber: string) => string }> = {
  shipment_created: { title: 'Shipment created', body: (order) => `Your Cruisin order ${order} is being prepared for dispatch.` },
  awb_assigned: { title: 'Tracking number assigned', body: (order) => `A courier tracking number is now assigned to order ${order}.` },
  pickup_scheduled: { title: 'Courier pickup scheduled', body: (order) => `Courier pickup is scheduled for order ${order}.` },
  picked_up: { title: 'Parcel picked up', body: (order) => `The courier has picked up order ${order}.` },
  shipped: { title: 'Order shipped', body: (order) => `Order ${order} has shipped.` },
  in_transit: { title: 'Order in transit', body: (order) => `Order ${order} is moving through the courier network.` },
  out_for_delivery: { title: 'Out for delivery', body: (order) => `Order ${order} is out for delivery.` },
  delivered: { title: 'Order delivered', body: (order) => `Order ${order} has been delivered.` },
  ndr: { title: 'Delivery needs attention', body: (order) => `The courier could not deliver order ${order}. Please watch for a support contact or reattempt update.` },
  reattempt_requested: { title: 'Delivery reattempt requested', body: (order) => `A delivery reattempt was requested for order ${order}.` },
  rto_initiated: { title: 'Return to origin started', body: (order) => `Order ${order} is being returned to Cruisin.` },
  rto_delivered: { title: 'Return to origin received', body: (order) => `The returned parcel for order ${order} reached Cruisin.` },
  return_submitted: { title: 'Return submitted', body: (order) => `Your return request for order ${order} was submitted for review.` },
  return_approved: { title: 'Return approved', body: (order) => `Your return for order ${order} was approved.` },
  return_rejected: { title: 'Return update', body: (order) => `Your return request for order ${order} was not approved. Open your account for details.` },
  return_pickup_scheduled: { title: 'Return pickup arranged', body: (order) => `Reverse pickup is arranged for order ${order}.` },
  return_received: { title: 'Return received', body: (order) => `Cruisin received your return for order ${order}.` },
  return_refund_destination_required: { title: 'Choose your refund method', body: (order) => `Quality review is complete for order ${order}. Choose your secure refund destination in My Returns.` },
  return_refund_initiated: { title: 'Return refund initiated', body: (order) => `The eligible product refund for order ${order} is being processed.` },
  return_refunded: { title: 'Return refund completed', body: (order) => `The eligible product refund for order ${order} has been processed.` },
  exchange_approved: { title: 'Exchange approved', body: (order) => `Your exchange for order ${order} was approved and replacement stock is reserved.` },
  replacement_shipped: { title: 'Replacement shipped', body: (order) => `The replacement for order ${order} has shipped.` },
  exchange_completed: { title: 'Exchange completed', body: (order) => `Your exchange for order ${order} is complete.` }
};

export const sanitizeLogisticsNotificationError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Notification delivery failed';
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, 'Bearer [redacted]')
    .replace(/(token|password|secret|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .slice(0, 500);
};
export const renderLogisticsNotification = (eventType: LogisticsNotificationEventType, orderNumber: string): { title: string; body: string } => ({
  title: copy[eventType].title,
  body: copy[eventType].body(orderNumber)
});
export const logisticsNotificationAggregateStatus = (deliveries: Array<{ status: string }>): 'sent' | 'partial' | 'failed' | 'skipped' => {
  const sent = deliveries.filter((delivery) => delivery.status === 'sent').length;
  const failed = deliveries.filter((delivery) => delivery.status === 'failed').length;
  return failed > 0 ? sent > 0 ? 'partial' : 'failed' : sent > 0 ? 'sent' : 'skipped';
};
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
const duplicateKey = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000;

const processDelivery = async (delivery: DeliveryState, input: { userId: string; eventType: LogisticsNotificationEventType; dedupeKey: string; title: string; body: string }): Promise<void> => {
  if (delivery.status === 'skipped') return;
  delivery.attempts += 1;
  delivery.lastAttemptAt = new Date();
  try {
    if (delivery.channel === 'in_app') {
      await NotificationModel.create({
        user: input.userId,
        audience: 'customer',
        type: 'order',
        title: input.title,
        body: input.body,
        metadata: { logisticsEvent: input.eventType, dedupeKey: input.dedupeKey }
      });
    } else if (delivery.channel === 'email') {
      await sendEmail({ to: delivery.recipient, subject: input.title, text: input.body, html: `<p>${escapeHtml(input.body)}</p>` });
    } else if (delivery.channel === 'sms') {
      await sendLogisticsSms(delivery.recipient, input.body);
    } else {
      await sendLogisticsWhatsapp(delivery.recipient, input.body);
    }
    delivery.status = 'sent';
    delivery.sentAt = new Date();
  } catch (error) {
    delivery.status = 'failed';
    delivery.lastError = sanitizeLogisticsNotificationError(error);
  }
};

export const LogisticsNotificationService = {
  async emit(input: {
    eventType: LogisticsNotificationEventType;
    orderId: string;
    shipmentId?: string;
    entityReference?: string;
    source?: NotificationSource;
    dedupeKey?: string;
    occurredAt?: Date;
  }): Promise<unknown | null> {
    try {
      const order = await OrderModel.findById(input.orderId).select('user orderNumber shippingAddress.phone').lean();
      if (!order?.user) return null;
      const user = await UserModel.findById(order.user).select('email phone whatsappNumber isVerified emailVerifiedAt phoneVerifiedAt whatsappVerifiedAt').lean();
      if (!user) return null;
      const preferences = await UserPreferenceModel.findOneAndUpdate(
        { user: user._id },
        { $setOnInsert: { user: user._id } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      const orderNumber = order.orderNumber ?? String(order._id);
      const { title, body } = renderLogisticsNotification(input.eventType, orderNumber);
      const dedupeKey = input.dedupeKey ?? [
        input.eventType,
        input.shipmentId ?? input.orderId,
        input.entityReference ?? ''
      ].join(':');
      const production = process.env.NODE_ENV === 'production';
      const recipientPhone = user.phone ?? order.shippingAddress.phone;
      const recipientWhatsapp = user.whatsappNumber ?? recipientPhone;
      const deliveries: DeliveryState[] = [
        {
          channel: 'in_app',
          template: `logistics.${input.eventType}.in_app`,
          recipient: String(user._id),
          status: logisticsConfig.notificationsEnabled && preferences.pushNotifications ? 'pending' : 'skipped',
          attempts: 0,
          ...(!logisticsConfig.notificationsEnabled ? { lastError: 'Logistics notifications are disabled' } : !preferences.pushNotifications ? { lastError: 'Customer disabled in-app notifications' } : {})
        },
        {
          channel: 'email',
          template: `logistics.${input.eventType}.email`,
          recipient: user.email,
          status: logisticsConfig.notificationsEnabled && logisticsConfig.emailNotificationsEnabled && preferences.orderEmails && production && Boolean(user.isVerified || user.emailVerifiedAt) ? 'pending' : 'skipped',
          attempts: 0,
          ...(!production ? { lastError: 'Outbound delivery is suppressed outside production' } : !logisticsConfig.emailNotificationsEnabled ? { lastError: 'Email channel is disabled' } : !preferences.orderEmails ? { lastError: 'Customer disabled order emails' } : !(user.isVerified || user.emailVerifiedAt) ? { lastError: 'Email is not verified' } : {})
        },
        {
          channel: 'sms',
          template: `logistics.${input.eventType}.sms`,
          recipient: recipientPhone || 'unavailable',
          status: logisticsConfig.notificationsEnabled && logisticsConfig.smsNotificationsEnabled && preferences.smsNotifications && production && Boolean(recipientPhone && user.phoneVerifiedAt) ? 'pending' : 'skipped',
          attempts: 0,
          ...(!production ? { lastError: 'Outbound delivery is suppressed outside production' } : !logisticsConfig.smsNotificationsEnabled ? { lastError: 'SMS channel is disabled' } : !preferences.smsNotifications ? { lastError: 'Customer disabled SMS notifications' } : !recipientPhone || !user.phoneVerifiedAt ? { lastError: 'Verified phone is unavailable' } : {})
        },
        {
          channel: 'whatsapp',
          template: `logistics.${input.eventType}.whatsapp`,
          recipient: recipientWhatsapp || 'unavailable',
          status: logisticsConfig.notificationsEnabled && logisticsConfig.whatsappNotificationsEnabled && preferences.whatsappNotifications && production && Boolean(recipientWhatsapp && user.whatsappVerifiedAt) ? 'pending' : 'skipped',
          attempts: 0,
          ...(!production ? { lastError: 'Outbound delivery is suppressed outside production' } : !logisticsConfig.whatsappNotificationsEnabled ? { lastError: 'WhatsApp channel is disabled' } : !preferences.whatsappNotifications ? { lastError: 'Customer disabled WhatsApp notifications' } : !recipientWhatsapp || !user.whatsappVerifiedAt ? { lastError: 'Verified WhatsApp number is unavailable' } : {})
        }
      ];
      let event;
      try {
        event = await LogisticsNotificationEventModel.create({
          dedupeKey,
          eventType: input.eventType,
          source: input.source ?? 'service',
          order: order._id,
          shipment: input.shipmentId,
          customer: user._id,
          entityReference: input.entityReference,
          title,
          body,
          deliveries,
          occurredAt: input.occurredAt ?? new Date()
        });
      } catch (error) {
        if (duplicateKey(error)) return LogisticsNotificationEventModel.findOne({ dedupeKey }).lean();
        throw error;
      }
      for (const delivery of deliveries) await processDelivery(delivery, { userId: String(user._id), eventType: input.eventType, dedupeKey, title, body });
      event.set('deliveries', deliveries);
      event.status = logisticsNotificationAggregateStatus(deliveries);
      await event.save();
      return event;
    } catch (error) {
      logger.error('Logistics notification event could not be processed', { eventType: input.eventType, orderId: input.orderId, error: sanitizeLogisticsNotificationError(error) });
      return null;
    }
  },

  async list(input: { page: number; limit: number; status?: string }): Promise<unknown> {
    const filter: Record<string, unknown> = {};
    if (input.status === 'failed') filter.$or = [{ status: { $in: ['failed', 'partial'] } }, { 'deliveries.status': 'failed' }];
    else if (input.status) filter.status = input.status;
    const [items, total] = await Promise.all([
      LogisticsNotificationEventModel.find(filter).sort({ createdAt: -1 }).skip((input.page - 1) * input.limit).limit(input.limit).lean(),
      LogisticsNotificationEventModel.countDocuments(filter)
    ]);
    return { items, total, page: input.page, limit: input.limit, pages: Math.ceil(total / input.limit) };
  }
};
