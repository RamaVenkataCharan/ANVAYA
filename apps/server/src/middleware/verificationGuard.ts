import { Request, Response, NextFunction } from 'express';
import { Role, VerificationStatus } from '@anvaya/shared';
import { prisma } from '../config/prisma';
import { ForbiddenError, UnauthorizedError, UnverifiedAccountError } from '../utils/errors';

export async function requireVerified(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User authentication context is missing');
    }

    const { role, userId } = req.user;

    // Patients and Admins do not require clinical credential verification
    if (role === Role.PATIENT || role === Role.ADMIN) {
      return next();
    }

    if (role === Role.DOCTOR) {
      const doctor = await prisma.doctor.findUnique({
        where: { userId },
        select: { verificationStatus: true, rejectionReason: true },
      });

      if (!doctor) {
        throw new ForbiddenError('Doctor profile not found');
      }

      if (doctor.verificationStatus === VerificationStatus.PENDING) {
        throw new UnverifiedAccountError(
          'Your medical practitioner credentials are currently PENDING administrative approval. You cannot write prescriptions or manage clinical consultations until verified.'
        );
      }

      if (doctor.verificationStatus === VerificationStatus.REJECTED) {
        throw new ForbiddenError(
          `Your medical registration was rejected: ${doctor.rejectionReason || 'Invalid or unverifiable medical credentials'}`
        );
      }
    }

    if (role === Role.SHOP) {
      const shop = await prisma.shop.findUnique({
        where: { userId },
        select: { verificationStatus: true, rejectionReason: true },
      });

      if (!shop) {
        throw new ForbiddenError('Pharmacy shop profile not found');
      }

      if (shop.verificationStatus === VerificationStatus.PENDING) {
        throw new UnverifiedAccountError(
          'Your pharmacy drug license is currently PENDING administrative verification. You cannot dispense prescriptions or issue bills until approved.'
        );
      }

      if (shop.verificationStatus === VerificationStatus.REJECTED) {
        throw new ForbiddenError(
          `Your pharmacy registration was rejected: ${shop.rejectionReason || 'Invalid or unverified drug license'}`
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
