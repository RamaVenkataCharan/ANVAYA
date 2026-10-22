import { z } from 'zod';
import { Role } from '../enums';

export const phoneRegex = /^[+]?[0-9]{10,15}$/;

const baseUserFields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  phone: z.string().trim().regex(phoneRegex, 'Phone number must be valid (10-15 digits)'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
};

export const registerDoctorSchema = z.object({
  ...baseUserFields,
  role: z.literal(Role.DOCTOR),
  specialization: z.string().trim().min(2, 'Specialization is required'),
  registrationNo: z.string().trim().min(3, 'Medical registration number is required'),
  clinicAddress: z.string().trim().min(5, 'Clinic address is required'),
});

export const registerShopSchema = z.object({
  ...baseUserFields,
  role: z.literal(Role.SHOP),
  shopName: z.string().trim().min(2, 'Shop name is required'),
  licenseNo: z.string().trim().min(3, 'Drug license number is required'),
  address: z.string().trim().min(5, 'Pharmacy address is required'),
  timings: z.string().trim().min(3, 'Operating timings are required (e.g. 09:00 AM - 10:00 PM)'),
});

export const registerPatientSchema = z.object({
  ...baseUserFields,
  role: z.literal(Role.PATIENT),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  address: z.string().trim().min(5, 'Address is required'),
  bloodGroup: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
});

export const registerAdminSchema = z.object({
  ...baseUserFields,
  role: z.literal(Role.ADMIN),
  adminCode: z.string().min(6, 'Admin authorization code is required'),
});

export const registerSchema = z.discriminatedUnion('role', [
  registerDoctorSchema,
  registerShopSchema,
  registerPatientSchema,
  registerAdminSchema,
]);

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Email or phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const verifyEntitySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional(),
});

export type RegisterDoctorInput = z.infer<typeof registerDoctorSchema>;
export type RegisterShopInput = z.infer<typeof registerShopSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type VerifyEntityInput = z.infer<typeof verifyEntitySchema>;
