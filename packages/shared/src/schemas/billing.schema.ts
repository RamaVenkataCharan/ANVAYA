import { z } from 'zod';
import { LedgerType, PaymentStatus } from '../enums';

export const billItemSchema = z.object({
  medicine: z.string().trim().min(1, 'Medicine name is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be positive'),
  totalPrice: z.number().positive('Total price must be positive'),
});

export const createBillSchema = z
  .object({
    patientId: z.string().uuid('Valid patient ID is required').optional(),
    prescriptionId: z.string().uuid().optional(),
    items: z.array(billItemSchema).min(1, 'Bill must contain at least one item'),
    subtotal: z.number().nonnegative(),
    tax: z.number().nonnegative().default(0),
    total: z.number().positive('Total must be positive'),
    paymentStatus: z.nativeEnum(PaymentStatus).default(PaymentStatus.PAID),
    paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'KHATA_CREDIT']).default('UPI'),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.paymentMethod === 'KHATA_CREDIT' && !data.patientId) {
        return false;
      }
      return true;
    },
    {
      message: 'Patient must be selected for Khata Credit transactions',
      path: ['patientId'],
    }
  );

export const createLedgerEntrySchema = z.object({
  patientId: z.string().uuid('Patient ID is required'),
  amount: z.number().positive('Amount must be positive'),
  type: z.nativeEnum(LedgerType),
  description: z.string().trim().min(2, 'Description is required'),
});

export type BillItemInput = z.infer<typeof billItemSchema>;
export type CreateBillInput = z.infer<typeof createBillSchema>;
export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;
