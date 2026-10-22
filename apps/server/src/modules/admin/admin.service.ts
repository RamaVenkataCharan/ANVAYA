import { VerificationStatus, Role } from '@anvaya/shared';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';

export class AdminService {
  /**
   * Fetches all pending healthcare providers awaiting verification
   */
  async getPendingVerifications() {
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
  }

  /**
   * Quick summary of overall platform statistics for admin dashboard
   */
  async getSystemStats() {
    const [userCount, doctorCount, shopCount, patientCount, prescriptionCount, billCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.doctor.count(),
        prisma.shop.count(),
        prisma.patient.count(),
        prisma.prescription.count(),
        prisma.bill.count(),
      ]);

    return {
      totalUsers: userCount,
      doctors: doctorCount,
      pharmacies: shopCount,
      patients: patientCount,
      totalPrescriptions: prescriptionCount,
      totalBills: billCount,
    };
  }
}

export const adminService = new AdminService();
