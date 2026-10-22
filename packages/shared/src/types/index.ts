import { Role, VerificationStatus } from '../enums';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialization: string;
  registrationNo: string;
  clinicAddress: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

export interface ShopProfile {
  id: string;
  userId: string;
  shopName: string;
  licenseNo: string;
  address: string;
  phone: string;
  timings: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

export interface PatientProfile {
  id: string;
  userId: string;
  dob: string;
  gender: string;
  address: string;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
}

export interface AuthenticatedUser {
  id: string; // User ID
  name: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  doctorProfile?: DoctorProfile | null;
  shopProfile?: ShopProfile | null;
  patientProfile?: PatientProfile | null;
}

export interface JwtPayload {
  userId: string;
  email: string;
  phone: string;
  role: Role;
  doctorId?: string;
  shopId?: string;
  patientId?: string;
  verificationStatus?: VerificationStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}
