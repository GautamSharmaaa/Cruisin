// Governed by .rules v1.0
import { Router } from 'express';
import { NotificationController } from '../../controllers/notification.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idParamSchema } from '../../validators/common.validator.js';

export const notificationRouter = Router();
notificationRouter.get('/', requireAuth, NotificationController.list);
notificationRouter.patch('/read-all', requireAuth, NotificationController.markAllRead);
notificationRouter.patch('/:id/read', requireAuth, validate({ params: idParamSchema }), NotificationController.markRead);
