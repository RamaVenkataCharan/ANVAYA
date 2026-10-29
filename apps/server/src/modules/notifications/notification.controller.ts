import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';

export class NotificationController {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const notifications = await notificationService.getNotifications(userId);
      res.status(200).json({
        success: true,
        data: notifications,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await notificationService.markAsRead(userId, id);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();

