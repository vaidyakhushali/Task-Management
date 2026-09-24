import { Router } from 'express';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notifications.controllers.js';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyAccessToken);
router.get('/', listNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:notificationId/read', markNotificationRead);

export default router;