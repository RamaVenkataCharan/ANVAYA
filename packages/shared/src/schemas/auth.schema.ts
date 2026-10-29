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

export const verifyEntitySchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    reason: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'REJECTED') {
        return typeof data.reason === 'string' && data.reason.trim().length >= 5;
      }
      return true;
    },
    {
      message: 'Rejection reason is required (minimum 5 characters)',
      path: ['reason'],
    }
  );

export type RegisterDoctorInput = z.infer<typeof registerDoctorSchema>;
export type RegisterShopInput = z.infer<typeof registerShopSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type VerifyEntityInput = z.infer<typeof verifyEntitySchema>;

export const forgotPasswordRequestSchema = z.object({
  identifier: z.string().trim().min(3, 'Email or phone number is required'),
});

export const forgotPasswordVerifySchema = z.object({
  identifier: z.string().trim().min(3, 'Email or phone number is required'),
  otp: z.string().trim().min(4, 'OTP code is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const resubmitVerificationSchema = z.object({
  specialization: z.string().trim().min(2).optional(),
  registrationNo: z.string().trim().min(3).optional(),
  clinicAddress: z.string().trim().min(5).optional(),
  shopName: z.string().trim().min(2).optional(),
  licenseNo: z.string().trim().min(3).optional(),
  address: z.string().trim().min(5).optional(),
  timings: z.string().trim().min(3).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().regex(phoneRegex, 'Valid phone number required').optional(),
  address: z.string().trim().min(3).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
  specialization: z.string().trim().min(2).optional(),
  clinicAddress: z.string().trim().min(5).optional(),
  shopName: z.string().trim().min(2).optional(),
  timings: z.string().trim().min(3).optional(),
  gstin: z.string().trim().optional(),
});


export const updatePatientProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    address: z.string().trim().min(3, 'Address is too short').optional(),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format').optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    bloodGroup: z.string().trim().optional(),
    emergencyContact: z.string().trim().optional(),
  })
  .strict();

export const updateDoctorProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    specialization: z.string().trim().min(2, 'Specialization is required').optional(),
    clinicAddress: z.string().trim().min(5, 'Clinic address is too short').optional(),
  })
  .strict();

export const updateShopProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    shopName: z.string().trim().min(2, 'Shop name is required').optional(),
    address: z.string().trim().min(5, 'Pharmacy address is too short').optional(),
    timings: z.string().trim().min(3, 'Timings are required').optional(),
  })
  .strict();

export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;
export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;
export type UpdateShopProfileInput = z.infer<typeof updateShopProfileSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm account deletion'),
  reason: z.string().trim().max(500).optional(),
});

export type ForgotPasswordRequestInput = z.infer<typeof forgotPasswordRequestSchema>;
export type ForgotPasswordVerifyInput = z.infer<typeof forgotPasswordVerifySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResubmitVerificationInput = z.infer<typeof resubmitVerificationSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
