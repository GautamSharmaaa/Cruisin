// Governed by .rules v1.0
import { NotificationModel } from '../models/notification.model.js';
import { ApiError } from '../utils/api-error.js';

export const NotificationService = {
  async list(userId: string): Promise<unknown[]> {
    return NotificationModel.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean();
  },
  async markRead(userId: string, notificationId: string): Promise<unknown> {
    const notification = await NotificationModel.findOneAndUpdate({ _id: notificationId, user: userId }, { readAt: new Date() }, { new: true });
    if (!notification) throw new ApiError(404, 'Notification not found');
    return notification;
  },
  async markAllRead(userId: string): Promise<void> {
    await NotificationModel.updateMany({ user: userId, readAt: { $exists: false } }, { readAt: new Date() });
  }
};
