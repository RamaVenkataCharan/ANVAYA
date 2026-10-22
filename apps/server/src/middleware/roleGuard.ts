import { Request, Response, NextFunction } from 'express';
import { Role } from '@anvaya/shared';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User authentication context is missing');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access forbidden: Requires one of [${allowedRoles.join(', ')}], but current role is ${req.user.role}`
      );
    }

    next();
  };
}
