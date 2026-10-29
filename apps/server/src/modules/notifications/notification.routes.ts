import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/', authenticateJwt, (req, res, next) =>
  notificationController.getNotifications(req, res, next)
);

router.post('/:id/read', authenticateJwt, (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);

export const notificationRoutes = router;

