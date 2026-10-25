import { z } from 'zod';

export const grantConsentSchema = z.object({
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
  notes: z.string().trim().max(500).optional(),
});

export const revokeConsentSchema = z.object({
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
});

export type GrantConsentInput = z.infer<typeof grantConsentSchema>;
export type RevokeConsentInput = z.infer<typeof revokeConsentSchema>;
