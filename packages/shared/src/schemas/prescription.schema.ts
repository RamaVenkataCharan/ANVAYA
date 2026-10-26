import { z } from 'zod';

export const prescriptionItemSchema = z.object({
  medicine: z.string().trim().min(1, 'Medicine name is required').max(200, 'Medicine name cannot exceed 200 characters'),
  dosage: z.string().trim().min(1, 'Dosage is required (e.g. 500mg)').max(100, 'Dosage cannot exceed 100 characters'),
  frequency: z.string().trim().min(1, 'Frequency is required (e.g. 1-0-1 after food)').max(100, 'Frequency cannot exceed 100 characters'),
  duration: z.string().trim().min(1, 'Duration is required (e.g. 5 days)').max(100, 'Duration cannot exceed 100 characters'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  instructions: z.string().trim().max(500, 'Instructions cannot exceed 500 characters').optional(),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid('Valid patient ID is required'),
  diagnosis: z.string().trim().min(2, 'Diagnosis is required').max(500, 'Diagnosis cannot exceed 500 characters'),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  items: z
    .array(prescriptionItemSchema)
    .min(1, 'Prescription must contain at least one medicine')
    .max(30, 'Prescription cannot contain more than 30 medicine items'),
});

export const dispensePrescriptionSchema = z.object({
  codeOrToken: z.string().trim().min(1, 'Prescription code or QR token is required'),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type DispensePrescriptionInput = z.infer<typeof dispensePrescriptionSchema>;
