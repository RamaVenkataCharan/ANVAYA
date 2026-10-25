import { Router } from 'express';
import { consentController } from './consent.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { validateBody } from '../../middleware/validate';
import { grantConsentSchema, revokeConsentSchema } from '@anvaya/shared';
import { Role } from '@anvaya/shared';

const router = Router();

// All consent routes require authentication
router.use(authenticateJwt);

/**
 * POST /consent/grant
 * Grant clinical access to a doctor (Patient only)
 */
router.post(
  '/grant',
  requireRole(Role.PATIENT),
  validateBody(grantConsentSchema),
  (req, res, next) => consentController.grantConsent(req, res, next)
);

/**
 * POST /consent/revoke
 * Revoke clinical access from a doctor (Patient only)
 */
router.post(
  '/revoke',
  requireRole(Role.PATIENT),
  validateBody(revokeConsentSchema),
  (req, res, next) => consentController.revokeConsent(req, res, next)
);

/**
 * GET /consent/my
 * List all consent records granted by the calling patient (includes history)
 */
router.get(
  '/my',
  requireRole(Role.PATIENT),
  (req, res, next) => consentController.getMyConsents(req, res, next)
);

/**
 * GET /consent/patients
 * List patients who have granted active consent to the calling doctor
 */
router.get(
  '/patients',
  requireRole(Role.DOCTOR),
  (req, res, next) => consentController.getPatientsWithConsent(req, res, next)
);

export const consentRoutes = router;
