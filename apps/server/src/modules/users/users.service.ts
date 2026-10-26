import { VerificationStatus, Role } from '@anvaya/shared';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb } from '../../db/inMemoryDb';
import { NotFoundError } from '../../utils/errors';

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
}

export const usersService = new UsersService();


