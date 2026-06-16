// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const NotificationController = {
  list: asyncHandler(async (req: Request, res: Response): Promise<void> => { if (!req.user) throw new ApiError(401, 'Authentication required'); const notifications = await NotificationService.list(req.user.userId); res.json(new ApiResponse(notifications, 'Notifications loaded')); }),
  markRead: asyncHandler(async (req: Request, res: Response): Promise<void> => { if (!req.user) throw new ApiError(401, 'Authentication required'); const notification = await NotificationService.markRead(req.user.userId, String(req.params.id ?? '')); res.json(new ApiResponse(notification, 'Notification read')); }),
  markAllRead: asyncHandler(async (req: Request, res: Response): Promise<void> => { if (!req.user) throw new ApiError(401, 'Authentication required'); await NotificationService.markAllRead(req.user.userId); res.json(new ApiResponse(null, 'Notifications read')); })
};
