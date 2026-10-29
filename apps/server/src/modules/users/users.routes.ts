import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { requireVerified } from '../../middleware/verificationGuard';
import { Role } from '@anvaya/shared';

const router = Router();

// Public directory endpoints
router.get('/shops', (req, res, next) => usersController.getShops(req, res, next));
router.get('/shops/:id', (req, res, next) => usersController.getShopById(req, res, next));
router.get('/doctors', (req, res, next) => usersController.getDoctors(req, res, next));
router.get('/doctors/:id', (req, res, next) => usersController.getDoctorById(req, res, next));

import rateLimit from 'express-rate-limit';

const patientLookupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  keyGenerator: (req) => {
    const user = (req as any).user;
    return user?.userId || req.ip || 'anonymous';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Rate limit exceeded: Too many patient lookup requests. Please try again in 10 minutes.',
    timestamp: new Date().toISOString(),
  },
});

// Authenticated patient lookup (strictly for verified doctors, returns only id, name and age)
router.get(
  '/patients/lookup',
  authenticateJwt,
  requireRole(Role.DOCTOR),
  requireVerified,
  patientLookupLimiter,
  (req, res, next) => usersController.lookupPatient(req, res, next)
);

// Authenticated patient search (for practitioners/billing)
router.get('/patients/search', authenticateJwt, (req, res, next) =>
  usersController.searchPatients(req, res, next)
);

import { validateBody } from '../../middleware/validate';
import { pushTokenSchema, updatePatientProfileSchema, updateDoctorProfileSchema, updateShopProfileSchema, deleteAccountSchema } from '@anvaya/shared';
import { BadRequestError } from '../../utils/errors';
import { z } from 'zod';

const validateProfileUpdateByRole = (req: any, res: any, next: any) => {
  const role = req.user?.role;
  let schema: any;
  if (role === Role.PATIENT) {
    schema = updatePatientProfileSchema;
  } else if (role === Role.DOCTOR) {
    schema = updateDoctorProfileSchema;
  } else if (role === Role.SHOP) {
    schema = updateShopProfileSchema;
  } else {
    schema = z.object({ name: z.string().trim().min(2).optional() }).strict();
  }

  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errorDetails = result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return next(new BadRequestError(`Validation failed: ${errorDetails}`));
  }
  req.body = result.data;
  next();
};

// Register Expo push token (Authenticated)
router.post(
  '/push-token',
  authenticateJwt,
  validateBody(pushTokenSchema),
  (req, res, next) => usersController.savePushToken(req, res, next)
);

router.post(
  '/users/push-token',
  authenticateJwt,
  validateBody(pushTokenSchema),
  (req, res, next) => usersController.savePushToken(req, res, next)
);


router.patch(
  '/profile',
  authenticateJwt,
  validateProfileUpdateByRole,
  (req, res, next) => usersController.updateProfile(req, res, next)
);

router.patch(
  '/users/profile',
  authenticateJwt,
  validateProfileUpdateByRole,
  (req, res, next) => usersController.updateProfile(req, res, next)
);

const dataExportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => (req as any).user?.userId || req.ip || 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Rate limit reached: A data export can only be requested up to 3 times per day.',
    timestamp: new Date().toISOString(),
  },
});

router.post(
  '/users/export-data',
  authenticateJwt,
  dataExportLimiter,
  (req, res, next) => usersController.exportUserData(req, res, next)
);

router.post(
  '/export-data',
  authenticateJwt,
  dataExportLimiter,
  (req, res, next) => usersController.exportUserData(req, res, next)
);

router.post(
  '/users/delete-account',
  authenticateJwt,
  validateBody(deleteAccountSchema),
  (req, res, next) => usersController.deleteAccount(req, res, next)
);

export const usersRoutes = router;
