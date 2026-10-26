import { z } from 'zod';
import { AppointmentStatus } from '../enums';

export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
  dateTime: z
    .string()
    .datetime({ message: 'Appointment date & time must be a valid ISO 8601 string' })
    .refine((val) => new Date(val).getTime() > Date.now(), {
      message: 'Appointment date and time must be in the future',
    }),
  reason: z.string().trim().min(3, 'Reason for consultation is required').max(500),
  notes: z.string().trim().max(1000).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
  notes: z.string().trim().max(1000).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
