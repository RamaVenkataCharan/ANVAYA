import { Role, VerificationStatus, RegisterInput, AuthResponse, AuthenticatedUser } from '@anvaya/shared';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb } from '../../db/inMemoryDb';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from '../../utils/jwt';
import { ConflictError, UnauthorizedError, BadRequestError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';
import { config } from '../../config';
import { defaultOtpProvider } from '../../services/otp/otpProvider';
import crypto from 'crypto';

export class AuthService {
  /**
   * Registers a new user with role-specific profile (Doctor, Shop, Patient, or Admin)
   */
  async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const passwordHash = await hashPassword(input.password);

    if (isDbConnected()) {
      // 1. Verify uniqueness of email and phone in Postgres
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
        },
      });

      if (existingUser) {
        if (existingUser.email.toLowerCase() === input.email.toLowerCase()) {
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

      // 3. Create User and Role profile inside a database transaction
      const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: input.name,
            email: input.email.toLowerCase(),
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

      const authenticatedUser = await this.getMe(newUser.id);
      const { accessToken, refreshToken } = await this.issueTokens(authenticatedUser);

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
    } else {
      // In-Memory Dev fallback
      const existingUser = inMemoryDb.users.find(
        (u) => u.email.toLowerCase() === input.email.toLowerCase() || u.phone === input.phone
      );

      if (existingUser) {
        if (existingUser.email.toLowerCase() === input.email.toLowerCase()) {
          throw new ConflictError('An account with this email address already exists');
        }
        throw new ConflictError('An account with this phone number already exists');
      }

      if (input.role === Role.DOCTOR) {
        const existingDoc = inMemoryDb.doctors.find((d) => d.registrationNo === input.registrationNo);
        if (existingDoc) {
          throw new ConflictError('Medical registration number is already registered to another doctor account');
        }
      } else if (input.role === Role.SHOP) {
        const existingShop = inMemoryDb.shops.find((s) => s.licenseNo === input.licenseNo);
        if (existingShop) {
          throw new ConflictError('Drug license number is already registered to another pharmacy account');
        }
      } else if (input.role === Role.ADMIN) {
        if (input.adminCode !== config.adminCode) {
          throw new BadRequestError('Invalid administrative bootstrap code');
        }
      }

      const userId = crypto.randomUUID();
      const user = {
        id: userId,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        passwordHash,
        role: input.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryDb.users.push(user);

      if (input.role === Role.DOCTOR) {
        inMemoryDb.doctors.push({
          id: crypto.randomUUID(),
          userId,
          specialization: input.specialization,
          registrationNo: input.registrationNo,
          clinicAddress: input.clinicAddress,
          verificationStatus: VerificationStatus.PENDING,
          verifiedAt: null,
          rejectionReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (input.role === Role.SHOP) {
        inMemoryDb.shops.push({
          id: crypto.randomUUID(),
          userId,
          shopName: input.shopName,
          licenseNo: input.licenseNo,
          address: input.address,
          phone: input.phone,
          timings: input.timings,
          verificationStatus: VerificationStatus.PENDING,
          verifiedAt: null,
          rejectionReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (input.role === Role.PATIENT) {
        inMemoryDb.patients.push({
          id: crypto.randomUUID(),
          userId,
          dob: new Date(input.dob),
          gender: input.gender,
          address: input.address,
          bloodGroup: input.bloodGroup || null,
          emergencyContact: input.emergencyContact || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const authenticatedUser = await this.getMe(userId);
      const { accessToken, refreshToken } = await this.issueTokens(authenticatedUser);

      recordAuditLog({
        userId,
        action: 'AUTH_REGISTER',
        resource: 'USER',
        resourceId: userId,
        ipAddress,
        userAgent,
        metadata: { role: input.role, email: input.email },
      });

      return {
        user: authenticatedUser,
        tokens: { accessToken, refreshToken },
      };
    }
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
    if (isDbConnected()) {
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
    } else {
      const idLower = identifier.toLowerCase();
      const user = inMemoryDb.users.find((u) => u.email.toLowerCase() === idLower || u.phone === identifier);

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

      const authenticatedUser = await this.getMe(user.id);
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

    if (isDbConnected()) {
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { hash: tokenHash },
      });

      if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true },
      });

      if (!userRecord || !userRecord.isActive) {
        throw new UnauthorizedError('Your account has been deactivated. Please contact support.');
      }

      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
    } else {
      const tokenRecord = inMemoryDb.refreshTokens.find((t) => t.hash === tokenHash);
      if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      const userRecord = inMemoryDb.users.find((u) => u.id === userId);
      if (!userRecord || !userRecord.isActive) {
        throw new UnauthorizedError('Your account has been deactivated. Please contact support.');
      }

      tokenRecord.revokedAt = new Date();
      inMemoryDb.persistRefreshTokens();
    }

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
      if (isDbConnected()) {
        await prisma.refreshToken.updateMany({
          where: { hash: tokenHash, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } else {
        inMemoryDb.refreshTokens
          .filter((t) => t.hash === tokenHash && !t.revokedAt)
          .forEach((t) => {
            t.revokedAt = new Date();
          });
        inMemoryDb.persistRefreshTokens();
      }
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
    if (isDbConnected()) {
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
    } else {
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (!user) {
        throw new UnauthorizedError('User profile not found');
      }

      const doctorProfile = inMemoryDb.doctors.find((d) => d.userId === userId) || null;
      const shopProfile = inMemoryDb.shops.find((s) => s.userId === userId) || null;
      const patientProfile = inMemoryDb.patients.find((p) => p.userId === userId) || null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        doctorProfile: doctorProfile
          ? {
              id: doctorProfile.id,
              userId: doctorProfile.userId,
              specialization: doctorProfile.specialization,
              registrationNo: doctorProfile.registrationNo,
              clinicAddress: doctorProfile.clinicAddress,
              verificationStatus: doctorProfile.verificationStatus,
              verifiedAt: doctorProfile.verifiedAt?.toISOString() || null,
              rejectionReason: doctorProfile.rejectionReason,
            }
          : null,
        shopProfile: shopProfile
          ? {
              id: shopProfile.id,
              userId: shopProfile.userId,
              shopName: shopProfile.shopName,
              licenseNo: shopProfile.licenseNo,
              address: shopProfile.address,
              phone: shopProfile.phone,
              timings: shopProfile.timings,
              verificationStatus: shopProfile.verificationStatus,
              verifiedAt: shopProfile.verifiedAt?.toISOString() || null,
              rejectionReason: shopProfile.rejectionReason,
            }
          : null,
        patientProfile: patientProfile
          ? {
              id: patientProfile.id,
              userId: patientProfile.userId,
              dob: patientProfile.dob.toISOString().split('T')[0],
              gender: patientProfile.gender,
              address: patientProfile.address,
              bloodGroup: patientProfile.bloodGroup,
              emergencyContact: patientProfile.emergencyContact,
            }
          : null,
      };
    }
  }

  private async issueTokens(user: AuthenticatedUser): Promise<{ accessToken: string; refreshToken: string }> {
    let tokenVersion: number | undefined;
    if (!isDbConnected()) {
      const u = inMemoryDb.users.find((x) => x.id === user.id);
      tokenVersion = u?.tokenVersion || 1;
    }

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
      tokenVersion,
    });

    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store hashed refresh token in database (7-day validity)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const tokenHash = hashToken(refreshToken);

    if (isDbConnected()) {
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          hash: tokenHash,
          expiresAt,
        },
      });
    } else {
      inMemoryDb.refreshTokens.push({
        id: crypto.randomUUID(),
        userId: user.id,
        hash: tokenHash,
        expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      });
      inMemoryDb.persistRefreshTokens();
    }

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

  private otpStore = new Map<string, { hashedCode: string; expiresAt: Date; attempts: number }>();

  private hashOtp(code: string): string {
    return crypto.createHash('sha256').update(code.trim()).digest('hex');
  }

  /**
   * Generates and logs OTP for password recovery (Tier B)
   * Hashes OTP at rest, 10-minute expiry, rate-limited, constant response
   */
  async forgotPasswordRequest(identifier: string): Promise<{ success: boolean; message: string }> {
    const clean = identifier.trim().toLowerCase();
    let userFound = false;

    if (isDbConnected()) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: clean }, { phone: identifier.trim() }],
        },
      });
      if (user) userFound = true;
    } else {
      const user = inMemoryDb.users.find(
        (u) => u.email.toLowerCase() === clean || u.phone === identifier.trim()
      );
      if (user) userFound = true;
    }

    if (userFound) {
      const code = process.env.NODE_ENV === 'test' ? '123456' : crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      this.otpStore.set(clean, { hashedCode: this.hashOtp(code), expiresAt, attempts: 0 });
      await defaultOtpProvider.sendOtp(identifier.trim(), code, 'PASSWORD_RESET');
    }

    return {
      success: true,
      message: 'If an account exists with this identifier, a password reset code has been sent',
    };
  }

  /**
   * Verifies OTP (single use, max 5 wrong attempts) and resets user password (Tier B)
   * Revokes all refresh tokens and invalidates existing access tokens
   */
  async forgotPasswordVerify(
    identifier: string,
    otp: string,
    newPasswordPlain: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const clean = identifier.trim().toLowerCase();
    const stored = this.otpStore.get(clean);

    if (!stored || Date.now() > stored.expiresAt.getTime()) {
      if (stored) this.otpStore.delete(clean);
      throw new BadRequestError('Invalid or expired verification code');
    }

    if (stored.attempts >= 5) {
      this.otpStore.delete(clean);
      throw new BadRequestError('Maximum verification attempts exceeded. Please request a new code.');
    }

    const inputHash = this.hashOtp(otp);
    if (stored.hashedCode !== inputHash) {
      stored.attempts += 1;
      if (stored.attempts >= 5) {
        this.otpStore.delete(clean);
        throw new BadRequestError('Maximum verification attempts exceeded. Please request a new code.');
      }
      throw new BadRequestError('Invalid verification code');
    }

    // Single use: delete immediately
    this.otpStore.delete(clean);

    const passwordHash = await hashPassword(newPasswordPlain);
    let userId: string | null = null;
    const now = new Date();

    if (isDbConnected()) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: clean }, { phone: identifier.trim() }],
        },
      });
      if (!user) throw new BadRequestError('User not found');
      userId = user.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      await prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });
    } else {
      const user = inMemoryDb.users.find(
        (u) => u.email.toLowerCase() === clean || u.phone === identifier.trim()
      );
      if (!user) throw new BadRequestError('User not found');
      userId = user.id;

      user.passwordHash = passwordHash;
      user.tokenVersion = (user.tokenVersion || 1) + 1;
      user.tokensInvalidatedBefore = now;
      user.updatedAt = now;
      inMemoryDb.refreshTokens.forEach((t) => {
        if (t.userId === user.id && !t.revokedAt) {
          t.revokedAt = now;
        }
      });
      inMemoryDb.persistRefreshTokens();
    }

    if (userId) {
      recordAuditLog({
        userId,
        action: 'AUTH_PASSWORD_RESET',
        resource: 'USER',
        resourceId: userId,
        ipAddress,
        userAgent,
      });
    }

    return {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Changes authenticated user password after verifying current password (Tier B)
   */
  async changePassword(
    userId: string,
    currentPasswordPlain: string,
    newPasswordPlain: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    let currentHash: string | null = null;

    if (isDbConnected()) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedError('User not found');
      currentHash = user.passwordHash;
    } else {
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (!user) throw new UnauthorizedError('User not found');
      currentHash = user.passwordHash;
    }

    const isValid = await comparePassword(currentPasswordPlain, currentHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newHash = await hashPassword(newPasswordPlain);

    const now = new Date();
    if (isDbConnected()) {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    } else {
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (user) {
        user.passwordHash = newHash;
        user.tokenVersion = (user.tokenVersion || 1) + 1;
        user.tokensInvalidatedBefore = now;
        user.updatedAt = now;
        inMemoryDb.refreshTokens.forEach((t) => {
          if (t.userId === userId && !t.revokedAt) {
            t.revokedAt = now;
          }
        });
        inMemoryDb.persistRefreshTokens();
      }
    }

    recordAuditLog({
      userId,
      action: 'AUTH_PASSWORD_CHANGED',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Revokes all active refresh tokens for the user across all devices (Tier B)
   */
  async logoutAll(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const now = new Date();
    if (isDbConnected()) {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    } else {
      inMemoryDb.refreshTokens.forEach((t) => {
        if (t.userId === userId && !t.revokedAt) {
          t.revokedAt = now;
        }
      });
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (user) {
        user.tokenVersion = (user.tokenVersion || 1) + 1;
        user.tokensInvalidatedBefore = now;
      }
      inMemoryDb.persistRefreshTokens();
    }

    recordAuditLog({
      userId,
      action: 'AUTH_LOGOUT_ALL',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Logged out of all devices successfully',
    };
  }

  /**
   * Resubmits corrected verification credentials for a rejected provider (Tier B)
   */
  async resubmitVerification(
    userId: string,
    updates: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthenticatedUser> {
    if (isDbConnected()) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { doctorProfile: true, shopProfile: true },
      });
      if (!user) throw new BadRequestError('User not found');

      if (user.role === Role.DOCTOR && user.doctorProfile) {
        if (user.doctorProfile.verificationStatus !== VerificationStatus.REJECTED) {
          throw new BadRequestError('Only rejected provider accounts can resubmit details');
        }
        await prisma.doctor.update({
          where: { id: user.doctorProfile.id },
          data: {
            specialization: updates.specialization || user.doctorProfile.specialization,
            registrationNo: updates.registrationNo || user.doctorProfile.registrationNo,
            clinicAddress: updates.clinicAddress || user.doctorProfile.clinicAddress,
            verificationStatus: VerificationStatus.PENDING,
            rejectionReason: null,
            verifiedAt: null,
          },
        });
      } else if (user.role === Role.SHOP && user.shopProfile) {
        if (user.shopProfile.verificationStatus !== VerificationStatus.REJECTED) {
          throw new BadRequestError('Only rejected pharmacy accounts can resubmit details');
        }
        await prisma.shop.update({
          where: { id: user.shopProfile.id },
          data: {
            shopName: updates.shopName || user.shopProfile.shopName,
            licenseNo: updates.licenseNo || user.shopProfile.licenseNo,
            address: updates.address || user.shopProfile.address,
            timings: updates.timings || user.shopProfile.timings,
            verificationStatus: VerificationStatus.PENDING,
            rejectionReason: null,
            verifiedAt: null,
          },
        });
      } else {
        throw new BadRequestError('Only doctor or pharmacy accounts can resubmit credentials');
      }
    } else {
      const user = inMemoryDb.users.find((u) => u.id === userId);
      if (!user) throw new BadRequestError('User not found');

      if (user.role === Role.DOCTOR) {
        const doc = inMemoryDb.doctors.find((d) => d.userId === userId);
        if (!doc || doc.verificationStatus !== VerificationStatus.REJECTED) {
          throw new BadRequestError('Only rejected provider accounts can resubmit details');
        }
        if (updates.specialization) doc.specialization = updates.specialization;
        if (updates.registrationNo) doc.registrationNo = updates.registrationNo;
        if (updates.clinicAddress) doc.clinicAddress = updates.clinicAddress;
        doc.verificationStatus = VerificationStatus.PENDING;
        doc.rejectionReason = null;
        doc.verifiedAt = null;
        doc.updatedAt = new Date();
      } else if (user.role === Role.SHOP) {
        const shop = inMemoryDb.shops.find((s) => s.userId === userId);
        if (!shop || shop.verificationStatus !== VerificationStatus.REJECTED) {
          throw new BadRequestError('Only rejected pharmacy accounts can resubmit details');
        }
        if (updates.shopName) shop.shopName = updates.shopName;
        if (updates.licenseNo) shop.licenseNo = updates.licenseNo;
        if (updates.address) shop.address = updates.address;
        if (updates.timings) shop.timings = updates.timings;
        shop.verificationStatus = VerificationStatus.PENDING;
        shop.rejectionReason = null;
        shop.verifiedAt = null;
        shop.updatedAt = new Date();
      } else {
        throw new BadRequestError('Only doctor or pharmacy accounts can resubmit credentials');
      }
    }

    recordAuditLog({
      userId,
      action: 'VERIFICATION_RESUBMITTED',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
      metadata: updates,
    });

    return this.getMe(userId);
  }
}

export const authService = new AuthService();
