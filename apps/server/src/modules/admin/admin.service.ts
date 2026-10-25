import { VerificationStatus, Role } from '@anvaya/shared';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb } from '../../db/inMemoryDb';
import { NotFoundError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';

export class AdminService {
  /**
   * Fetches all pending healthcare providers awaiting verification
   */
  async getPendingVerifications() {
    if (isDbConnected()) {
      const [pendingDoctors, pendingShops] = await Promise.all([
        prisma.doctor.findMany({
          where: { verificationStatus: VerificationStatus.PENDING },
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, createdAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.shop.findMany({
          where: { verificationStatus: VerificationStatus.PENDING },
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, createdAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        doctors: pendingDoctors,
        shops: pendingShops,
        totalPending: pendingDoctors.length + pendingShops.length,
      };
    } else {
      const pendingDoctors = inMemoryDb.doctors
        .filter((d) => d.verificationStatus === VerificationStatus.PENDING)
        .map((doc) => {
          const user = inMemoryDb.users.find((u) => u.id === doc.userId);
          return {
            ...doc,
            user: user
              ? { id: user.id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt }
              : null,
          };
        });

      const pendingShops = inMemoryDb.shops
        .filter((s) => s.verificationStatus === VerificationStatus.PENDING)
        .map((shop) => {
          const user = inMemoryDb.users.find((u) => u.id === shop.userId);
          return {
            ...shop,
            user: user
              ? { id: user.id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt }
              : null,
          };
        });

      return {
        doctors: pendingDoctors,
        shops: pendingShops,
        totalPending: pendingDoctors.length + pendingShops.length,
      };
    }
  }

  /**
   * Approves or Rejects a Doctor's medical credentials
   */
  async verifyDoctor(
    doctorId: string,
    status: VerificationStatus.APPROVED | VerificationStatus.REJECTED,
    rejectionReason?: string,
    adminUserId?: string
  ) {
    if (isDbConnected()) {
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { user: true },
      });

      if (!doctor) {
        throw new NotFoundError('Doctor record not found');
      }

      const updated = await prisma.doctor.update({
        where: { id: doctorId },
        data: {
          verificationStatus: status,
          verifiedAt: status === VerificationStatus.APPROVED ? new Date() : null,
          rejectionReason: status === VerificationStatus.REJECTED ? rejectionReason : null,
        },
      });

      recordAuditLog({
        userId: adminUserId,
        action: status === VerificationStatus.APPROVED ? 'DOCTOR_VERIFIED' : 'DOCTOR_REJECTED',
        resource: 'DOCTOR',
        resourceId: doctorId,
        metadata: {
          doctorId,
          doctorUserId: doctor.userId,
          status,
          rejectionReason,
        },
      });

      return updated;
    } else {
      const doctor = inMemoryDb.doctors.find((d) => d.id === doctorId);
      if (!doctor) {
        throw new NotFoundError('Doctor record not found');
      }

      doctor.verificationStatus = status;
      doctor.verifiedAt = status === VerificationStatus.APPROVED ? new Date() : null;
      doctor.rejectionReason = status === VerificationStatus.REJECTED ? rejectionReason || null : null;
      doctor.updatedAt = new Date();

      recordAuditLog({
        userId: adminUserId,
        action: status === VerificationStatus.APPROVED ? 'DOCTOR_VERIFIED' : 'DOCTOR_REJECTED',
        resource: 'DOCTOR',
        resourceId: doctorId,
        metadata: {
          doctorId,
          doctorUserId: doctor.userId,
          status,
          rejectionReason,
        },
      });

      return doctor;
    }
  }

  /**
   * Approves or Rejects a Pharmacy Shop's drug license
   */
  async verifyShop(
    shopId: string,
    status: VerificationStatus.APPROVED | VerificationStatus.REJECTED,
    rejectionReason?: string,
    adminUserId?: string
  ) {
    if (isDbConnected()) {
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        include: { user: true },
      });

      if (!shop) {
        throw new NotFoundError('Pharmacy shop record not found');
      }

      const updated = await prisma.shop.update({
        where: { id: shopId },
        data: {
          verificationStatus: status,
          verifiedAt: status === VerificationStatus.APPROVED ? new Date() : null,
          rejectionReason: status === VerificationStatus.REJECTED ? rejectionReason : null,
        },
      });

      recordAuditLog({
        userId: adminUserId,
        action: status === VerificationStatus.APPROVED ? 'SHOP_VERIFIED' : 'SHOP_REJECTED',
        resource: 'SHOP',
        resourceId: shopId,
        metadata: {
          shopId,
          shopUserId: shop.userId,
          status,
          rejectionReason,
        },
      });

      return updated;
    } else {
      const shop = inMemoryDb.shops.find((s) => s.id === shopId);
      if (!shop) {
        throw new NotFoundError('Pharmacy shop record not found');
      }

      shop.verificationStatus = status;
      shop.verifiedAt = status === VerificationStatus.APPROVED ? new Date() : null;
      shop.rejectionReason = status === VerificationStatus.REJECTED ? rejectionReason || null : null;
      shop.updatedAt = new Date();

      recordAuditLog({
        userId: adminUserId,
        action: status === VerificationStatus.APPROVED ? 'SHOP_VERIFIED' : 'SHOP_REJECTED',
        resource: 'SHOP',
        resourceId: shopId,
        metadata: {
          shopId,
          shopUserId: shop.userId,
          status,
          rejectionReason,
        },
      });

      return shop;
    }
  }

  /**
   * Quick summary of overall platform statistics for admin dashboard
   */
  async getSystemStats() {
    if (isDbConnected()) {
      const [
        userCount,
        doctorCount,
        shopCount,
        patientCount,
        prescriptionCount,
        dispensedCount,
        billCount,
        appointmentCount,
        pendingDoctorCount,
        pendingShopCount,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.doctor.count(),
        prisma.shop.count(),
        prisma.patient.count(),
        prisma.prescription.count(),
        prisma.prescription.count({ where: { status: 'DISPENSED' } }),
        prisma.bill.count(),
        prisma.appointment.count(),
        prisma.doctor.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
        prisma.shop.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
      ]);

      return {
        totalUsers: userCount,
        totalDoctors: doctorCount,
        totalShops: shopCount,
        totalPatients: patientCount,
        totalPrescriptions: prescriptionCount,
        dispensedPrescriptions: dispensedCount,
        totalBills: billCount,
        totalAppointments: appointmentCount,
        pendingDoctorApprovals: pendingDoctorCount,
        pendingShopApprovals: pendingShopCount,
      };
    } else {
      return {
        totalUsers: inMemoryDb.users.length,
        totalDoctors: inMemoryDb.doctors.length,
        totalShops: inMemoryDb.shops.length,
        totalPatients: inMemoryDb.patients.length,
        totalPrescriptions: inMemoryDb.prescriptions.length,
        dispensedPrescriptions: inMemoryDb.prescriptions.filter((p) => p.status === 'DISPENSED').length,
        totalBills: inMemoryDb.bills.length,
        totalAppointments: inMemoryDb.appointments.length,
        pendingDoctorApprovals: inMemoryDb.doctors.filter((d) => d.verificationStatus === VerificationStatus.PENDING).length,
        pendingShopApprovals: inMemoryDb.shops.filter((s) => s.verificationStatus === VerificationStatus.PENDING).length,
      };
    }
  }

  /**
   * Returns immutable audit logs for compliance review
   */
  async getAuditLogs(limit = 50) {
    if (isDbConnected()) {
      return prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
        },
      });
    } else {
      return inMemoryDb.auditLogs.slice(0, limit).map((log) => {
        const user = log.userId ? inMemoryDb.users.find((u) => u.id === log.userId) : null;
        return {
          ...log,
          user: user ? { name: user.name, email: user.email, role: user.role } : null,
        };
      });
    }
  }
}

export const adminService = new AdminService();
