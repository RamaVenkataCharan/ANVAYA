import { Role, VerificationStatus, PrescriptionStatus, AppointmentStatus, PaymentStatus, LedgerType, ReportType } from '../enums';

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
  user?: UserSummary;
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
  user?: UserSummary;
}

export interface PatientProfile {
  id: string;
  userId: string;
  dob: string;
  gender: string;
  address: string;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  user?: UserSummary;
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
  tokenVersion?: number;
  iat?: number;
  exp?: number;
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
  details?: any[];
  timestamp: string;
}

export interface PrescriptionItemModel {
  id: string;
  prescriptionId: string;
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string | null;
}

export interface PrescriptionModel {
  id: string;
  doctorId: string;
  patientId: string;
  shopId?: string | null;
  code: string;
  qrToken: string;
  status: PrescriptionStatus;
  diagnosis: string;
  notes?: string | null;
  issuedAt: string;
  dispensedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PrescriptionItemModel[];
  doctor?: {
    id: string;
    specialization: string;
    registrationNo: string;
    clinicAddress: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  patient?: {
    id: string;
    gender: string;
    dob: string;
    bloodGroup?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  shop?: {
    id: string;
    shopName: string;
    address: string;
    phone: string;
  } | null;
}

export interface AppointmentModel {
  id: string;
  doctorId: string;
  patientId: string;
  dateTime: string;
  status: AppointmentStatus;
  reason: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  doctor?: {
    id: string;
    specialization: string;
    clinicAddress: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  patient?: {
    id: string;
    gender: string;
    bloodGroup?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
}

export interface BillItemModel {
  id: string;
  billId: string;
  medicine: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BillModel {
  id: string;
  billNumber: string;
  shopId: string;
  patientId: string;
  prescriptionId?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: BillItemModel[];
  shop?: {
    id: string;
    shopName: string;
    licenseNo: string;
    address: string;
    phone: string;
  };
  patient?: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
}

export interface LedgerEntryModel {
  id: string;
  shopId: string;
  patientId: string;
  billId?: string | null;
  amount: number;
  type: LedgerType;
  description: string;
  createdAt: string;
  patient?: {
    id: string;
    user: {
      name: string;
      phone: string;
    };
  };
}

export interface RefillReminderModel {
  id: string;
  prescriptionId: string;
  patientId: string;
  remindAt: string;
  sent: boolean;
  sentAt?: string | null;
  createdAt: string;
  prescription?: PrescriptionModel;
}

export interface ReportModel {
  id: string;
  patientId: string;
  title: string;
  fileUrl: string;
  type: ReportType;
  notes?: string | null;
  uploadedAt: string;
  createdAt: string;
}

export interface ConsentModel {
  id: string;
  patientId: string;
  doctorId: string;
  isActive: boolean;
  grantedAt: string;
  revokedAt?: string | null;
  notes?: string | null;
  doctor?: {
    id: string;
    specialization: string;
    registrationNo: string;
    user: {
      name: string;
      email: string;
      phone: string;
    };
  };
}

export interface AuditLogModel {
  id: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: Role;
  };
}

export interface AdminStatsModel {
  totalUsers: number;
  totalDoctors: number;
  totalShops: number;
  totalPatients: number;
  pendingDoctorApprovals: number;
  pendingShopApprovals: number;
  totalPrescriptions: number;
  dispensedPrescriptions: number;
  totalBills: number;
  totalAppointments: number;
}
