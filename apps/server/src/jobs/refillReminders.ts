import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import cron from 'node-cron';
import { prisma, isDbConnected } from '../config/prisma';
import { inMemoryDb } from '../db/inMemoryDb';

const expo = new Expo();

/**
 * Finds due unsent refill reminders (remindAt <= now),
 * sends an Expo push notification to the patient if a valid push token exists,
 * and marks the reminder as sent.
 *
 * Exported so it can be invoked directly in automated tests without waiting for the schedule.
 */
export async function processDueRefillReminders(now: Date = new Date()): Promise<number> {
  let processedCount = 0;

  if (isDbConnected()) {
    const dueReminders = await prisma.refillReminder.findMany({
      where: {
        remindAt: { lte: now },
        sent: false,
      },
      include: {
        patient: {
          include: {
            user: { select: { id: true, name: true, pushToken: true } },
          },
        },
        prescription: {
          select: { code: true, diagnosis: true },
        },
      },
    });

    const messages: ExpoPushMessage[] = [];
    const reminderIdsToMarkSent: string[] = [];

    for (const reminder of dueReminders) {
      reminderIdsToMarkSent.push(reminder.id);
      const pushToken = reminder.patient?.user?.pushToken;

      if (pushToken && Expo.isExpoPushToken(pushToken)) {
        messages.push({
          to: pushToken,
          sound: 'default',
          title: '💊 Medication Refill Reminder',
          body: `Hi ${reminder.patient.user.name}, your prescription ${reminder.prescription?.code || ''} for ${reminder.prescription?.diagnosis || 'medication'} is due for a refill.`,
          data: {
            reminderId: reminder.id,
            prescriptionId: reminder.prescriptionId,
            type: 'REFILL_REMINDER',
          },
        });
      }
    }

    if (messages.length > 0) {
      try {
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          await expo.sendPushNotificationsAsync(chunk);
        }
      } catch (pushError) {
        console.warn('Error sending expo push notifications:', pushError);
      }
    }

    if (reminderIdsToMarkSent.length > 0) {
      await prisma.refillReminder.updateMany({
        where: { id: { in: reminderIdsToMarkSent } },
        data: {
          sent: true,
          sentAt: new Date(),
        },
      });
      processedCount = reminderIdsToMarkSent.length;
    }
  } else {
    // In-memory fallback
    const dueReminders = inMemoryDb.refillReminders.filter(
      (r) => r.remindAt.getTime() <= now.getTime() && !r.sent
    );

    const messages: ExpoPushMessage[] = [];

    for (const reminder of dueReminders) {
      const patient = inMemoryDb.patients.find((p) => p.id === reminder.patientId);
      const user = patient ? inMemoryDb.users.find((u) => u.id === patient.userId) : null;
      const prescription = inMemoryDb.prescriptions.find((p) => p.id === reminder.prescriptionId);

      reminder.sent = true;
      reminder.sentAt = new Date();
      processedCount++;

      const pushToken = user?.pushToken;
      if (pushToken && Expo.isExpoPushToken(pushToken)) {
        messages.push({
          to: pushToken,
          sound: 'default',
          title: '💊 Medication Refill Reminder',
          body: `Hi ${user?.name || 'there'}, your prescription ${prescription?.code || ''} for ${prescription?.diagnosis || 'medication'} is due for a refill.`,
          data: {
            reminderId: reminder.id,
            prescriptionId: reminder.prescriptionId,
            type: 'REFILL_REMINDER',
          },
        });
      }
    }

    if (messages.length > 0) {
      try {
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          await expo.sendPushNotificationsAsync(chunk);
        }
      } catch (pushError) {
        console.warn('Error sending in-memory expo push notifications:', pushError);
      }
    }
  }

  return processedCount;
}

/**
 * Initializes the node-cron scheduled job.
 * Runs daily at 09:00 AM.
 * Automatically skips scheduling when NODE_ENV=test.
 */
export function initRefillReminderCron() {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const task = cron.schedule('0 9 * * *', async () => {
    try {
      const count = await processDueRefillReminders();
      if (count > 0) {
        console.log(`[Cron] Sent ${count} due prescription refill reminders.`);
      }
    } catch (err) {
      console.error('[Cron] Error processing refill reminders:', err);
    }
  });

  console.log('⏰ Refill reminders daily cron job scheduled (09:00 AM)');
  return task;
}
