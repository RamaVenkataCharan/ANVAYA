import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { JwtPayload } from '@anvaya/shared';
import { prisma, isDbConnected } from '../config/prisma';
import { inMemoryDb } from '../db/inMemoryDb';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}

export async function authenticateJwt(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization header missing or invalid format (Bearer token expected)');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Token not found in authorization header');
    }

    const payload = verifyAccessToken(token);

    // Enforce account status check on every request (FLAG-02 / FLAG-05)
    if (isDbConnected()) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isActive: true },
      });
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User account is suspended or inactive');
      }
    } else {
      const user = inMemoryDb.users.find((u) => u.id === payload.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User account is suspended or inactive');
      }
    }

    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}
