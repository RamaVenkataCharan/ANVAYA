import { z } from 'zod';

export const prescriptionItemSchema = z.object({
  medicine: z.string().trim().min(1, 'Medicine name is required'),
  dosage: z.string().trim().min(1, 'Dosage is required (e.g. 500mg)'),
  frequency: z.string().trim().min(1, 'Frequency is required (e.g. 1-0-1 after food)'),
  duration: z.string().trim().min(1, 'Duration is required (e.g. 5 days)'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  instructions: z.string().trim().optional(),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid('Valid patient ID is required'),
  diagnosis: z.string().trim().min(2, 'Diagnosis is required'),
  notes: z.string().trim().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'Prescription must contain at least one medicine'),
});

export const dispensePrescriptionSchema = z.object({
  codeOrToken: z.string().trim().min(1, 'Prescription code or QR token is required'),
  notes: z.string().trim().optional(),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type DispensePrescriptionInput = z.infer<typeof dispensePrescriptionSchema>;
