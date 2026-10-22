import { Role, VerificationStatus, RegisterInput, AuthResponse, AuthenticatedUser } from '@anvaya/shared';
import { prisma } from '../../config/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from '../../utils/jwt';
import { ConflictError, UnauthorizedError, BadRequestError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';
import { config } from '../../config';

export class AuthService {
  /**
   * Registers a new user with role-specific profile (Doctor, Shop, Patient, or Admin)
   */
  async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    // 1. Verify uniqueness of email and phone
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { phone: input.phone }],
      },
    });

    if (existingUser) {
      if (existingUser.email === input.email) {
        throw new ConflictError('An account with this email address already exists');
      }
      throw new ConflictError('An account with this phone number already exists');
    }

    // 2. Role-specific validation checks
    if (input.role === Role.DOCTOR) {
      const existingDoc = await prisma.doctor.findUnique({
        where: { registrationNo: input.registrationNo },
      });
      if (existingDoc) {
        throw new ConflictError('Medical registration number is already registered to another doctor account');
      }
    } else if (input.role === Role.SHOP) {
      const existingShop = await prisma.shop.findUnique({
        where: { licenseNo: input.licenseNo },
      });
      if (existingShop) {
        throw new ConflictError('Drug license number is already registered to another pharmacy account');
      }
    } else if (input.role === Role.ADMIN) {
      if (input.adminCode !== config.adminCode) {
        throw new BadRequestError('Invalid administrative bootstrap code');
      }
    }

    // 3. Hash password
    const passwordHash = await hashPassword(input.password);

    // 4. Create User and Role profile inside a database transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: input.role,
        },
      });

      if (input.role === Role.DOCTOR) {
        await tx.doctor.create({
          data: {
            userId: user.id,
            specialization: input.specialization,
            registrationNo: input.registrationNo,
            clinicAddress: input.clinicAddress,
            verificationStatus: VerificationStatus.PENDING,
          },
        });
      } else if (input.role === Role.SHOP) {
        await tx.shop.create({
          data: {
            userId: user.id,
            shopName: input.shopName,
            licenseNo: input.licenseNo,
            address: input.address,
            phone: input.phone,
            timings: input.timings,
            verificationStatus: VerificationStatus.PENDING,
          },
        });
      } else if (input.role === Role.PATIENT) {
        await tx.patient.create({
          data: {
            userId: user.id,
            dob: new Date(input.dob),
            gender: input.gender,
            address: input.address,
            bloodGroup: input.bloodGroup,
            emergencyContact: input.emergencyContact,
          },
        });
      }

      return user;
    });

    // 5. Fetch full user object with profile
    const authenticatedUser = await this.getMe(newUser.id);

    // 6. Issue Access and Refresh Tokens
    const { accessToken, refreshToken } = await this.issueTokens(authenticatedUser);

    // 7. Audit Log
    recordAuditLog({
      userId: newUser.id,
      action: 'AUTH_REGISTER',
      resource: 'USER',
      resourceId: newUser.id,
      ipAddress,
      userAgent,
      metadata: { role: input.role, email: input.email },
    });

    return {
      user: authenticatedUser,
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Authenticates user credentials (email or phone) and issues tokens
   */
  async login(
    identifier: string,
    passwordPlain: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { phone: identifier }],
      },
      include: {
        doctorProfile: true,
        shopProfile: true,
        patientProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await comparePassword(passwordPlain, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const authenticatedUser = this.formatUser(user);
    const { accessToken, refreshToken } = await this.issueTokens(authenticatedUser);

    recordAuditLog({
      userId: user.id,
      action: 'AUTH_LOGIN',
      resource: 'USER',
      resourceId: user.id,
      ipAddress,
      userAgent,
      metadata: { role: user.role, email: user.email },
    });

    return {
      user: authenticatedUser,
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Refreshes access token with Refresh Token rotation
   */
  async refreshTokens(
    refreshTokenRaw: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId } = verifyRefreshToken(refreshTokenRaw);
    const tokenHash = hashToken(refreshTokenRaw);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Revoke old refresh token (Token Rotation Security)
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const user = await this.getMe(userId);
    const newTokens = await this.issueTokens(user);

    recordAuditLog({
      userId,
      action: 'AUTH_TOKEN_REFRESH',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    return newTokens;
  }

  /**
   * Revokes refresh token on logout
   */
  async logout(refreshTokenRaw?: string, userId?: string): Promise<void> {
    if (refreshTokenRaw) {
      const tokenHash = hashToken(refreshTokenRaw);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    }

    if (userId) {
      recordAuditLog({
        userId,
        action: 'AUTH_LOGOUT',
        resource: 'USER',
        resourceId: userId,
      });
    }
  }

  /**
   * Fetches full profile for the authenticated user
   */
  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        doctorProfile: true,
        shopProfile: true,
        patientProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User profile not found');
    }

    return this.formatUser(user);
  }

  private async issueTokens(user: AuthenticatedUser): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      doctorId: user.doctorProfile?.id,
      shopId: user.shopProfile?.id,
      patientId: user.patientProfile?.id,
      verificationStatus:
        user.doctorProfile?.verificationStatus || user.shopProfile?.verificationStatus,
    });

    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store hashed refresh token in database (7-day validity)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private formatUser(user: any): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      doctorProfile: user.doctorProfile
        ? {
            id: user.doctorProfile.id,
            userId: user.doctorProfile.userId,
            specialization: user.doctorProfile.specialization,
            registrationNo: user.doctorProfile.registrationNo,
            clinicAddress: user.doctorProfile.clinicAddress,
            verificationStatus: user.doctorProfile.verificationStatus,
            verifiedAt: user.doctorProfile.verifiedAt?.toISOString() || null,
            rejectionReason: user.doctorProfile.rejectionReason,
          }
        : null,
      shopProfile: user.shopProfile
        ? {
            id: user.shopProfile.id,
            userId: user.shopProfile.userId,
            shopName: user.shopProfile.shopName,
            licenseNo: user.shopProfile.licenseNo,
            address: user.shopProfile.address,
            phone: user.shopProfile.phone,
            timings: user.shopProfile.timings,
            verificationStatus: user.shopProfile.verificationStatus,
            verifiedAt: user.shopProfile.verifiedAt?.toISOString() || null,
            rejectionReason: user.shopProfile.rejectionReason,
          }
        : null,
      patientProfile: user.patientProfile
        ? {
            id: user.patientProfile.id,
            userId: user.patientProfile.userId,
            dob: user.patientProfile.dob.toISOString().split('T')[0],
            gender: user.patientProfile.gender,
            address: user.patientProfile.address,
            bloodGroup: user.patientProfile.bloodGroup,
            emergencyContact: user.patientProfile.emergencyContact,
          }
        : null,
    };
  }
}

export const authService = new AuthService();
