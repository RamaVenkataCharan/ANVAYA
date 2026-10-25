import { z } from 'zod';

export const createRefillReminderSchema = z.object({
  prescriptionId: z.string().uuid('Valid prescription ID is required'),
  remindAt: z.string().min(1, 'Remind date is required'),
});

export const pushTokenSchema = z.object({
  token: z.string().trim().min(1, 'Push token is required'),
});

export type CreateRefillReminderInput = z.infer<typeof createRefillReminderSchema>;
export type PushTokenInput = z.infer<typeof pushTokenSchema>;
