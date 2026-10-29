import { VerificationStatus, Role } from '@anvaya/shared';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb } from '../../db/inMemoryDb';
import { NotFoundError, UnauthorizedError, ForbiddenError } from '../../utils/errors';
import { authService } from '../auth/auth.service';
import { comparePassword } from '../../utils/password';
import { recordAuditLog } from '../../middleware/audit';

export class UsersService {
  /**
   * Returns list of verified pharmacy shops for the patient directory
   */
  async getVerifiedShops(search?: string) {
    if (isDbConnected()) {
      const where: any = {
        verificationStatus: VerificationStatus.APPROVED,
      };

      if (search) {
        where.OR = [
          { shopName: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ];
      }

      return prisma.shop.findMany({
        where,
        select: {
          id: true,
          shopName: true,
          address: true,
          phone: true,
          timings: true,
          licenseNo: true,
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { shopName: 'asc' },
      });
    } else {
      let shops = inMemoryDb.shops.filter((s) => s.verificationStatus === VerificationStatus.APPROVED);

      if (search) {
        const sLower = search.toLowerCase();
        shops = shops.filter(
          (s) => s.shopName.toLowerCase().includes(sLower) || s.address.toLowerCase().includes(sLower)
        );
      }

      return shops.map((shop) => {
        const user = inMemoryDb.users.find((u) => u.id === shop.userId);
        return {
          id: shop.id,
          shopName: shop.shopName,
          address: shop.address,
          phone: shop.phone,
          timings: shop.timings,
          licenseNo: shop.licenseNo,
          user: user ? { name: user.name, email: user.email } : { name: '', email: '' },
        };
      });
    }
  }

  /**
   * Returns a specific pharmacy shop by ID
   */
  async getShopById(shopId: string) {
    if (isDbConnected()) {
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true,
          shopName: true,
          address: true,
          phone: true,
          timings: true,
          licenseNo: true,
          verificationStatus: true,
          user: {
            select: { name: true, email: true },
          },
        },
      });

      if (!shop) {
        throw new NotFoundError('Pharmacy shop not found');
      }

      return shop;
    } else {
      const shop = inMemoryDb.shops.find((s) => s.id === shopId);
      if (!shop) {
        throw new NotFoundError('Pharmacy shop not found');
      }
      const user = inMemoryDb.users.find((u) => u.id === shop.userId);
      return {
        id: shop.id,
        shopName: shop.shopName,
        address: shop.address,
        phone: shop.phone,
        timings: shop.timings,
        licenseNo: shop.licenseNo,
        verificationStatus: shop.verificationStatus,
        user: user ? { name: user.name, email: user.email } : { name: '', email: '' },
      };
    }
  }

  /**
   * Returns list of verified doctors
   */
  async getVerifiedDoctors(search?: string) {
    if (isDbConnected()) {
      const where: any = {
        verificationStatus: VerificationStatus.APPROVED,
      };

      if (search) {
        where.OR = [
          { specialization: { contains: search, mode: 'insensitive' } },
          { clinicAddress: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      return prisma.doctor.findMany({
        where,
        select: {
          id: true,
          specialization: true,
          clinicAddress: true,
          registrationNo: true,
          user: {
            select: { name: true, email: true, phone: true },
          },
        },
        orderBy: { user: { name: 'asc' } },
      });
    } else {
      let docs = inMemoryDb.doctors.filter((d) => d.verificationStatus === VerificationStatus.APPROVED);

      if (search) {
        const sLower = search.toLowerCase();
        docs = docs.filter((d) => {
          const user = inMemoryDb.users.find((u) => u.id === d.userId);
          return (
            (d.specialization && d.specialization.toLowerCase().includes(sLower)) ||
            (d.clinicAddress && d.clinicAddress.toLowerCase().includes(sLower)) ||
            (user && user.name && user.name.toLowerCase().includes(sLower))
          );
        });
      }

      return docs.map((doc) => {
        const user = inMemoryDb.users.find((u) => u.id === doc.userId);
        return {
          id: doc.id,
          specialization: doc.specialization,
          clinicAddress: doc.clinicAddress,
          registrationNo: doc.registrationNo,
          user: user
            ? { name: user.name, email: user.email, phone: user.phone }
            : { name: '', email: '', phone: '' },
        };
      });
    }
  }

  /**
   * Returns doctor details by ID
   */
  async getDoctorById(doctorId: string) {
    if (isDbConnected()) {
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: {
          id: true,
          specialization: true,
          clinicAddress: true,
          registrationNo: true,
          verificationStatus: true,
          user: {
            select: { name: true, email: true, phone: true },
          },
        },
      });

      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }

      return doctor;
    } else {
      const doc = inMemoryDb.doctors.find((d) => d.id === doctorId);
      if (!doc) {
        throw new NotFoundError('Doctor not found');
      }
      const user = inMemoryDb.users.find((u) => u.id === doc.userId);
      return {
        id: doc.id,
        specialization: doc.specialization,
        clinicAddress: doc.clinicAddress,
        registrationNo: doc.registrationNo,
        verificationStatus: doc.verificationStatus,
        user: user ? { name: user.name, email: user.email, phone: user.phone } : null,
      };
    }
  }

  /**
   * Search patients for clinical prescriptions and billing
   */
  async searchPatients(query?: string) {
    if (isDbConnected()) {
      const where: any = {};
      if (query) {
        where.user = {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        };
      }

      return prisma.patient.findMany({
        where,
        select: {
          id: true,
          dob: true,
          gender: true,
          bloodGroup: true,
          emergencyContact: true,
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });
    } else {
      let patients = inMemoryDb.patients;
      if (query) {
        const qLower = query.toLowerCase();
        patients = patients.filter((p) => {
          const user = inMemoryDb.users.find((u) => u.id === p.userId);
          if (!user) return false;
          return (
            user.name.toLowerCase().includes(qLower) ||
            user.phone.includes(query) ||
            user.email.toLowerCase().includes(qLower)
          );
        });
      }

      return patients.map((p) => {
        const user = inMemoryDb.users.find((u) => u.id === p.userId);
        return {
          id: p.id,
          dob: p.dob.toISOString().split('T')[0],
          gender: p.gender,
          bloodGroup: p.bloodGroup,
          emergencyContact: p.emergencyContact,
          user: user
            ? { id: user.id, name: user.name, email: user.email, phone: user.phone }
            : { id: '', name: '', email: '', phone: '' },
        };
      });
    }
  }

  /**
   * Look up patient by exact phone number for verified doctors.
   * Only returns id, name, and age to maintain patient privacy.
   */
  async lookupPatientByPhone(phone: string) {
    const cleanPhone = phone.trim();

    const calculateAge = (dob: Date | string): number => {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return Math.max(0, age);
    };

    if (isDbConnected()) {
      const patient = await prisma.patient.findFirst({
        where: {
          user: { phone: cleanPhone },
        },
        include: {
          user: { select: { name: true } },
        },
      });

      if (!patient) return null;

      return {
        id: patient.id,
        name: patient.user.name,
        age: calculateAge(patient.dob),
      };
    } else {
      const user = inMemoryDb.users.find(
        (u) => u.phone === cleanPhone && u.role === Role.PATIENT
      );
      if (!user) return null;

      const patient = inMemoryDb.patients.find((p) => p.userId === user.id);
      if (!patient) return null;

      return {
        id: patient.id,
        name: user.name,
        age: calculateAge(patient.dob),
      };
    }
  }

  /**
   * Saves or updates expo push token for the authenticated user
   */
  async savePushToken(userId: string, token: string) {
    if (isDbConnected()) {
      return prisma.user.update({
        where: { id: userId },
        data: { pushToken: token },
        select: { id: true, name: true, pushToken: true },
      });
    } else {
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (!user) throw new NotFoundError('User not found');
      user.pushToken = token;
      user.updatedAt = new Date();
      return { id: user.id, name: user.name, pushToken: user.pushToken };
    }
  }

  /**
   * Updates user profile and role details (Tier B)
   */
  async updateProfile(
    userId: string,
    role: Role,
    updates: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (isDbConnected()) {
      if (updates.name || updates.phone) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...(updates.name && { name: updates.name }),
            ...(updates.phone && { phone: updates.phone }),
          },
        });
      }

      if (role === Role.PATIENT) {
        await prisma.patient.update({
          where: { userId },
          data: {
            ...(updates.address && { address: updates.address }),
            ...(updates.dob && { dob: new Date(updates.dob) }),
            ...(updates.gender && { gender: updates.gender }),
            ...(updates.bloodGroup && { bloodGroup: updates.bloodGroup }),
            ...(updates.emergencyContact && { emergencyContact: updates.emergencyContact }),
          },
        });
      } else if (role === Role.DOCTOR) {
        await prisma.doctor.update({
          where: { userId },
          data: {
            ...(updates.specialization && { specialization: updates.specialization }),
            ...(updates.clinicAddress && { clinicAddress: updates.clinicAddress }),
          },
        });
      } else if (role === Role.SHOP) {
        await prisma.shop.update({
          where: { userId },
          data: {
            ...(updates.shopName && { shopName: updates.shopName }),
            ...(updates.address && { address: updates.address }),
            ...(updates.timings && { timings: updates.timings }),
          },
        });
      }
    } else {
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (!user) throw new NotFoundError('User not found');
      if (updates.name) user.name = updates.name;
      user.updatedAt = new Date();

      if (role === Role.PATIENT) {
        const patient = inMemoryDb.patients.find((p) => p.userId === userId);
        if (patient) {
          if (updates.address) patient.address = updates.address;
          if (updates.dob) patient.dob = new Date(updates.dob);
          if (updates.gender) patient.gender = updates.gender;
          if (updates.bloodGroup) patient.bloodGroup = updates.bloodGroup;
          if (updates.emergencyContact) patient.emergencyContact = updates.emergencyContact;
          patient.updatedAt = new Date();
        }
      } else if (role === Role.DOCTOR) {
        const doc = inMemoryDb.doctors.find((d) => d.userId === userId);
        if (doc) {
          if (updates.specialization) doc.specialization = updates.specialization;
          if (updates.clinicAddress) doc.clinicAddress = updates.clinicAddress;
          doc.updatedAt = new Date();
        }
      } else if (role === Role.SHOP) {
        const shop = inMemoryDb.shops.find((s) => s.userId === userId);
        if (shop) {
          if (updates.shopName) shop.shopName = updates.shopName;
          if (updates.address) shop.address = updates.address;
          if (updates.timings) shop.timings = updates.timings;
          shop.updatedAt = new Date();
        }
      }
    }

    recordAuditLog({
      userId,
      action: 'USER_PROFILE_UPDATED',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
      metadata: updates,
    });

    return authService.getMe(userId);
  }

  /**
   * Exports machine-readable archive of user account data strictly scoped to owned records
   * Strips password hashes, tokens, internal secrets.
   */
  async exportUserData(userId: string, role: Role, ipAddress?: string, userAgent?: string) {
    const userProfile = await authService.getMe(userId);

    recordAuditLog({
      userId,
      action: 'DATA_EXPORT_REQUESTED',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    let records: any = {};
    if (role === Role.PATIENT && userProfile.patientProfile) {
      const patientId = userProfile.patientProfile.id;
      if (isDbConnected()) {
        const [prescriptions, appointments, reports] = await Promise.all([
          prisma.prescription.findMany({ where: { patientId }, include: { items: true } }),
          prisma.appointment.findMany({ where: { patientId } }),
          prisma.report.findMany({ where: { patientId } }),
        ]);
        records = { prescriptions, appointments, reports };
      } else {
        records = {
          prescriptions: inMemoryDb.prescriptions.filter((p) => p.patientId === patientId),
          appointments: inMemoryDb.appointments.filter((a) => a.patientId === patientId),
          reports: inMemoryDb.reports.filter((r) => r.patientId === patientId),
        };
      }
    } else if (role === Role.DOCTOR && userProfile.doctorProfile) {
      const doctorId = userProfile.doctorProfile.id;
      if (isDbConnected()) {
        const [prescriptionsAuthored, appointmentsManaged] = await Promise.all([
          prisma.prescription.findMany({ where: { doctorId }, include: { items: true } }),
          prisma.appointment.findMany({ where: { doctorId } }),
        ]);
        records = { prescriptionsAuthored, appointmentsManaged };
      } else {
        records = {
          prescriptionsAuthored: inMemoryDb.prescriptions
            .filter((p) => p.doctorId === doctorId)
            .map((p) => ({
              id: p.id,
              diagnosis: p.diagnosis,
              notes: p.notes,
              createdAt: p.createdAt,
              items: inMemoryDb.prescriptionItems.filter((i) => i.prescriptionId === p.id),
            })),
          appointmentsManaged: inMemoryDb.appointments
            .filter((a) => a.doctorId === doctorId)
            .map((a) => ({
              id: a.id,
              dateTime: a.dateTime,
              status: a.status,
              notes: a.notes,
              createdAt: a.createdAt,
            })),
        };
      }
    } else if (role === Role.SHOP && userProfile.shopProfile) {
      const shopId = userProfile.shopProfile.id;
      if (isDbConnected()) {
        const billsIssued = await prisma.bill.findMany({ where: { shopId } });
        records = { billsIssued };
      } else {
        records = {
          billsIssued: inMemoryDb.bills
            .filter((b) => b.shopId === shopId)
            .map((b) => ({
              id: b.id,
              totalAmount: b.total,
              paymentMethod: b.paymentMethod,
              createdAt: b.createdAt,
            })),
        };
      }
    }

    return {
      exportedAt: new Date().toISOString(),
      user: userProfile,
      records,
    };
  }

  /**
   * Deactivates user account upon verified password confirmation (Tier B)
   */
  async deleteAccount(
    userId: string,
    passwordPlain: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    let userHash: string | null = null;
    let userRole: any = null;

    if (isDbConnected()) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundError('User not found');
      userHash = user.passwordHash;
      userRole = user.role;
    } else {
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (!user) throw new NotFoundError('User not found');
      userHash = user.passwordHash;
      userRole = user.role;
    }

    const valid = await comparePassword(passwordPlain, userHash);
    if (!valid) throw new UnauthorizedError('Incorrect password');

    // Block deleting the last admin
    if (userRole === Role.ADMIN) {
      if (isDbConnected()) {
        const activeAdmins = await prisma.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (activeAdmins <= 1) {
          throw new ForbiddenError('Cannot delete or deactivate the sole remaining system administrator account');
        }
      } else {
        const activeAdmins = inMemoryDb.users.filter(
          (u) => u.role === Role.ADMIN && u.isActive
        ).length;
        if (activeAdmins <= 1) {
          throw new ForbiddenError('Cannot delete or deactivate the sole remaining system administrator account');
        }
      }
    }

    const now = new Date();
    if (isDbConnected()) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    } else {
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (user) {
        user.isActive = false;
        user.tokenVersion = (user.tokenVersion || 1) + 1;
        user.tokensInvalidatedBefore = now;
      }
      inMemoryDb.refreshTokens.forEach((t) => {
        if (t.userId === userId && !t.revokedAt) t.revokedAt = now;
      });
      inMemoryDb.persistRefreshTokens();
    }

    recordAuditLog({
      userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
      metadata: { reason: reason || 'User requested account closure' },
    });

    return {
      success: true,
      message: 'Your account has been deactivated and marked for permanent deletion.',
    };
  }
}

export const usersService = new UsersService();


