import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { config } from '../config';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'One or more fields failed validation',
      details: formattedErrors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 2. Custom Application Errors (Operational)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message,
      details: err.details,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 3. Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      const field = target.length > 0 ? target.join(', ') : 'field';
      res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: `An account or record with this ${field} already exists.`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: 'The requested record could not be found.',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  // 4. Fallback: Unexpected Server Error
  console.error('💥 Unhandled Server Exception:', err);

  res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: config.isDev ? err.message : 'An unexpected internal server error occurred',
    stack: config.isDev ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  });
}
