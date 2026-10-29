import crypto from 'crypto';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb } from '../../db/inMemoryDb';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'APPOINTMENT' | 'PRESCRIPTION' | 'BILL' | 'SECURITY';
  read: boolean;
  createdAt: string;
}

// Global in-memory notifications store
const notificationsStore: AppNotification[] = [
  {
    id: 'notif-system-welcome',
    userId: 'global',
    title: 'Welcome to ANVAYA',
    message: 'Your account is active. Connect securely with doctors and pharmacies.',
    type: 'INFO',
    read: false,
    createdAt: new Date().toISOString(),
  },
];

export class NotificationService {
  /**
   * Retrieves notifications for the authenticated user
   */
  async getNotifications(userId: string): Promise<AppNotification[]> {
    // Return user-specific notifications plus system welcome
    const userNotifs = notificationsStore.filter(
      (n) => n.userId === userId || n.userId === 'global'
    );

    // If empty for this user, seed default welcome notification
    if (userNotifs.length === 0) {
      const initial: AppNotification = {
        id: crypto.randomUUID(),
        userId,
        title: 'Welcome to ANVAYA',
        message: 'Your secure paperless healthcare portal is ready.',
        type: 'INFO',
        read: false,
        createdAt: new Date().toISOString(),
      };
      notificationsStore.push(initial);
      return [initial];
    }

    return userNotifs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Marks a notification as read (with strict IDOR ownership verification)
   */
  async markAsRead(userId: string, notificationId: string): Promise<{ success: boolean }> {
    if (notificationId === 'all') {
      notificationsStore.forEach((n) => {
        if (n.userId === userId || n.userId === 'global') {
          n.read = true;
        }
      });
      return { success: true };
    }

    const existing = notificationsStore.find((n) => n.id === notificationId);
    if (!existing) {
      throw new NotFoundError('Notification not found');
    }
    if (existing.userId !== userId && existing.userId !== 'global') {
      throw new ForbiddenError('You do not have permission to modify this notification');
    }

    existing.read = true;
    return { success: true };
  }
}

export const notificationService = new NotificationService();

