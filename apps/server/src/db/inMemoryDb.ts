import { Role, VerificationStatus, PrescriptionStatus, AppointmentStatus, PaymentStatus, LedgerType, ReportType } from '@anvaya/shared';
import { hashPasswordSync } from '../utils/password';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const getStorePath = () => {
  const workerSuffix = process.env.VITEST_WORKER_ID ? `_${process.env.VITEST_WORKER_ID}` : '';
  return path.resolve(__dirname, `../../.refresh_tokens_store${workerSuffix}.json`);
};

export interface DbUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  pushToken?: string | null;
  tokenVersion?: number;
  tokensInvalidatedBefore?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbDoctor {
  id: string;
  userId: string;
  specialization: string;
  registrationNo: string;
  clinicAddress: string;
  verificationStatus: VerificationStatus;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbShop {
  id: string;
  userId: string;
  shopName: string;
  licenseNo: string;
  address: string;
  phone: string;
  timings: string;
  verificationStatus: VerificationStatus;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbPatient {
  id: string;
  userId: string;
  dob: Date;
  gender: string;
  address: string;
  bloodGroup: string | null;
  emergencyContact: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbPrescriptionItem {
  id: string;
  prescriptionId: string;
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string | null;
}

export interface DbPrescription {
  id: string;
  doctorId: string;
  patientId: string;
  shopId: string | null;
  code: string;
  qrToken: string;
  status: PrescriptionStatus;
  diagnosis: string;
  notes: string | null;
  issuedAt: Date;
  dispensedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAppointment {
  id: string;
  doctorId: string;
  patientId: string;
  dateTime: Date;
  status: AppointmentStatus;
  reason: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbBillItem {
  id: string;
  billId: string;
  medicine: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DbBill {
  id: string;
  billNumber: string;
  shopId: string;
  patientId: string | null;
  prescriptionId: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbLedgerEntry {
  id: string;
  shopId: string;
  patientId: string;
  billId: string | null;
  amount: number;
  type: LedgerType;
  description: string;
  createdAt: Date;
}

export interface DbRefillReminder {
  id: string;
  prescriptionId: string;
  patientId: string;
  remindAt: Date;
  sent: boolean;
  sentAt: Date | null;
  createdAt: Date;
}

export interface DbReport {
  id: string;
  patientId: string;
  title: string;
  fileUrl: string;
  type: ReportType;
  notes: string | null;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbConsent {
  id: string;
  patientId: string;
  doctorId: string;
  isActive: boolean;
  grantedAt: Date;
  revokedAt: Date | null;
  notes: string | null;
}

export interface DbAuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: Date;
}

export interface DbRefreshToken {
  id: string;
  userId: string;
  hash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

class InMemoryDatabase {
  users: DbUser[] = [];
  doctors: DbDoctor[] = [];
  shops: DbShop[] = [];
  patients: DbPatient[] = [];
  prescriptions: DbPrescription[] = [];
  prescriptionItems: DbPrescriptionItem[] = [];
  appointments: DbAppointment[] = [];
  bills: DbBill[] = [];
  billItems: DbBillItem[] = [];
  ledgerEntries: DbLedgerEntry[] = [];
  refillReminders: DbRefillReminder[] = [];
  reports: DbReport[] = [];
  consents: DbConsent[] = [];
  auditLogs: DbAuditLog[] = [];
  refreshTokens: DbRefreshToken[] = [];

  private initialized = false;

  constructor() {
    this.seed();
    this.loadPersistedRefreshTokens();
  }

  loadPersistedRefreshTokens(): void {
    try {
      const storePath = getStorePath();
      if (fs.existsSync(storePath)) {
        const data = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(data)) {
          this.refreshTokens = data.map((t: any) => ({
            id: t.id,
            userId: t.userId,
            hash: t.hash,
            expiresAt: new Date(t.expiresAt),
            revokedAt: t.revokedAt ? new Date(t.revokedAt) : null,
            createdAt: new Date(t.createdAt),
          }));
        }
      }
    } catch {
      // Ignore reading issues on initialization
    }
  }

  persistRefreshTokens(): void {
    try {
      const storePath = getStorePath();
      fs.writeFileSync(
        storePath,
        JSON.stringify(this.refreshTokens, null, 2),
        'utf-8'
      );
    } catch {
      // Ignore writing issues
    }
  }

  clearPersistedRefreshTokens(): void {
    try {
      const storePath = getStorePath();
      if (fs.existsSync(storePath)) {
        fs.unlinkSync(storePath);
      }
    } catch {
      // Ignore unlink issues
    }
    this.refreshTokens = [];
  }

  seed() {
    if (this.initialized) return;
    this.initialized = true;

    const defaultPassword = hashPasswordSync('Password123');

    // 1. Admin
    const adminId = 'a0000000-0000-0000-0000-000000000001';
    this.users.push({
      id: adminId,
      name: 'System Administrator',
      email: 'admin@anvaya.health',
      phone: '+919999900000',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Approved Doctor: Dr. Sarah Sharma
    const doctorUserId = 'd0000000-0000-0000-0000-000000000001';
    const doctorId = 'd1111111-1111-1111-1111-111111111111';
    this.users.push({
      id: doctorUserId,
      name: 'Dr. Sarah Sharma',
      email: 'dr.sharma@anvaya.health',
      phone: '+919876543210',
      passwordHash: defaultPassword,
      role: Role.DOCTOR,
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 86400000),
      updatedAt: new Date(),
    });
    this.doctors.push({
      id: doctorId,
      userId: doctorUserId,
      specialization: 'Cardiology',
      registrationNo: 'MCI-884920',
      clinicAddress: 'Suite 4B, Apollo Health City, Jubilee Hills, Hyderabad',
      verificationStatus: VerificationStatus.APPROVED,
      verifiedAt: new Date(Date.now() - 28 * 86400000),
      rejectionReason: null,
      createdAt: new Date(Date.now() - 30 * 86400000),
      updatedAt: new Date(),
    });

    // 3. Pending Doctor: Dr. Rahul Patel
    const pendingDocUserId = 'd0000000-0000-0000-0000-000000000002';
    const pendingDocId = 'd2222222-2222-2222-2222-222222222222';
    this.users.push({
      id: pendingDocUserId,
      name: 'Dr. Rahul Patel',
      email: 'dr.patel@anvaya.health',
      phone: '+919876543213',
      passwordHash: defaultPassword,
      role: Role.DOCTOR,
      isActive: true,
      createdAt: new Date(Date.now() - 2 * 86400000),
      updatedAt: new Date(),
    });
    this.doctors.push({
      id: pendingDocId,
      userId: pendingDocUserId,
      specialization: 'Neurology',
      registrationNo: 'MCI-994102',
      clinicAddress: 'Care Hospital, Road No. 1, Banjara Hills, Hyderabad',
      verificationStatus: VerificationStatus.PENDING,
      verifiedAt: null,
      rejectionReason: null,
      createdAt: new Date(Date.now() - 2 * 86400000),
      updatedAt: new Date(),
    });

    // 4. Approved Pharmacy: MedPlus Pharmacy
    const shopUserId = 's0000000-0000-0000-0000-000000000001';
    const shopId = 's1111111-1111-1111-1111-111111111111';
    this.users.push({
      id: shopUserId,
      name: 'Kiran Kumar (MedPlus)',
      email: 'medplus@anvaya.health',
      phone: '+919876543211',
      passwordHash: defaultPassword,
      role: Role.SHOP,
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 86400000),
      updatedAt: new Date(),
    });
    this.shops.push({
      id: shopId,
      userId: shopUserId,
      shopName: 'MedPlus Pharmacy Banjara Hills',
      licenseNo: 'DL-TS-2024-99881',
      address: 'Shop 12, Road No. 12, Banjara Hills, Hyderabad',
      phone: '+919876543211',
      timings: '08:00 AM - 11:00 PM',
      verificationStatus: VerificationStatus.APPROVED,
      verifiedAt: new Date(Date.now() - 28 * 86400000),
      rejectionReason: null,
      createdAt: new Date(Date.now() - 30 * 86400000),
      updatedAt: new Date(),
    });

    // 5. Pending Pharmacy: Apollo Pharmacy
    const pendingShopUserId = 's0000000-0000-0000-0000-000000000002';
    const pendingShopId = 's2222222-2222-2222-2222-222222222222';
    this.users.push({
      id: pendingShopUserId,
      name: 'Vikas Rao (Apollo Pharmacy)',
      email: 'apollo@anvaya.health',
      phone: '+919876543214',
      passwordHash: defaultPassword,
      role: Role.SHOP,
      isActive: true,
      createdAt: new Date(Date.now() - 3 * 86400000),
      updatedAt: new Date(),
    });
    this.shops.push({
      id: pendingShopId,
      userId: pendingShopUserId,
      shopName: 'Apollo Pharmacy Madhapur',
      licenseNo: 'DL-TS-2024-77123',
      address: 'Hitech City Main Road, Madhapur, Hyderabad',
      phone: '+919876543214',
      timings: '24 Hours',
      verificationStatus: VerificationStatus.PENDING,
      verifiedAt: null,
      rejectionReason: null,
      createdAt: new Date(Date.now() - 3 * 86400000),
      updatedAt: new Date(),
    });

    // 6. Patient: Ramesh Varma
    const patientUserId = 'p0000000-0000-0000-0000-000000000001';
    const patientId = 'p1111111-1111-1111-1111-111111111111';
    this.users.push({
      id: patientUserId,
      name: 'Ramesh Varma',
      email: 'ramesh.varma@anvaya.health',
      phone: '+919876543212',
      passwordHash: defaultPassword,
      role: Role.PATIENT,
      isActive: true,
      createdAt: new Date(Date.now() - 20 * 86400000),
      updatedAt: new Date(),
    });
    this.patients.push({
      id: patientId,
      userId: patientUserId,
      dob: new Date('1988-06-14'),
      gender: 'MALE',
      address: 'Flat 302, Green Meadows, Madhapur, Hyderabad',
      bloodGroup: 'O+',
      emergencyContact: '+919876543299',
      createdAt: new Date(Date.now() - 20 * 86400000),
      updatedAt: new Date(),
    });

    // 7. Active Prescription for Ramesh Varma by Dr. Sarah Sharma
    const pres1Id = 'pr111111-1111-1111-1111-111111111111';
    const pres1Token = crypto.randomBytes(32).toString('hex');
    this.prescriptions.push({
      id: pres1Id,
      doctorId,
      patientId,
      shopId: null,
      code: 'ANV-8942-7193',
      qrToken: pres1Token,
      status: PrescriptionStatus.ISSUED,
      diagnosis: 'Hypertension & Mild Angina',
      notes: 'Maintain low sodium diet and take medications after breakfast.',
      issuedAt: new Date(Date.now() - 2 * 86400000),
      dispensedAt: null,
      createdAt: new Date(Date.now() - 2 * 86400000),
      updatedAt: new Date(Date.now() - 2 * 86400000),
    });

    this.prescriptionItems.push(
      {
        id: crypto.randomUUID(),
        prescriptionId: pres1Id,
        medicine: 'Telmisartan 40mg',
        dosage: '40mg',
        frequency: '1-0-0 after food',
        duration: '30 days',
        quantity: 30,
        instructions: 'Take once every morning with water',
      },
      {
        id: crypto.randomUUID(),
        prescriptionId: pres1Id,
        medicine: 'Atorvastatin 10mg',
        dosage: '10mg',
        frequency: '0-0-1 after dinner',
        duration: '30 days',
        quantity: 30,
        instructions: 'Take at bedtime',
      }
    );

    // 8. Dispensed Prescription (History)
    const pres2Id = 'pr222222-2222-2222-2222-222222222222';
    const pres2Token = crypto.randomBytes(32).toString('hex');
    this.prescriptions.push({
      id: pres2Id,
      doctorId,
      patientId,
      shopId,
      code: 'ANV-5102-3349',
      qrToken: pres2Token,
      status: PrescriptionStatus.DISPENSED,
      diagnosis: 'Acute Upper Respiratory Infection',
      notes: 'Course of 5 days antibiotic. Drink plenty of warm liquids.',
      issuedAt: new Date(Date.now() - 15 * 86400000),
      dispensedAt: new Date(Date.now() - 15 * 86400000 + 7200000),
      createdAt: new Date(Date.now() - 15 * 86400000),
      updatedAt: new Date(Date.now() - 15 * 86400000),
    });

    this.prescriptionItems.push({
      id: crypto.randomUUID(),
      prescriptionId: pres2Id,
      medicine: 'Amoxicillin + Clavulanic Acid 625mg',
      dosage: '625mg',
      frequency: '1-0-1 after food',
      duration: '5 days',
      quantity: 10,
      instructions: 'Complete full course',
    });

    // 9. Bill for the dispensed prescription
    const bill1Id = 'b1111111-1111-1111-1111-111111111111';
    this.bills.push({
      id: bill1Id,
      billNumber: 'INV-2026-0001',
      shopId,
      patientId,
      prescriptionId: pres2Id,
      subtotal: 320,
      tax: 38.4,
      total: 358.4,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'UPI',
      notes: 'Dispensed against prescription ANV-5102-3349',
      createdAt: new Date(Date.now() - 15 * 86400000 + 7200000),
      updatedAt: new Date(Date.now() - 15 * 86400000 + 7200000),
    });

    this.billItems.push({
      id: crypto.randomUUID(),
      billId: bill1Id,
      medicine: 'Amoxicillin + Clavulanic Acid 625mg (10 Tabs)',
      quantity: 10,
      unitPrice: 32,
      totalPrice: 320,
    });

    // 10. Appointments
    this.appointments.push(
      {
        id: 'ap111111-1111-1111-1111-111111111111',
        doctorId,
        patientId,
        dateTime: new Date(Date.now() + 2 * 86400000),
        status: AppointmentStatus.CONFIRMED,
        reason: 'Monthly Blood Pressure & Cardiac Followup',
        notes: 'Bring recent ECG report if available',
        createdAt: new Date(Date.now() - 2 * 86400000),
        updatedAt: new Date(),
      },
      {
        id: 'ap222222-2222-2222-2222-222222222222',
        doctorId,
        patientId,
        dateTime: new Date(Date.now() - 15 * 86400000),
        status: AppointmentStatus.COMPLETED,
        reason: 'Flu symptoms and persistent cough',
        notes: 'Consultation completed. Antibiotic prescribed.',
        createdAt: new Date(Date.now() - 16 * 86400000),
        updatedAt: new Date(Date.now() - 15 * 86400000),
      }
    );

    // 11. Reports in Digital Vault
    this.reports.push(
      {
        id: 'rp111111-1111-1111-1111-111111111111',
        patientId,
        title: 'Complete Blood Picture & Lipid Profile',
        fileUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80',
        type: ReportType.LAB_REPORT,
        notes: 'Total cholesterol 210 mg/dL, HDL 45 mg/dL, LDL 130 mg/dL',
        uploadedAt: new Date(Date.now() - 10 * 86400000),
        createdAt: new Date(Date.now() - 10 * 86400000),
        updatedAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        id: 'rp222222-2222-2222-2222-222222222222',
        patientId,
        title: '12-Lead Electrocardiogram (ECG)',
        fileUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80',
        type: ReportType.IMAGING,
        notes: 'Normal sinus rhythm, HR 72 bpm',
        uploadedAt: new Date(Date.now() - 5 * 86400000),
        createdAt: new Date(Date.now() - 5 * 86400000),
        updatedAt: new Date(Date.now() - 5 * 86400000),
      }
    );

    // 12. Active Consent granted by Patient to Dr. Sarah Sharma
    this.consents.push({
      id: 'cs111111-1111-1111-1111-111111111111',
      patientId,
      doctorId,
      isActive: true,
      grantedAt: new Date(Date.now() - 20 * 86400000),
      revokedAt: null,
      notes: 'Clinical access for cardiology management',
    });

    // 13. Khata (Ledger) entry
    this.ledgerEntries.push({
      id: 'lg111111-1111-1111-1111-111111111111',
      shopId,
      patientId,
      billId: null,
      amount: 150,
      type: LedgerType.CREDIT,
      description: 'First Aid Kit & Digital Thermometer on Credit',
      createdAt: new Date(Date.now() - 7 * 86400000),
    });

    // 14. Refill Reminder
    this.refillReminders.push({
      id: 'rf111111-1111-1111-1111-111111111111',
      prescriptionId: pres1Id,
      patientId,
      remindAt: new Date(Date.now() + 25 * 86400000),
      sent: false,
      sentAt: null,
      createdAt: new Date(Date.now() - 2 * 86400000),
    });

    // 15. Audit Logs
    this.auditLogs.push(
      {
        id: crypto.randomUUID(),
        userId: adminId,
        action: 'DOCTOR_VERIFIED',
        resource: 'DOCTOR',
        resourceId: doctorId,
        ipAddress: '127.0.0.1',
        userAgent: 'ANVAYA Admin Console',
        metadata: { status: 'APPROVED' },
        createdAt: new Date(Date.now() - 28 * 86400000),
      },
      {
        id: crypto.randomUUID(),
        userId: doctorUserId,
        action: 'PRESCRIPTION_ISSUED',
        resource: 'PRESCRIPTION',
        resourceId: pres1Id,
        ipAddress: '127.0.0.1',
        userAgent: 'ANVAYA Web Client',
        metadata: { code: 'ANV-8942-7193' },
        createdAt: new Date(Date.now() - 2 * 86400000),
      }
    );
  }
}

export const inMemoryDb = new InMemoryDatabase();
