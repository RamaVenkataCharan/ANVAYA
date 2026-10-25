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

// Authenticated patient lookup (for verified doctors and shops, returns only id, name and age)
router.get(
  '/patients/lookup',
  authenticateJwt,
  requireRole(Role.DOCTOR, Role.SHOP),
  requireVerified,
  (req, res, next) => usersController.lookupPatient(req, res, next)
);

// Authenticated patient search (for practitioners/billing)
router.get('/patients/search', authenticateJwt, (req, res, next) =>
  usersController.searchPatients(req, res, next)
);

import { validateBody } from '../../middleware/validate';
import { pushTokenSchema } from '@anvaya/shared';

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

export const usersRoutes = router;
