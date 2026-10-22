import { VerificationStatus } from '@anvaya/shared';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../utils/errors';

export class UsersService {
  /**
   * Returns list of verified pharmacy shops for the patient directory
   */
  async getVerifiedShops(search?: string) {
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
  }

  /**
   * Returns a specific pharmacy shop by ID
   */
  async getShopById(shopId: string) {
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
  }

  /**
   * Returns list of verified doctors
   */
  async getVerifiedDoctors(specialization?: string) {
    const where: any = {
      verificationStatus: VerificationStatus.APPROVED,
    };

    if (specialization) {
      where.specialization = { contains: specialization, mode: 'insensitive' };
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
  }
}

export const usersService = new UsersService();
