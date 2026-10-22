export enum Role {
  DOCTOR = 'DOCTOR',
  SHOP = 'SHOP',
  PATIENT = 'PATIENT',
  ADMIN = 'ADMIN',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PrescriptionStatus {
  ISSUED = 'ISSUED',
  DISPENSED = 'DISPENSED',
  CANCELLED = 'CANCELLED',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL',
}

export enum LedgerType {
  CREDIT = 'CREDIT',
  PAYMENT = 'PAYMENT',
}

export enum ReportType {
  LAB_REPORT = 'LAB_REPORT',
  IMAGING = 'IMAGING',
  PRESCRIPTION = 'PRESCRIPTION',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  BILL = 'BILL',
  OTHER = 'OTHER',
}
