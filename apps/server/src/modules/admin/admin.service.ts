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
   * Returns immutable audit logs for compliance review with optional filtering and pagination
   */
  async getAuditLogs(paramsOrLimit: number | { action?: string; resource?: string; fromDate?: string; toDate?: string; page?: number; limit?: number } = 50) {
    const isNumber = typeof paramsOrLimit === 'number';
    const limit = isNumber ? paramsOrLimit : (paramsOrLimit.limit || 50);
    const page = isNumber ? 1 : (paramsOrLimit.page || 1);
    const action = !isNumber ? paramsOrLimit.action : undefined;
    const resource = !isNumber ? paramsOrLimit.resource : undefined;
    const fromDate = !isNumber ? paramsOrLimit.fromDate : undefined;
    const toDate = !isNumber ? paramsOrLimit.toDate : undefined;

    if (isDbConnected()) {
      const where: any = {};
      if (action) where.action = { equals: action, mode: 'insensitive' };
      if (resource) where.resource = { equals: resource, mode: 'insensitive' };
      if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt.gte = new Date(fromDate);
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          where.createdAt.lte = to;
        }
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { name: true, email: true, role: true },
            },
          },
        }),
      ]);

      return {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } else {
      let filtered = [...inMemoryDb.auditLogs];

      if (action) {
        filtered = filtered.filter((l) => l.action.toLowerCase() === action.toLowerCase());
      }
      if (resource) {
        filtered = filtered.filter((l) => l.resource.toLowerCase() === resource.toLowerCase());
      }
      if (fromDate) {
        const from = new Date(fromDate).getTime();
        filtered = filtered.filter((l) => new Date(l.createdAt).getTime() >= from);
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        const toTime = to.getTime();
        filtered = filtered.filter((l) => new Date(l.createdAt).getTime() <= toTime);
      }

      // Sort descending by time
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const paginated = filtered.slice(skip, skip + limit).map((log) => {
        const user = log.userId ? inMemoryDb.users.find((u) => u.id === log.userId) : null;
        return {
          ...log,
          user: user ? { name: user.name, email: user.email, role: user.role } : null,
        };
      });

      return {
        logs: paginated,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }
  }

  /**
   * Search and filter all users on the platform with pagination (excluding patient medical data)
   */
  async getUsers(params: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const { search, role, status, page = 1, limit = 20 } = params;

    if (isDbConnected()) {
      const where: any = {};

      if (role && role !== 'ALL') {
        where.role = role as Role;
      }

      if (status && status !== 'ALL') {
        if (status === 'ACTIVE' || status === 'true') where.isActive = true;
        if (status === 'SUSPENDED' || status === 'INACTIVE' || status === 'false') where.isActive = false;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ];
      }

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            doctorProfile: {
              select: {
                id: true,
                specialization: true,
                registrationNo: true,
                clinicAddress: true,
                verificationStatus: true,
                verifiedAt: true,
              },
            },
            shopProfile: {
              select: {
                id: true,
                shopName: true,
                licenseNo: true,
                address: true,
                phone: true,
                timings: true,
                verificationStatus: true,
                verifiedAt: true,
              },
            },
            patientProfile: {
              select: {
                id: true,
                dob: true,
                gender: true,
                address: true,
                bloodGroup: true,
              },
            },
          },
        }),
      ]);

      return {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } else {
      let filtered = [...inMemoryDb.users];

      if (role && role !== 'ALL') {
        filtered = filtered.filter((u) => u.role === role);
      }

      if (status && status !== 'ALL') {
        const isActive = status === 'ACTIVE' || status === 'true';
        filtered = filtered.filter((u) => u.isActive === isActive);
      }

      if (search) {
        const sLower = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(sLower) ||
            u.email.toLowerCase().includes(sLower) ||
            u.phone.includes(search)
        );
      }

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const paginatedUsers = filtered.slice(skip, skip + limit).map((u) => {
        const doc = inMemoryDb.doctors.find((d) => d.userId === u.id);
        const shop = inMemoryDb.shops.find((s) => s.userId === u.id);
        const pat = inMemoryDb.patients.find((p) => p.userId === u.id);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          doctorProfile: doc
            ? {
                id: doc.id,
                specialization: doc.specialization,
                registrationNo: doc.registrationNo,
                clinicAddress: doc.clinicAddress,
                verificationStatus: doc.verificationStatus,
                verifiedAt: doc.verifiedAt,
              }
            : null,
          shopProfile: shop
            ? {
                id: shop.id,
                shopName: shop.shopName,
                licenseNo: shop.licenseNo,
                address: shop.address,
                phone: shop.phone,
                timings: shop.timings,
                verificationStatus: shop.verificationStatus,
                verifiedAt: shop.verifiedAt,
              }
            : null,
          patientProfile: pat
            ? {
                id: pat.id,
                dob: pat.dob,
                gender: pat.gender,
                address: pat.address,
                bloodGroup: pat.bloodGroup,
              }
            : null,
        };
      });

      return {
        users: paginatedUsers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }
  }

  /**
   * Suspend or Reactivate a user account
   */
  async updateUserStatus(userId: string, isActive: boolean, reason?: string, adminUserId?: string) {
    if (isDbConnected()) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundError('User not found');

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      if (!isActive) {
        await prisma.refreshToken.updateMany({
          where: { userId, revoked: false },
          data: { revoked: true },
        });
      }

      recordAuditLog({
        userId: adminUserId,
        action: isActive ? 'USER_REACTIVATED' : 'USER_SUSPENDED',
        resource: 'USER',
        resourceId: userId,
        metadata: {
          reason,
          targetUserEmail: user.email,
          targetUserRole: user.role,
          statusChange: isActive ? 'ACTIVE' : 'SUSPENDED',
        },
      });

      return updated;
    } else {
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (!user) throw new NotFoundError('User not found');

      user.isActive = isActive;
      user.updatedAt = new Date();

      if (!isActive) {
        inMemoryDb.refreshTokens
          .filter((t) => t.userId === userId)
          .forEach((t) => {
            t.revoked = true;
          });
      }

      recordAuditLog({
        userId: adminUserId,
        action: isActive ? 'USER_REACTIVATED' : 'USER_SUSPENDED',
        resource: 'USER',
        resourceId: userId,
        metadata: {
          reason,
          targetUserEmail: user.email,
          targetUserRole: user.role,
          statusChange: isActive ? 'ACTIVE' : 'SUSPENDED',
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt,
      };
    }
  }

  /**
   * Shows verification history with who approved/rejected what and when
   */
  async getVerificationHistory() {
    const verificationActions = ['DOCTOR_VERIFIED', 'DOCTOR_REJECTED', 'SHOP_VERIFIED', 'SHOP_REJECTED'];

    if (isDbConnected()) {
      const auditRecords = await prisma.auditLog.findMany({
        where: { action: { in: verificationActions } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return auditRecords.map((record) => {
        const meta = (record.metadata as any) || {};
        return {
          id: record.id,
          action: record.action,
          resource: record.resource,
          resourceId: record.resourceId,
          status: meta.status || (record.action.includes('VERIFIED') ? 'APPROVED' : 'REJECTED'),
          rejectionReason: meta.rejectionReason || null,
          verifiedAt: record.createdAt,
          verifiedBy: record.user
            ? {
                id: record.user.id,
                name: record.user.name,
                email: record.user.email,
              }
            : null,
          metadata: meta,
        };
      });
    } else {
      const logs = inMemoryDb.auditLogs
        .filter((l) => verificationActions.includes(l.action))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return logs.map((log) => {
        const adminUser = log.userId ? inMemoryDb.users.find((u) => u.id === log.userId) : null;
        const meta = (log.metadata as any) || {};

        let targetName = '';
        if (log.resource === 'DOCTOR') {
          const doc = inMemoryDb.doctors.find((d) => d.id === log.resourceId);
          if (doc) {
            const u = inMemoryDb.users.find((usr) => usr.id === doc.userId);
            targetName = u ? u.name : '';
          }
        } else if (log.resource === 'SHOP') {
          const s = inMemoryDb.shops.find((shp) => shp.id === log.resourceId);
          if (s) targetName = s.shopName;
        }

        return {
          id: log.id,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          targetName,
          status: meta.status || (log.action.includes('VERIFIED') ? 'APPROVED' : 'REJECTED'),
          rejectionReason: meta.rejectionReason || null,
          verifiedAt: log.createdAt,
          verifiedBy: adminUser
            ? {
                id: adminUser.id,
                name: adminUser.name,
                email: adminUser.email,
              }
            : null,
          metadata: meta,
        };
      });
    }
  }
}

export const adminService = new AdminService();
